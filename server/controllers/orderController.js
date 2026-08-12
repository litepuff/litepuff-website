import { getRows } from "../services/googleSheets.js";
import { ok } from "../utils/apiResponse.js";

export function orderDto(
  row,
  items = [],
  tracking = [],
  address = null,
  payment = null,
  shipment = null,
) {
  return {
    id: row.OrderID,
    customerId: row.CustomerID,
    addressId: row.AddressID,
    orderNumber: row.OrderNumber,
    invoiceNumber: `INV-${row.OrderNumber || row.OrderID}`,
    subtotal: Number(row.Subtotal || 0),
    productDiscount: Number(row.ProductDiscount || 0),
    couponDiscount: Number(row.CouponDiscount || 0),
    shipping: Number(row.Shipping || 0),
    discount: Number(row.Discount || 0),
    tax: Number(row.Tax || 0),
    grandTotal: Number(row.GrandTotal || 0),
    couponCode: row.CouponCode,
    paymentMethod: payment?.PaymentMethod || row.PaymentMethod,
    paymentStatus: payment?.Status || row.PaymentStatus,
    transactionId:
      payment?.TransactionReference || payment?.RazorpayPaymentID || "",
    paymentGateway: payment?.Gateway || "Razorpay",
    paymentDate: payment?.PaidAt || "",
    status: row.OrderStatus,
    trackingId: row.TrackingNumber,
    trackingNumber: row.TrackingNumber,
    shippingProvider: shipment?.Provider || row.ShippingProvider,
    awbNumber: shipment?.AWBNumber || row.AWBNumber,
    courierName: shipment?.CourierName || row.CourierName,
    shippingStatus: shipment?.ShippingStatus || row.ShippingStatus || 'Pending Shipment',
    pickupStatus: shipment?.PickupStatus || row.PickupStatus,
    trackingUrl: shipment?.TrackingURL || row.TrackingURL,
    pickupDate: shipment?.PickupDate || "",
    dispatchDate: shipment?.DispatchDate || "",
    deliveryDate: shipment?.DeliveryDate || "",
    latestShippingEvent: shipment?.LatestEvent || "",
    latestShippingEventAt: shipment?.LatestEventAt || "",
    trackingStatusCode: shipment?.TrackingStatusCode || "",
    estimatedDelivery: row.EstimatedDelivery,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
    items,
    tracking,
    address,
    payment,
  };
}

async function ownedOrder(customerId, orderId) {
  const row = (await getRows("ORDERS")).find(
    (order) =>
      (order.OrderID === orderId || order.OrderNumber === orderId) &&
      (!customerId || order.CustomerID === customerId),
  );
  if (!row) {
    const error = new Error("Order not found.");
    error.status = 404;
    throw error;
  }
  return row;
}

export async function decorateOrder(row) {
  const [items, tracking, payments, addresses, shipments] = await Promise.all([
    getRows("ORDER_ITEMS"),
    getRows("ORDER_TRACKING"),
    getRows("PAYMENTS"),
    getRows("ADDRESSES"),
    getRows("SHIPMENTS"),
  ]);
  return orderDto(
    row,
    items
      .filter((item) => item.OrderID === row.OrderID)
      .map((item) => ({
        id: item.OrderItemID,
        productId: item.ProductID,
        metaCatalogId: String(item.MetaCatalogID || '').trim(),
        type: item.LineType || 'product',
        comboId: item.ComboID || '',
        comboType: item.ComboType || '',
        comboName: item.ComboName || '',
        comboPrice: Number(item.ComboPrice || 0),
        freeDelivery: String(item.FreeDelivery).toLowerCase() === 'true' || item.FreeDelivery === true,
        productName: item.ProductName,
        price: Number(item.Price || 0),
        quantity: Number(item.Quantity || 0),
        total: Number(item.Total || 0),
      })),
    tracking
      .filter((item) => item.OrderID === row.OrderID)
      .map((item) => ({
        id: item.TrackingID,
        status: item.CurrentStatus,
        description: item.Remarks,
        updatedBy: item.UpdatedBy,
        estimatedDeliveryDate: item.EstimatedDeliveryDate,
        dateTime: item.UpdatedAt,
        updatedAt: item.UpdatedAt,
      })),
    addresses.find(
      (item) =>
        item.AddressID === row.AddressID && item.CustomerID === row.CustomerID,
    ) || null,
    payments.find((item) => item.OrderID === row.OrderID) || null,
    shipments.find((item) => item.OrderID === row.OrderID) || null,
  );
}

export async function getOrders(request, response) {
  const [rows, payments, shipments] = await Promise.all([
    getRows("ORDERS"),
    getRows("PAYMENTS"),
    getRows("SHIPMENTS"),
  ]);
  const visible = request.customer
    ? rows.filter((row) => row.CustomerID === request.customer.id)
    : rows;
  ok(response, {
    orders: visible
      .map((row) =>
        orderDto(
          row,
          [],
          [],
          null,
          payments.find((payment) => payment.OrderID === row.OrderID) || null,
          shipments.find((shipment) => shipment.OrderID === row.OrderID) || null,
        ),
      )
      .reverse(),
  });
}

export async function getOrderDetails(request, response) {
  ok(response, {
    order: await decorateOrder(
      await ownedOrder(request.customer?.id, request.params.id),
    ),
  });
}

export async function getTracking(request, response) {
  const row = await ownedOrder(request.customer?.id, request.params.orderId);
  const tracking = (await getRows("ORDER_TRACKING"))
    .filter((item) => item.OrderID === row.OrderID)
    .map((item) => ({
      id: item.TrackingID,
      status: item.CurrentStatus,
      description: item.Remarks,
      updatedBy: item.UpdatedBy,
      estimatedDeliveryDate: item.EstimatedDeliveryDate,
      dateTime: item.UpdatedAt,
      updatedAt: item.UpdatedAt,
    }));
  ok(response, { order: orderDto(row), tracking });
}
