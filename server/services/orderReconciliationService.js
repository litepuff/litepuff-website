import { appendRow, getRows, getRowsReadOnly } from './googleSheets.js';
import { fetchRazorpayOrderPayments, fetchRazorpayPayment } from './paymentGatewayService.js';
import { materializePaidOrder, verifyCheckoutIntent } from './orderService.js';
import { isValidCapturedPayment } from './meta/PurchasePolicy.js';
import { safelyQueuePurchase } from './meta/PurchaseQueueService.js';
import { createShipment, preferredShippingProvider } from './shippingService.js';
import { logger } from '../utils/logger.js';

const clean = (value) => String(value ?? '').trim();
const parseRemarks = (value) => { try { return JSON.parse(value || '{}'); } catch { return {}; } };
const locks = new Map();
const withLock = (key, task) => {
  if (locks.has(key)) return locks.get(key);
  const operation = Promise.resolve().then(task).finally(() => locks.delete(key));
  locks.set(key, operation);
  return operation;
};

function addressForShipping(snapshot) {
  return {
    name: snapshot.address.fullName,
    phone: snapshot.address.phone,
    addressLine: [snapshot.address.addressLine1, snapshot.address.addressLine2, snapshot.address.landmark].filter(Boolean).join(', '),
    city: snapshot.address.city,
    state: snapshot.address.state,
    pincode: snapshot.address.pincode,
  };
}

function statusReport({ payment, gatewayPayment, order, items, shipment, purchase, snapshot }) {
  const expectedItems = snapshot?.items?.length || 0;
  const completeItems = Boolean(order && expectedItems && items.length >= expectedItems);
  const action = [];
  if (!payment) action.push('Cannot restore without the persisted checkout snapshot');
  else if (!order) action.push('Create missing ORDER');
  if (payment && !completeItems) action.push('Create missing ORDER_ITEMS', 'Process inventory for newly created items once');
  if (payment && !purchase) action.push('Queue Purchase event once');
  const shipmentRetryable = !shipment || ['failed', 'retry pending'].includes(clean(shipment.ShippingStatus).toLowerCase());
  if (payment && shipmentRetryable) action.push('Create/reconcile shipment');
  return {
    razorpayPaymentId: gatewayPayment?.id || payment?.RazorpayPaymentID || '',
    razorpayOrderId: gatewayPayment?.order_id || payment?.RazorpayOrderID || '',
    paymentId: payment?.PaymentID || '',
    gatewayStatus: gatewayPayment?.status || 'unknown',
    payment: payment ? 'FOUND' : 'MISSING',
    order: order ? 'FOUND' : 'MISSING',
    orderItems: completeItems ? 'FOUND' : 'MISSING_OR_INCOMPLETE',
    itemCount: items.length,
    expectedItemCount: expectedItems,
    inventory: completeItems ? 'PROCESSED' : 'NOT_FULLY_PROCESSED',
    purchaseEvent: purchase ? purchase.Status || 'FOUND' : 'MISSING',
    shipment: shipment ? shipment.ShippingStatus || 'FOUND' : 'MISSING',
    recoveryRequired: action.length > 0,
    action,
  };
}

export class OrderReconciliationService {
  constructor({
    sheets = { appendRow, getRows, getRowsReadOnly },
    fetchPayment = fetchRazorpayPayment,
    fetchOrderPayments = fetchRazorpayOrderPayments,
    materialize = materializePaidOrder,
    verifyIntent = (token) => verifyCheckoutIntent(token, { allowExpired: true }),
    queuePurchase = safelyQueuePurchase,
    ship = createShipment,
    shippingProvider = preferredShippingProvider,
    log = logger,
  } = {}) {
    Object.assign(this, { sheets, fetchPayment, fetchOrderPayments, materialize, verifyIntent, queuePurchase, ship, shippingProvider, log });
  }

  async records(readOnly = false) {
    const read = readOnly && this.sheets.getRowsReadOnly ? this.sheets.getRowsReadOnly : this.sheets.getRows;
    const [payments, orders, orderItems, shipments, notifications] = await Promise.all([
      read('PAYMENTS'), read('ORDERS'), read('ORDER_ITEMS'), read('SHIPMENTS'), read('NOTIFICATIONS'),
    ]);
    return { payments, orders, orderItems, shipments, notifications };
  }

  async gatewayPayment(payment, requestedPaymentId = '') {
    const directId = clean(requestedPaymentId).startsWith('pay_') ? clean(requestedPaymentId) : clean(payment?.RazorpayPaymentID);
    if (directId) return this.fetchPayment(directId);
    if (!payment?.RazorpayOrderID) return null;
    const response = await this.fetchOrderPayments(payment.RazorpayOrderID);
    const rows = Array.isArray(response) ? response : response?.items || [];
    return rows.find((row) => clean(row.status).toLowerCase() === 'captured') || rows[0] || null;
  }

  async reconcileOne({ payment, gatewayPayment, dryRun = false, records }) {
    return withLock(gatewayPayment?.id || payment?.PaymentID || 'missing', async () => {
      if (!payment) return { ...statusReport({ gatewayPayment, items: [] }), dryRun, applied: false };
      const notes = parseRemarks(payment.Remarks);
      if (!notes.checkoutToken) throw Object.assign(new Error('Persisted checkout snapshot is missing.'), { code: 'CHECKOUT_SNAPSHOT_MISSING' });
      const snapshot = this.verifyIntent(notes.checkoutToken);
      const resolvedGateway = gatewayPayment || await this.gatewayPayment(payment);
      if (!resolvedGateway) throw Object.assign(new Error('No Razorpay payment was found for this order.'), { code: 'RAZORPAY_PAYMENT_NOT_FOUND' });
      if (!isValidCapturedPayment({ payment, snapshot, gatewayPayment: resolvedGateway })) {
        throw Object.assign(new Error('Razorpay payment is not a captured INR payment matching the authoritative checkout amount and order.'), { code: 'RAZORPAY_PAYMENT_INVALID' });
      }

      let current = records || await this.records();
      let order = current.orders.find((row) => row.OrderID === payment.OrderID || row.OrderID === `order-${payment.PaymentID}`);
      let items = order ? current.orderItems.filter((row) => row.OrderID === order.OrderID) : [];
      let shipment = order ? current.shipments.find((row) => row.OrderID === order.OrderID) : null;
      let purchase = order ? current.notifications.find((row) => row.NotificationID === `meta-purchase-${order.OrderID}`) : null;
      const before = statusReport({ payment, gatewayPayment: resolvedGateway, order, items, shipment, purchase, snapshot });
      if (dryRun || !before.recoveryRequired) return { ...before, dryRun, applied: false };

      order = await this.materialize({
        payment,
        snapshot,
        razorpayPaymentId: resolvedGateway.id,
        razorpaySignature: payment.RazorpaySignature || '',
        paymentMethod: resolvedGateway.method || payment.PaymentMethod || 'razorpay',
      });
      if (!purchase) await this.queuePurchase(order.OrderID, notes.metaAttribution || {}, { correlationId: `order-reconcile-${payment.PaymentID}`, orderId: order.OrderID, paymentId: payment.PaymentID });
      current = await this.records();
      shipment = current.shipments.find((row) => row.OrderID === order.OrderID);
      if (!shipment || ['failed', 'retry pending'].includes(clean(shipment.ShippingStatus).toLowerCase())) {
        try {
          await this.ship({ ...order, shippingAddress: addressForShipping(snapshot), items: snapshot.items }, this.shippingProvider(), { correlationId: `order-reconcile-${payment.PaymentID}`, recovery: true, orderId: order.OrderID, paymentId: payment.PaymentID });
        } catch (error) {
          this.log.warn('order.reconciliation.shipment_pending', { orderId: order.OrderID, paymentId: payment.PaymentID, code: error.code || 'SHIPMENT_RETRY_PENDING' });
        }
      }
      current = await this.records();
      const savedPayment = current.payments.find((row) => row.PaymentID === payment.PaymentID) || payment;
      order = current.orders.find((row) => row.OrderID === order.OrderID);
      items = current.orderItems.filter((row) => row.OrderID === order.OrderID);
      shipment = current.shipments.find((row) => row.OrderID === order.OrderID);
      purchase = current.notifications.find((row) => row.NotificationID === `meta-purchase-${order.OrderID}`);
      return { ...statusReport({ payment: savedPayment, gatewayPayment: resolvedGateway, order, items, shipment, purchase, snapshot }), dryRun: false, applied: true };
    });
  }

  async run({ paymentId = '', razorpayOrderId = '', dryRun = false } = {}) {
    const records = await this.records(dryRun);
    let candidates = records.payments.filter((row) => clean(row.Gateway).toLowerCase() === 'razorpay');
    if (paymentId) candidates = candidates.filter((row) => row.PaymentID === paymentId || row.RazorpayPaymentID === paymentId || row.TransactionReference === paymentId);
    if (razorpayOrderId) candidates = candidates.filter((row) => row.RazorpayOrderID === razorpayOrderId);
    if (paymentId?.startsWith('pay_') && !candidates.length) {
      const gatewayPayment = await this.fetchPayment(paymentId);
      const payment = records.payments.find((row) => row.RazorpayOrderID === gatewayPayment.order_id);
      return { dryRun, results: [await this.reconcileOne({ payment, gatewayPayment, dryRun, records })] };
    }
    if ((paymentId || razorpayOrderId) && !candidates.length) throw Object.assign(new Error('No matching persisted LitePuff payment was found.'), { code: 'PAYMENT_RECORD_NOT_FOUND' });
    if (!paymentId && !razorpayOrderId) {
      candidates = candidates.filter((payment) => {
        const order = records.orders.find((row) => row.OrderID === payment.OrderID || row.OrderID === `order-${payment.PaymentID}`);
        const itemCount = order ? records.orderItems.filter((row) => row.OrderID === order.OrderID).length : 0;
        const shipment = records.shipments.find((row) => row.OrderID === order?.OrderID);
        return payment.Status !== 'Paid' || !order || !itemCount || !shipment || ['failed', 'retry pending'].includes(clean(shipment.ShippingStatus).toLowerCase());
      });
    }
    const results = [];
    for (const payment of candidates) {
      try { results.push(await this.reconcileOne({ payment, dryRun, records })); }
      catch (error) { results.push({ paymentId: payment.PaymentID, razorpayPaymentId: payment.RazorpayPaymentID, razorpayOrderId: payment.RazorpayOrderID, error: error.message, code: error.code || 'RECONCILIATION_FAILED', applied: false }); }
    }
    return { dryRun, results };
  }
}

export const orderReconciliationService = new OrderReconciliationService();
