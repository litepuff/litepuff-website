import test from 'node:test';
import assert from 'node:assert/strict';
import { OrderReconciliationService } from '../services/orderReconciliationService.js';

const snapshot = {
  type: 'checkout_intent', paymentId: 'payment-1', customerId: 'customer-1', razorpayOrderId: 'order_rzp_1',
  currency: 'INR', grandTotal: 240.65, subtotal: 249, productDiscount: 37.35, couponDiscount: 0,
  shipping: 29, discount: 37.35, tax: 0, couponCode: '', paymentMethod: 'online',
  address: { fullName: 'Test Customer', phone: '9876543210', addressLine1: '1 Test Road', addressLine2: '', landmark: '', city: 'Patna', state: 'Bihar', pincode: '800001', country: 'India' },
  items: [{ productId: 'product-1', productName: 'Makhana', metaCatalogId: 'catalog-1', type: 'product', comboId: '', comboType: '', comboName: '', comboPrice: 0, freeDelivery: false, price: 211.65, quantity: 1, total: 211.65 }],
};
const gateway = (overrides = {}) => ({ id: 'pay_1', order_id: 'order_rzp_1', amount: 24065, currency: 'INR', status: 'captured', method: 'upi', ...overrides });
const payment = (overrides = {}) => ({ _row: 2, PaymentID: 'payment-1', OrderID: '', CustomerID: 'customer-1', RazorpayOrderID: 'order_rzp_1', RazorpayPaymentID: 'pay_1', RazorpaySignature: '', PaymentMethod: '', Amount: 240.65, Currency: 'INR', Status: 'Pending', PaidAt: '', TransactionReference: '', Gateway: 'Razorpay', Remarks: JSON.stringify({ checkoutToken: 'signed', metaAttribution: {} }), ...overrides });
const order = { _row: 2, OrderID: 'order-payment-1', OrderNumber: 'LP1', CustomerID: 'customer-1', AddressID: 'address-payment-1', GrandTotal: 240.65, PaymentMethod: 'upi', PaymentStatus: 'Paid', OrderStatus: 'Confirmed' };
const item = { _row: 2, OrderItemID: 'item-payment-1-1', OrderID: order.OrderID, ProductID: 'product-1', Quantity: 1 };

function fixture({ payments = [payment()], orders = [], items = [], shipments = [], notifications = [], gatewayPayment = gateway(), materializeFailure = null } = {}) {
  const state = { PAYMENTS: structuredClone(payments), ORDERS: structuredClone(orders), ORDER_ITEMS: structuredClone(items), SHIPMENTS: structuredClone(shipments), NOTIFICATIONS: structuredClone(notifications) };
  const calls = { materialize: 0, inventory: 0, purchase: 0, ship: 0 };
  const sheets = { getRows: async (name) => state[name].map((row) => ({ ...row })), appendRow: async (name, row) => state[name].push({ ...row, _row: state[name].length + 2 }) };
  const service = new OrderReconciliationService({
    sheets,
    fetchPayment: async () => gatewayPayment,
    fetchOrderPayments: async () => ({ items: [gatewayPayment] }),
    verifyIntent: () => structuredClone(snapshot),
    materialize: async ({ payment: input, razorpayPaymentId, paymentMethod }) => {
      calls.materialize += 1;
      if (materializeFailure) throw materializeFailure;
      let savedOrder = state.ORDERS.find((row) => row.OrderID === order.OrderID);
      if (!savedOrder) { savedOrder = { ...order }; state.ORDERS.push(savedOrder); }
      if (!state.ORDER_ITEMS.some((row) => row.OrderItemID === item.OrderItemID)) { state.ORDER_ITEMS.push({ ...item }); calls.inventory += 1; }
      const savedPayment = state.PAYMENTS.find((row) => row.PaymentID === input.PaymentID);
      Object.assign(savedPayment, { OrderID: order.OrderID, RazorpayPaymentID: razorpayPaymentId, PaymentMethod: paymentMethod, Status: 'Paid' });
      return { ...savedOrder };
    },
    queuePurchase: async (orderId) => { calls.purchase += 1; if (!state.NOTIFICATIONS.some((row) => row.NotificationID === `meta-purchase-${orderId}`)) state.NOTIFICATIONS.push({ NotificationID: `meta-purchase-${orderId}`, OrderID: orderId, Status: 'sent' }); },
    ship: async (savedOrder) => { calls.ship += 1; if (!state.SHIPMENTS.some((row) => row.OrderID === savedOrder.OrderID)) state.SHIPMENTS.push({ ShipmentID: `shipment-${savedOrder.OrderID}`, OrderID: savedOrder.OrderID, ShippingStatus: 'Created' }); },
    shippingProvider: () => 'shiprocket', log: { warn() {} },
  });
  return { service, state, calls };
}

test('captured payment restores missing order, items, inventory marker, Purchase and shipment', async () => {
  const f = fixture(); const report = await f.service.run({ paymentId: 'pay_1' });
  assert.equal(report.results[0].applied, true); assert.equal(f.state.ORDERS.length, 1); assert.equal(f.state.ORDER_ITEMS.length, 1);
  assert.deepEqual(f.calls, { materialize: 1, inventory: 1, purchase: 1, ship: 1 });
});

test('existing payment with missing order is repaired without another payment', async () => {
  const f = fixture(); await f.service.run({ paymentId: 'payment-1' }); assert.equal(f.state.PAYMENTS.length, 1); assert.equal(f.state.ORDERS.length, 1);
});

test('fully existing order is a no-op', async () => {
  const f = fixture({ payments: [payment({ OrderID: order.OrderID, Status: 'Paid' })], orders: [order], items: [item], shipments: [{ ShipmentID: 'shipment-1', OrderID: order.OrderID }], notifications: [{ NotificationID: `meta-purchase-${order.OrderID}`, OrderID: order.OrderID, Status: 'sent' }] });
  const report = await f.service.run({ paymentId: 'pay_1' }); assert.equal(report.results[0].applied, false); assert.equal(f.calls.materialize, 0);
});

test('missing order items restore only items and inventory once', async () => {
  const f = fixture({ payments: [payment({ OrderID: order.OrderID, Status: 'Paid' })], orders: [order] }); await f.service.run({ paymentId: 'pay_1' });
  assert.equal(f.state.ORDERS.length, 1); assert.equal(f.calls.inventory, 1);
});

test('missing shipment invokes existing shipment flow', async () => {
  const f = fixture({ payments: [payment({ OrderID: order.OrderID, Status: 'Paid' })], orders: [order], items: [item], notifications: [{ NotificationID: `meta-purchase-${order.OrderID}`, OrderID: order.OrderID, Status: 'sent' }] });
  await f.service.run({ paymentId: 'pay_1' }); assert.equal(f.calls.ship, 1); assert.equal(f.state.SHIPMENTS.length, 1);
});

test('reconciliation run twice does not duplicate records or inventory', async () => {
  const f = fixture(); await f.service.run({ paymentId: 'pay_1' }); await f.service.run({ paymentId: 'pay_1' });
  assert.equal(f.state.PAYMENTS.length, 1); assert.equal(f.state.ORDERS.length, 1); assert.equal(f.state.ORDER_ITEMS.length, 1); assert.equal(f.state.SHIPMENTS.length, 1); assert.equal(f.calls.inventory, 1);
});

for (const status of ['failed', 'pending']) test(`${status} Razorpay payment is rejected`, async () => {
  const f = fixture({ gatewayPayment: gateway({ status }) }); const report = await f.service.run({ paymentId: 'pay_1' }); assert.equal(report.results[0].code, 'RAZORPAY_PAYMENT_INVALID'); assert.equal(f.calls.materialize, 0);
});

test('amount mismatch is rejected', async () => { const f = fixture({ gatewayPayment: gateway({ amount: 24064 }) }); const r = await f.service.run({ paymentId: 'pay_1' }); assert.equal(r.results[0].code, 'RAZORPAY_PAYMENT_INVALID'); });
test('currency mismatch is rejected', async () => { const f = fixture({ gatewayPayment: gateway({ currency: 'USD' }) }); const r = await f.service.run({ paymentId: 'pay_1' }); assert.equal(r.results[0].code, 'RAZORPAY_PAYMENT_INVALID'); });

test('existing item proves inventory was already processed', async () => {
  const f = fixture({ payments: [payment({ OrderID: order.OrderID, Status: 'Paid' })], orders: [order], items: [item] }); await f.service.run({ paymentId: 'pay_1' }); assert.equal(f.calls.inventory, 0);
});

test('existing Purchase event is not created twice', async () => {
  const f = fixture({ payments: [payment({ OrderID: order.OrderID, Status: 'Paid' })], orders: [order], items: [item], notifications: [{ NotificationID: `meta-purchase-${order.OrderID}`, OrderID: order.OrderID, Status: 'sent' }] }); await f.service.run({ paymentId: 'pay_1' }); assert.equal(f.calls.purchase, 0);
});

test('concurrent webhook/recovery-style calls serialize to one materialization', async () => {
  const f = fixture(); await Promise.all([f.service.run({ paymentId: 'pay_1' }), f.service.run({ paymentId: 'pay_1' })]);
  assert.equal(f.state.ORDERS.length, 1); assert.equal(f.state.ORDER_ITEMS.length, 1); assert.equal(f.calls.inventory, 1);
});

test('Google Sheets partial write with order but no items is recoverable', async () => {
  const f = fixture({ payments: [payment({ OrderID: order.OrderID, Status: 'Processing' })], orders: [order] }); await f.service.run({ paymentId: 'pay_1' }); assert.equal(f.state.ORDER_ITEMS.length, 1); assert.equal(f.state.PAYMENTS[0].Status, 'Paid');
});

test('dry-run reports actions and performs no writes', async () => {
  const f = fixture(); const report = await f.service.run({ paymentId: 'pay_1', dryRun: true }); assert.equal(report.results[0].recoveryRequired, true); assert.deepEqual(f.calls, { materialize: 0, inventory: 0, purchase: 0, ship: 0 });
});

test('dry-run uses the non-mutating Sheets reader when available', async () => {
  const f = fixture(); let readOnlyCalls = 0;
  f.service.sheets.getRowsReadOnly = async (name) => { readOnlyCalls += 1; return f.state[name].map((row) => ({ ...row })); };
  await f.service.run({ paymentId: 'pay_1', dryRun: true });
  assert.equal(readOnlyCalls, 5); assert.deepEqual(f.calls, { materialize: 0, inventory: 0, purchase: 0, ship: 0 });
});

test('captured gateway payment without persisted checkout is reported but never fabricated', async () => {
  const f = fixture({ payments: [] }); const report = await f.service.run({ paymentId: 'pay_1', dryRun: true }); assert.equal(report.results[0].payment, 'MISSING'); assert.equal(report.results[0].applied, false);
});
