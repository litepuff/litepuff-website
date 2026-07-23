import { env } from '../config/env.js';
import { appendRow, getRows, updateRow } from './googleSheets.js';
import { createId } from '../utils/createId.js';
import { logger } from '../utils/logger.js';

const requestJson = async (url, options = {}, attempt = 0) => {
  try {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15_000) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, (500 * (2 ** attempt)) + Math.floor(Math.random() * 200)));
        return requestJson(url, options, attempt + 1);
      }
      throw Object.assign(new Error(payload.message || payload.error || 'Shipping provider request failed.'), { status: 502, providerStatus: response.status });
    }
    return payload;
  } catch (error) {
    if (attempt < 2 && ['TimeoutError', 'TypeError'].includes(error.name)) {
      await new Promise((resolve) => setTimeout(resolve, (500 * (2 ** attempt)) + Math.floor(Math.random() * 200)));
      return requestJson(url, options, attempt + 1);
    }
    throw error;
  }
};

class ShiprocketProvider {
  name = 'shiprocket'; token = ''; expiresAt = 0;
  configured() { return Boolean(env.shiprocketEmail && env.shiprocketPassword); }
  async authenticate() {
    if (this.token && Date.now() < this.expiresAt) return this.token;
    const data = await requestJson('https://apiv2.shiprocket.in/v1/external/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: env.shiprocketEmail, password: env.shiprocketPassword }) });
    this.token = data.token; this.expiresAt = Date.now() + 8 * 24 * 60 * 60_000; return this.token;
  }
  async call(path, options = {}) { return requestJson(`https://apiv2.shiprocket.in/v1/external${path}`, { ...options, headers: { Authorization: `Bearer ${await this.authenticate()}`, 'Content-Type': 'application/json', ...options.headers } }); }
  async quote(input) {
    const data = await this.call(`/courier/serviceability/?pickup_postcode=${input.originPincode}&delivery_postcode=${input.destinationPincode}&weight=${input.weight}&cod=${input.cod ? 1 : 0}`);
    const courier = [...(data?.data?.available_courier_companies || [])].sort((a, b) => Number(a.freight_charge) - Number(b.freight_charge))[0];
    if (!courier) throw new Error('Shiprocket has no serviceable courier.');
    return { provider: this.name, cost: Number(courier.freight_charge), estimatedDays: Number(courier.estimated_delivery_days || 99), courierId: courier.courier_company_id, courier: courier.courier_name };
  }
  async create(order, quote) {
    const payload = orderToShiprocket(order);
    const shipment = await this.call('/orders/create/adhoc', { method: 'POST', body: JSON.stringify(payload) });
    const awb = await this.call('/courier/assign/awb', { method: 'POST', body: JSON.stringify({ shipment_id: shipment.shipment_id, courier_id: quote.courierId }) });
    return { providerShipmentId: shipment.shipment_id, awb: awb?.response?.data?.awb_code || '', courier: quote.courier, status: 'AWB Assigned' };
  }
  tracking(awb) { return this.call(`/courier/track/awb/${encodeURIComponent(awb)}`); }
  cancel(ids) { return this.call('/orders/cancel', { method: 'POST', body: JSON.stringify({ ids }) }); }
}

class DelhiveryProvider {
  name = 'delhivery'; configured() { return Boolean(env.delhiveryToken && env.delhiveryClientName); }
  headers() { return { Authorization: `Token ${env.delhiveryToken}`, 'Content-Type': 'application/json' }; }
  async quote(input) {
    await requestJson(`https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${input.destinationPincode}`, { headers: this.headers() });
    return { provider: this.name, cost: Number.MAX_SAFE_INTEGER, estimatedDays: 99, courier: 'Delhivery' };
  }
  async create(order) {
    const shipment = orderToDelhivery(order);
    const data = await requestJson('https://track.delhivery.com/api/cmu/create.json', { method: 'POST', headers: this.headers(), body: new URLSearchParams({ format: 'json', data: JSON.stringify({ shipments: [shipment], pickup_location: { name: env.delhiveryClientName } }) }) });
    const result = data.packages?.[0] || {};
    if (!result.waybill) throw new Error(result.remarks?.[0] || 'Delhivery booking failed.');
    return { providerShipmentId: result.refnum || order.OrderNumber, awb: result.waybill, courier: 'Delhivery', status: result.status || 'Manifested' };
  }
  tracking(awb) { return requestJson(`https://track.delhivery.com/api/v1/packages/json/?waybill=${encodeURIComponent(awb)}`, { headers: this.headers() }); }
  cancel(awb) { return requestJson('https://track.delhivery.com/api/p/edit', { method: 'POST', headers: this.headers(), body: JSON.stringify({ waybill: awb, cancellation: 'true' }) }); }
}

export const shippingProviders = { shiprocket: new ShiprocketProvider(), delhivery: new DelhiveryProvider() };

export async function chooseCourier(input) {
  const providers = Object.values(shippingProviders).filter((provider) => provider.configured());
  if (!providers.length) throw Object.assign(new Error('No shipping provider is configured.'), { status: 503 });
  const settled = await Promise.allSettled(providers.map((provider) => provider.quote(input)));
  const quotes = settled.filter((item) => item.status === 'fulfilled').map((item) => item.value);
  if (!quotes.length) throw Object.assign(new Error('No courier can service this address.'), { status: 422 });
  const cheapest = Math.min(...quotes.map((quote) => quote.cost));
  return quotes.sort((a, b) => (a.cost / cheapest + a.estimatedDays / 7) - (b.cost / cheapest + b.estimatedDays / 7))[0];
}

export async function createShipment(order, preferredProvider) {
  const existing = (await getRows('SHIPMENTS')).find((row) => row.OrderID === order.OrderID);
  if (existing && existing.AWB && !['Failed', 'Retry Pending'].includes(existing.Status)) return existing;
  const input = { originPincode: env.shippingOriginPincode, destinationPincode: order.Pincode || order.shippingAddress?.pincode, weight: order.weight || env.shippingWeightKg, cod: order.PaymentMethod === 'Cash on Delivery' };
  let quote;
  try {
    const selected = preferredProvider && shippingProviders[preferredProvider];
    if (preferredProvider && !selected?.configured()) throw Object.assign(new Error('Selected shipping provider is not configured.'), { status: 503 });
    quote = selected ? await selected.quote(input) : await chooseCourier(input);
  } catch (error) {
    const failedAt = new Date().toISOString();
    const pending = { ShipmentID: existing?.ShipmentID || `shipment-${order.OrderID}`, OrderID: order.OrderID, Provider: preferredProvider || '', ProviderShipmentID: '', AWB: '', Courier: '', Cost: '', EstimatedDays: '', LabelURL: '', Status: 'Retry Pending', TrackingURL: '', CreatedAt: existing?.CreatedAt || failedAt, UpdatedAt: failedAt };
    if (existing) await updateRow('SHIPMENTS', existing._row, pending).catch(() => {});
    else await appendRow('SHIPMENTS', pending).catch(() => {});
    throw Object.assign(error, { code: 'SHIPMENT_RETRY_PENDING' });
  }
  const fallbacks = [shippingProviders[quote.provider], ...Object.values(shippingProviders).filter((provider) => provider.name !== quote.provider && provider.configured())];
  let lastError;
  for (const provider of fallbacks) {
    try {
      const selectedQuote = provider.name === quote.provider ? quote : await provider.quote(input);
      const result = await provider.create(order, selectedQuote);
      const now = new Date().toISOString();
      const record = { ShipmentID: existing?.ShipmentID || `shipment-${order.OrderID}`, OrderID: order.OrderID, Provider: provider.name, ProviderShipmentID: result.providerShipmentId, AWB: result.awb, Courier: result.courier, Cost: selectedQuote.cost, EstimatedDays: selectedQuote.estimatedDays, LabelURL: '', Status: result.status, TrackingURL: '', CreatedAt: existing?.CreatedAt || now, UpdatedAt: now };
      if (existing) await updateRow('SHIPMENTS', existing._row, record);
      else await appendRow('SHIPMENTS', record);
      if (order._row) await updateRow('ORDERS', order._row, { ...order, TrackingNumber: result.awb, OrderStatus: 'Shipped', UpdatedAt: now });
      await appendRow('ORDER_TRACKING', { TrackingID: createId('tracking'), OrderID: order.OrderID, CurrentStatus: 'Shipped', UpdatedBy: provider.name, Remarks: `${result.courier} · ${result.awb}`, UpdatedAt: now, EstimatedDeliveryDate: order.EstimatedDelivery });
      return record;
    } catch (error) { lastError = error; }
  }
  const failedAt = new Date().toISOString();
  const pending = { ShipmentID: existing?.ShipmentID || `shipment-${order.OrderID}`, OrderID: order.OrderID, Provider: preferredProvider || '', ProviderShipmentID: '', AWB: '', Courier: '', Cost: '', EstimatedDays: '', LabelURL: '', Status: 'Retry Pending', TrackingURL: '', CreatedAt: existing?.CreatedAt || failedAt, UpdatedAt: failedAt };
  if (existing) await updateRow('SHIPMENTS', existing._row, pending).catch(() => {});
  else await appendRow('SHIPMENTS', pending).catch(() => {});
  throw Object.assign(lastError || new Error('Shipment creation is pending retry.'), { status: 503, code: 'SHIPMENT_RETRY_PENDING' });
}

export async function fetchLiveTracking(orderId, customerId) {
  const order = (await getRows('ORDERS')).find((row) => row.OrderID === orderId || row.OrderNumber === orderId);
  if (!order || (customerId && order.CustomerID !== customerId)) throw Object.assign(new Error('Order not found.'), { status: 404 });
  const shipment = (await getRows('SHIPMENTS')).find((row) => row.OrderID === order.OrderID);
  const timeline = (await getRows('ORDER_TRACKING')).filter((row) => row.OrderID === order.OrderID);
  let live = null;
  if (shipment?.AWB && shippingProviders[shipment.Provider]?.configured()) live = await shippingProviders[shipment.Provider].tracking(shipment.AWB).catch(() => null);
  return { order, shipment, tracking: timeline, live, provider: shipment?.Provider || 'pending' };
}

export async function cancelShipment(orderId) {
  const shipment = (await getRows('SHIPMENTS')).find((row) => row.OrderID === orderId || row.ShipmentID === orderId);
  if (!shipment) throw Object.assign(new Error('Shipment not found.'), { status: 404 });
  const provider = shippingProviders[shipment.Provider];
  if (!provider?.configured()) throw Object.assign(new Error(`${shipment.Provider} is not configured.`), { status: 503 });
  await provider.cancel(shipment.Provider === 'shiprocket' ? [Number(shipment.ProviderShipmentID)] : shipment.AWB);
  shipment.Status = 'Cancelled'; shipment.UpdatedAt = new Date().toISOString();
  await updateRow('SHIPMENTS', shipment._row, shipment);
  await appendRow('ORDER_TRACKING', { TrackingID: createId('tracking'), OrderID: shipment.OrderID, CurrentStatus: 'Cancelled', UpdatedBy: 'Admin', Remarks: `Cancelled with ${shipment.Provider}`, UpdatedAt: shipment.UpdatedAt, EstimatedDeliveryDate: '' });
  return shipment;
}

const orderToShiprocket = (order) => ({ order_id: order.OrderNumber, order_date: order.CreatedAt, pickup_location: env.shiprocketPickupLocation, billing_customer_name: order.shippingAddress?.name, billing_address: order.shippingAddress?.addressLine, billing_city: order.shippingAddress?.city, billing_pincode: order.shippingAddress?.pincode, billing_state: order.shippingAddress?.state, billing_country: 'India', billing_email: order.email || '', billing_phone: order.shippingAddress?.phone, shipping_is_billing: true, order_items: (order.items || []).map((item) => ({ name: item.name || item.ProductName, sku: item.id || item.ProductID, units: item.quantity || item.Quantity, selling_price: item.price || item.Price })), payment_method: order.PaymentMethod === 'Cash on Delivery' ? 'COD' : 'Prepaid', sub_total: Number(order.GrandTotal), length: 20, breadth: 15, height: 10, weight: order.weight || env.shippingWeightKg });
const orderToDelhivery = (order) => ({ name: order.shippingAddress?.name, add: order.shippingAddress?.addressLine, pin: order.shippingAddress?.pincode, city: order.shippingAddress?.city, state: order.shippingAddress?.state, country: 'India', phone: order.shippingAddress?.phone, order: order.OrderNumber, payment_mode: order.PaymentMethod === 'Cash on Delivery' ? 'COD' : 'Prepaid', total_amount: order.GrandTotal, products_desc: (order.items || []).map((item) => item.name || item.ProductName).join(', '), weight: Math.round((order.weight || env.shippingWeightKg) * 1000) });

let retryTimer;
let retryRunning = false;

export async function retryPendingShipments() {
  if (retryRunning) return;
  retryRunning = true;
  try {
    const pending = (await getRows('SHIPMENTS'))
      .filter((row) => row.Status === 'Retry Pending')
      .sort((a, b) => String(a.UpdatedAt).localeCompare(String(b.UpdatedAt)))
      .slice(0, 5);
    if (!pending.length) return;
    const [orders, addresses, items] = await Promise.all([getRows('ORDERS'), getRows('ADDRESSES'), getRows('ORDER_ITEMS')]);
    for (const shipment of pending) {
      const order = orders.find((row) => row.OrderID === shipment.OrderID);
      if (!order) continue;
      const address = addresses.find((row) => row.AddressID === order.AddressID);
      const enriched = {
        ...order,
        shippingAddress: address ? { name: address.FullName, phone: address.Phone, addressLine: [address.AddressLine1, address.AddressLine2, address.Landmark].filter(Boolean).join(', '), city: address.City, state: address.State, pincode: address.Pincode } : undefined,
        items: items.filter((row) => row.OrderID === order.OrderID)
      };
      await createShipment(enriched, shipment.Provider || undefined).catch((error) => logger.warn('shipping.retry.deferred', { orderId: order.OrderID, shipmentId: shipment.ShipmentID, code: error.code || 'SHIPPING_PROVIDER_FAILED' }));
    }
  } finally {
    retryRunning = false;
  }
}

export function startShippingRetryWorker() {
  if (retryTimer) return retryTimer;
  const interval = Math.max(60_000, Number(process.env.SHIPPING_RETRY_INTERVAL_MS || 300_000));
  retryTimer = setInterval(() => retryPendingShipments().catch((error) => logger.warn('shipping.retry-worker.failed', { code: error.code || 'SHIPPING_RETRY_WORKER_FAILED' })), interval);
  retryTimer.unref?.();
  return retryTimer;
}
