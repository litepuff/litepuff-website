import { getRows } from '../services/googleSheets.js';
import { cancelShipment, chooseCourier, createShipment, fetchLiveTracking } from '../services/shippingService.js';
import { ok } from '../utils/apiResponse.js';

export async function quoteShipping(request, response) { ok(response, { quote: await chooseCourier(request.body) }); }
export async function adminCreateShipment(request, response) {
  const order = (await getRows('ORDERS')).find((row) => row.OrderID === request.params.orderId || row.OrderNumber === request.params.orderId);
  if (!order) throw Object.assign(new Error('Order not found.'), { status: 404 });
  const [addresses, items] = await Promise.all([getRows('ADDRESSES'), getRows('ORDER_ITEMS')]);
  const address = addresses.find((row) => row.AddressID === order.AddressID);
  const shippingAddress = address ? {
    name: address.FullName,
    phone: address.Phone,
    addressLine: [address.AddressLine1, address.AddressLine2, address.Landmark].filter(Boolean).join(', '),
    city: address.City,
    state: address.State,
    pincode: address.Pincode
  } : undefined;
  ok(response, { shipment: await createShipment({ ...order, ...request.body.orderData, shippingAddress, items: items.filter((row) => row.OrderID === order.OrderID) }, request.body.provider || 'delhivery') }, 'Shipment created.');
}
export async function adminCancelShipment(request, response) { ok(response, { shipment: await cancelShipment(request.params.orderId) }, 'Shipment cancelled.'); }
export async function adminTrackShipment(request, response) { ok(response, await fetchLiveTracking(request.params.orderId)); }
