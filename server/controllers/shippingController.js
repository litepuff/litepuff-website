import { getRows } from '../services/googleSheets.js';
import { cancelShipment, chooseCourier, createShipment, fetchLiveTracking } from '../services/shippingService.js';
import { ok } from '../utils/apiResponse.js';

export async function quoteShipping(request, response) { ok(response, { quote: await chooseCourier(request.body) }); }
export async function adminCreateShipment(request, response) {
  const order = (await getRows('ORDERS')).find((row) => row.OrderID === request.params.orderId || row.OrderNumber === request.params.orderId);
  if (!order) throw Object.assign(new Error('Order not found.'), { status: 404 });
  ok(response, { shipment: await createShipment({ ...order, ...request.body.orderData }, request.body.provider) }, 'Shipment created.');
}
export async function adminCancelShipment(request, response) { ok(response, { shipment: await cancelShipment(request.params.orderId) }, 'Shipment cancelled.'); }
export async function adminTrackShipment(request, response) { ok(response, await fetchLiveTracking(request.params.orderId)); }
