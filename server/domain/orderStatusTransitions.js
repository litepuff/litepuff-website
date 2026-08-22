export const ORDER_STATUSES = Object.freeze([
  'Pending', 'Confirmed', 'Packed', 'Ready for Dispatch', 'Shipped',
  'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded'
]);

const TRANSITIONS = Object.freeze({
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Packed', 'Ready for Dispatch', 'Cancelled'],
  Packed: ['Ready for Dispatch', 'Cancelled'],
  'Ready for Dispatch': ['Shipped', 'Cancelled'],
  Shipped: ['Out for Delivery', 'Returned'],
  'Out for Delivery': ['Delivered', 'Returned'],
  Delivered: [], Cancelled: [], Returned: [], Refunded: [],
});

export function allowedOrderTransitions(status) {
  return [...(TRANSITIONS[status] || [])];
}

export function canTransitionOrder(current, next) {
  return current === next || allowedOrderTransitions(current).includes(next);
}
