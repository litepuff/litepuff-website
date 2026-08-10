export const purchaseEventId = (orderId) => `purchase-${String(orderId || '').trim()}`;

export const isCapturedRazorpayPayment = (payment = {}) => (
  String(payment.status || '').trim().toLowerCase() === 'captured'
);

export const isValidCapturedPayment = ({ payment = {}, snapshot = {}, gatewayPayment = {} } = {}) => (
  gatewayPayment.order_id === payment.RazorpayOrderID &&
  snapshot.razorpayOrderId === payment.RazorpayOrderID &&
  Number(gatewayPayment.amount) === Math.round(Number(payment.Amount) * 100) &&
  gatewayPayment.currency === payment.Currency &&
  isCapturedRazorpayPayment(gatewayPayment)
);

export const isCodPurchaseOrder = (order = {}) => (
  order.PaymentMethod === 'Cash on Delivery' && order.OrderStatus === 'Delivered'
);

export const isOnlinePurchaseOrder = (order = {}, payment = {}) => (
  order.PaymentMethod !== 'Cash on Delivery' &&
  order.PaymentStatus === 'Paid' &&
  payment.Status === 'Paid'
);
