import { env } from '../config/env.js';
import { appendRow, getRows, updateRow } from './googleSheets.js';
import { createId } from '../utils/createId.js';
import { logger } from '../utils/logger.js';
import { adminSheetsService } from './AdminSheetsService.js';

const logShippingActivity = (action, metadata) =>
  adminSheetsService.recordActivity({ action, module: 'Shipping', metadata }).catch(() => {});

const shiprocketTrackingUrl = (awb) =>
  awb ? `https://shiprocket.co/tracking/${encodeURIComponent(awb)}` : '';

const redactProviderPayload = (value) => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((item) => redactProviderPayload(item));
  if (typeof value !== 'object') return value;
  const protectedKeys = new Set([
    'authorization',
    'password',
    'token',
    'access_token',
    'refresh_token',
    'api_token',
    'api_key',
    'secret'
  ]);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    protectedKeys.has(String(key).toLowerCase())
      ? '[REDACTED]'
      : redactProviderPayload(item)
  ]));
};

const validationDiagnostics = (payload) => {
  const validationErrors =
    payload?.errors ??
    payload?.data?.errors ??
    payload?.error?.errors ??
    null;
  const fields = new Set();
  const collectFields = (value, prefix = '') => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    for (const [key, child] of Object.entries(value)) {
      const field = prefix ? `${prefix}.${key}` : key;
      fields.add(field);
      if (child && typeof child === 'object' && !Array.isArray(child)) collectFields(child, field);
    }
  };
  collectFields(validationErrors);
  return {
    validationErrors: redactProviderPayload(validationErrors),
    validationFields: [...fields]
  };
};

const providerError = ({ url, response, payload }) => {
  // Shiprocket sometimes reports an application error inside an HTTP 200 body.
  const payloadStatus = Number(payload?.status_code || payload?.status);
  const httpStatus = Number(response?.status || 0);
  const status = httpStatus >= 400 ? httpStatus : (payloadStatus >= 400 ? payloadStatus : 502);
  const rawMessage = payload?.message || payload?.error || payload?.errors?.message || 'Shipping provider request failed.';
  const message = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(redactProviderPayload(rawMessage));
  const diagnostics = validationDiagnostics(payload);
  const error = Object.assign(new Error(message), {
    status: 502,
    providerStatus: status,
    providerCode: payload?.code || payload?.error_code || payload?.status_code || '',
    providerBody: redactProviderPayload(payload),
    validationErrors: diagnostics.validationErrors,
    validationFields: diagnostics.validationFields,
    providerPath: (() => { try { return new URL(url).pathname; } catch { return ''; } })(),
    retryable: status === 429 || status >= 500
  });
  return error;
};

const requestJson = async (url, options = {}, attempt = 0) => {
  try {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15_000) });
    const payload = await response.json().catch(() => ({}));
    const embeddedStatus = Number(payload?.status_code || payload?.status);
    const embeddedFailure = response.ok && embeddedStatus >= 400;
    if (!response.ok || embeddedFailure) {
      const error = providerError({ url, response, payload });
      if (error.retryable && attempt < 2) {
        const delayMs = (500 * (2 ** attempt)) + Math.floor(Math.random() * 200);
        logger.warn('shiprocket.retry.scheduled', {
          path: error.providerPath,
          attempt: attempt + 1,
          delayMs,
          providerStatus: error.providerStatus,
          providerCode: error.providerCode
        });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return requestJson(url, options, attempt + 1);
      }
      if (error.retryable) logger.error('shiprocket.retry.exhausted', {
        path: error.providerPath,
        attempts: attempt + 1,
        providerStatus: error.providerStatus,
        providerCode: error.providerCode,
        providerBody: error.providerBody,
        validationErrors: error.validationErrors,
        validationFields: error.validationFields
      });
      throw error;
    }
    return payload;
  } catch (error) {
    if (attempt < 2 && ['TimeoutError', 'TypeError'].includes(error.name)) {
      const delayMs = (500 * (2 ** attempt)) + Math.floor(Math.random() * 200);
      logger.warn('shiprocket.retry.scheduled', {
        path: (() => { try { return new URL(url).pathname; } catch { return ''; } })(),
        attempt: attempt + 1,
        delayMs,
        reason: error.name
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return requestJson(url, options, attempt + 1);
    }
    if (['TimeoutError', 'TypeError'].includes(error.name)) logger.error('shiprocket.retry.exhausted', {
      path: (() => { try { return new URL(url).pathname; } catch { return ''; } })(),
      attempts: attempt + 1,
      reason: error.name,
      error: error.message
    });
    throw error;
  }
};

export class ShiprocketProvider {
  name = 'shiprocket'; token = ''; expiresAt = 0;
  configured() { return Boolean(env.shiprocketEmail && env.shiprocketPassword); }
  configurationErrors() {
    const errors = [];
    if (!env.shiprocketEmail) errors.push('SHIPROCKET_EMAIL is missing');
    if (!env.shiprocketPassword) errors.push('SHIPROCKET_PASSWORD is missing');
    if (!/^https:\/\/apiv2\.shiprocket\.in\/v1\/external$/i.test(env.shiprocketBaseUrl)) errors.push('SHIPROCKET_BASE_URL is invalid');
    if (!/^\d{6}$/.test(String(env.shippingOriginPincode))) errors.push('SHIPPING_ORIGIN_PINCODE must contain exactly 6 digits');
    if (!env.shiprocketPickupLocation || env.shiprocketPickupLocation.length > 50) errors.push('SHIPROCKET_PICKUP_LOCATION must be the Shiprocket pickup nickname');
    if (!Number.isFinite(env.shippingWeightKg) || env.shippingWeightKg <= 0) errors.push('SHIPPING_DEFAULT_WEIGHT_KG must be positive');
    return errors;
  }
  async authenticate() {
    if (this.token && Date.now() < this.expiresAt) return this.token;
    const configurationErrors = this.configurationErrors().filter((message) => !message.startsWith('SHIPPING_') && !message.startsWith('SHIPROCKET_PICKUP'));
    if (configurationErrors.length) throw Object.assign(new Error(configurationErrors.join('; ')), { code: 'SHIPROCKET_CONFIG_INVALID', retryable: false });
    logger.info('shiprocket.login.started', { baseUrl: env.shiprocketBaseUrl });
    try {
      const data = await requestJson(`${env.shiprocketBaseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: env.shiprocketEmail, password: env.shiprocketPassword }) });
      if (!data.token) throw Object.assign(new Error('Shiprocket login response did not include a token.'), { code: 'SHIPROCKET_TOKEN_MISSING', providerBody: redactProviderPayload(data), retryable: false });
      this.token = data.token;
      this.expiresAt = Date.now() + 8 * 24 * 60 * 60_000;
      logger.info('shiprocket.login.succeeded', { accountId: data.id || null, companyId: data.company_id || null });
      return this.token;
    } catch (error) {
      logger.error('shiprocket.login.failed', { providerStatus: error.providerStatus, providerCode: error.providerCode, providerBody: error.providerBody, error: error.message });
      throw error;
    }
  }
  async call(path, options = {}, authenticationRetry = 0) {
    try {
      return await requestJson(`${env.shiprocketBaseUrl}${path}`, { ...options, headers: { Authorization: `Bearer ${await this.authenticate()}`, 'Content-Type': 'application/json', ...options.headers } });
    } catch (error) {
      if (error.providerStatus === 401 && authenticationRetry === 0) {
        this.token = '';
        this.expiresAt = 0;
        logger.warn('shiprocket.token.refreshing', { path });
        return this.call(path, options, 1);
      }
      logger.error('shiprocket.api.failed', {
        path,
        providerStatus: error.providerStatus,
        providerCode: error.providerCode,
        providerBody: error.providerBody,
        validationErrors: error.validationErrors,
        validationFields: error.validationFields,
        retryable: Boolean(error.retryable),
        error: error.message
      });
      throw error;
    }
  }
  async quote(input) {
    const configurationErrors = this.configurationErrors();
    if (configurationErrors.length) throw Object.assign(new Error(configurationErrors.join('; ')), { code: 'SHIPROCKET_CONFIG_INVALID', retryable: false });
    const data = await this.call(`/courier/serviceability/?pickup_postcode=${input.originPincode}&delivery_postcode=${input.destinationPincode}&weight=${input.weight}&cod=${input.cod ? 1 : 0}`);
    const courier = [...(data?.data?.available_courier_companies || [])].sort((a, b) => Number(a.freight_charge) - Number(b.freight_charge))[0];
    if (!courier) throw Object.assign(new Error(data?.message || 'Shiprocket has no serviceable courier.'), { code: 'SHIPROCKET_NOT_SERVICEABLE', providerBody: redactProviderPayload(data), retryable: false });
    return { provider: this.name, cost: Number(courier.freight_charge), estimatedDays: Number(courier.estimated_delivery_days || 99), courierId: courier.courier_company_id, courier: courier.courier_name };
  }
  async listOrders(page = 1, perPage = 100) {
    const data = await this.call(`/orders?page=${page}&per_page=${perPage}`);
    return {
      orders: Array.isArray(data?.data?.data) ? data.data.data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.orders) ? data.orders : [],
      lastPage: Number(data?.data?.last_page || data?.meta?.last_page || page)
    };
  }
  async findByExternalOrderId(orderNumber) {
    const data = await this.call(`/orders?search=${encodeURIComponent(orderNumber)}`);
    const orders = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.data?.data)
        ? data.data.data
        : Array.isArray(data?.orders)
          ? data.orders
          : [];
    const match = orders.find((item) => String(item.channel_order_id || item.order_id || '') === String(orderNumber));
    if (!match) return null;
    const shipment = match.shipments?.[0] || match.shipment || {};
    return {
      providerOrderId: match.id || match.order_id,
      providerShipmentId: shipment.id || shipment.shipment_id || match.shipment_id,
      awb: shipment.awb || shipment.awb_code || match.awb_code || '',
      courier: shipment.courier || shipment.courier_name || match.courier_name || '',
      status: shipment.status || match.status || 'Shipment Created'
    };
  }
  async shipment(providerShipmentId) {
    const data = await this.call(`/shipments/${encodeURIComponent(providerShipmentId)}`);
    return {
      providerShipmentId: data.id || data.shipment_id || providerShipmentId,
      awb: data.awb || data.awb_code || '',
      courier: data.courier || data.courier_name || '',
      status: data.status || data.status_code || 'Shipment Created'
    };
  }
  async assignAwb(providerShipmentId, courierId) {
    const data = await this.call('/courier/assign/awb', { method: 'POST', body: JSON.stringify({ shipment_id: providerShipmentId, courier_id: courierId }) });
    const assigned = data?.response?.data || data?.data || data;
    const awb = assigned?.awb_code || assigned?.awb || '';
    if (!awb) throw Object.assign(new Error('Shiprocket did not return an AWB.'), { code: 'SHIPROCKET_AWB_MISSING', safeToFallback: false });
    return { awb, courier: assigned?.courier_name || '', status: assigned?.awb_assign_status === 1 ? 'AWB Assigned' : assigned?.status || 'AWB Assigned' };
  }
  async requestPickup(providerShipmentId) {
    const data = await this.call('/courier/generate/pickup', { method: 'POST', body: JSON.stringify({ shipment_id: [Number(providerShipmentId)] }) });
    return { pickupStatus: data?.pickup_status || data?.response?.pickup_status || 'Pickup Requested', pickupDate: data?.pickup_scheduled_date || data?.response?.pickup_scheduled_date || '' };
  }
  async generateLabel(providerShipmentId) {
    const data = await this.call('/courier/generate/label', { method: 'POST', body: JSON.stringify({ shipment_id: [Number(providerShipmentId)] }) });
    const labelUrl = data?.label_url || data?.response?.label_url || '';
    if (!labelUrl) throw Object.assign(new Error('Shiprocket label is pending generation.'), { code: 'SHIPROCKET_LABEL_PENDING', safeToFallback: false });
    return labelUrl;
  }
  async generateManifest(providerShipmentId, providerOrderId) {
    if (!providerOrderId) throw Object.assign(new Error('Shiprocket order ID is unavailable for manifest generation.'), { code: 'SHIPROCKET_ORDER_RECONCILIATION_PENDING', safeToFallback: false });
    await this.call('/manifests/generate', { method: 'POST', body: JSON.stringify({ shipment_id: [Number(providerShipmentId)] }) });
    const data = await this.call('/manifests/print', { method: 'POST', body: JSON.stringify({ order_ids: [Number(providerOrderId)] }) });
    const manifestUrl = data?.manifest_url || data?.response?.manifest_url || '';
    if (!manifestUrl) throw Object.assign(new Error('Shiprocket manifest is pending generation.'), { code: 'SHIPROCKET_MANIFEST_PENDING', safeToFallback: false });
    return manifestUrl;
  }
  async create(order, quote, existing = {}, onProgress = async () => {}) {
    let remote = null;
    if (existing.ProviderShipmentID) {
      remote = await this.shipment(existing.ProviderShipmentID).catch(() => null);
    }
    const externalOrder = await this.findByExternalOrderId(order.OrderNumber).catch(() => null);
    remote = remote ? { ...externalOrder, ...remote, providerOrderId: externalOrder?.providerOrderId } : externalOrder;

    if (!remote) {
      let payload;
      try {
        payload = orderToShiprocket(order);
        const diagnosticPayload = redactProviderPayload(payload);
        logger.info('shiprocket.order.payload', {
          orderId: order.OrderID,
          orderNumber: order.OrderNumber,
          payloadJson: JSON.stringify(diagnosticPayload)
        });
        logger.info('shiprocket.order.payload.types', {
          orderId: order.OrderID,
          orderNumber: order.OrderNumber,
          types: {
            order_date: typeof payload.order_date,
            sub_total: typeof payload.sub_total,
            weight: typeof payload.weight,
            length: typeof payload.length,
            breadth: typeof payload.breadth,
            height: typeof payload.height,
            shipping_charges: typeof payload.shipping_charges
          }
        });
        validateShiprocketOrderPayload(payload);
        logger.info('shiprocket.order.payload.generated', {
          orderId: order.OrderID,
          orderNumber: order.OrderNumber,
          pickupLocationConfigured: Boolean(payload.pickup_location),
          itemCount: payload.order_items.length,
          paymentMethod: payload.payment_method,
          subTotal: payload.sub_total,
          package: { length: payload.length, breadth: payload.breadth, height: payload.height, weight: payload.weight }
        });
        logger.info('shiprocket.final.payload', {
          orderId: order.OrderID,
          orderNumber: order.OrderNumber,
          payloadJson: JSON.stringify(diagnosticPayload)
        });
        const created = await this.call('/orders/create/adhoc', { method: 'POST', body: JSON.stringify(payload) });
        logger.info('shiprocket.response', {
          orderId: order.OrderID,
          orderNumber: order.OrderNumber,
          httpStatus: 200,
          responseJson: JSON.stringify(redactProviderPayload(created))
        });
        remote = {
          providerOrderId: created.order_id,
          providerShipmentId: created.shipment_id,
          awb: created.awb_code || '',
          courier: created.courier_name || quote.courier,
          status: created.status || 'Shipment Created'
        };
        logger.info('shiprocket.order.created', { orderId: order.OrderID, orderNumber: order.OrderNumber, providerOrderId: remote.providerOrderId, providerShipmentId: remote.providerShipmentId });
      } catch (error) {
        if (error.providerStatus === 400 || error.providerStatus === 422) {
          logger.error('shiprocket.order.validation_rejected', {
            orderId: order.OrderID,
            orderNumber: order.OrderNumber,
            httpStatus: error.providerStatus,
            providerCode: error.providerCode,
            validationFields: error.validationFields,
            validationErrorsJson: JSON.stringify(error.validationErrors),
            responseJson: JSON.stringify(error.providerBody),
            payloadJson: JSON.stringify(redactProviderPayload(payload))
          });
        }
        remote = await this.findByExternalOrderId(order.OrderNumber).catch(() => null);
        if (!remote) throw Object.assign(error, { safeToFallback: false, code: error.code || 'SHIPROCKET_CREATE_AMBIGUOUS' });
      }
    }
    if (!remote?.providerShipmentId) throw Object.assign(new Error('Shiprocket shipment could not be reconciled.'), { code: 'SHIPROCKET_RECONCILIATION_FAILED', safeToFallback: false });

    await onProgress({
      ProviderShipmentID: remote.providerShipmentId,
      CourierName: existing.CourierName || remote.courier || quote.courier,
      ShippingStatus: existing.ShippingStatus === 'Retry Pending' ? remote.status : existing.ShippingStatus || remote.status,
      LatestEvent: existing.LatestEvent || 'Shipment Created',
      LatestEventAt: existing.LatestEventAt || new Date().toISOString()
    }, 'shipment-reconciled');

    let awb = existing.AWBNumber || existing.TrackingNumber || remote.awb;
    let courier = existing.CourierName || remote.courier || quote.courier;
    if (!existing.AWBNumber && remote.awb) {
      await onProgress({ AWBNumber: remote.awb, TrackingNumber: remote.awb, CourierName: courier, ShippingStatus: remote.status || 'AWB Assigned', TrackingURL: shiprocketTrackingUrl(remote.awb), LatestEvent: 'AWB Reconciled', LatestEventAt: new Date().toISOString() }, 'awb-reconciled');
    }
    if (!awb) {
      const assigned = await this.assignAwb(remote.providerShipmentId, quote.courierId);
      awb = assigned.awb;
      courier = assigned.courier || courier;
      await onProgress({ AWBNumber: awb, TrackingNumber: awb, CourierName: courier, ShippingStatus: assigned.status, TrackingURL: shiprocketTrackingUrl(awb), LatestEvent: 'AWB Assigned', LatestEventAt: new Date().toISOString() }, 'awb-assigned');
    }

    let pickupStatus = existing.PickupStatus;
    let pickupDate = existing.PickupDate;
    if (!pickupStatus || pickupStatus === 'Pending') {
      const pickup = await this.requestPickup(remote.providerShipmentId);
      pickupStatus = pickup.pickupStatus;
      pickupDate = pickup.pickupDate;
      await onProgress({ PickupStatus: pickupStatus, PickupDate: pickupDate, ShippingStatus: 'Pickup Requested', LatestEvent: 'Pickup Requested', LatestEventAt: new Date().toISOString() }, 'pickup-requested');
    }

    let labelUrl = existing.LabelURL;
    if (!labelUrl) {
      labelUrl = await this.generateLabel(remote.providerShipmentId);
      if (labelUrl) await onProgress({ LabelURL: labelUrl }, 'label-generated');
    }

    let manifestUrl = existing.ManifestURL;
    if (!manifestUrl) {
      manifestUrl = await this.generateManifest(remote.providerShipmentId, remote.providerOrderId);
      if (manifestUrl) await onProgress({ ManifestURL: manifestUrl }, 'manifest-generated');
    }

    return {
      providerShipmentId: remote.providerShipmentId,
      awb,
      courier,
      status: 'Pickup Requested',
      pickupStatus,
      pickupDate,
      trackingUrl: shiprocketTrackingUrl(awb),
      labelUrl,
      manifestUrl
    };
  }
  tracking(awb) { return this.call(`/courier/track/awb/${encodeURIComponent(awb)}`); }
  cancel(ids) { return this.call('/orders/cancel', { method: 'POST', body: JSON.stringify({ ids }) }); }
}

export class DelhiveryProvider {
  name = 'delhivery'; configured() { return Boolean(env.delhiveryToken && env.delhiveryClientName); }
  headers(contentType = 'application/json') { return { Authorization: `Token ${env.delhiveryToken}`, 'Content-Type': contentType }; }
  async quote(input) {
    await requestJson(`https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${input.destinationPincode}`, { headers: this.headers() });
    return { provider: this.name, cost: Number.MAX_SAFE_INTEGER, estimatedDays: 99, courier: 'Delhivery' };
  }
  async create(order) {
    const shipment = orderToDelhivery(order);
    const data = await requestJson('https://track.delhivery.com/api/cmu/create.json', { method: 'POST', headers: this.headers('application/x-www-form-urlencoded'), body: new URLSearchParams({ format: 'json', data: JSON.stringify({ shipments: [shipment], pickup_location: { name: env.delhiveryClientName } }) }) });
    const result = data.packages?.[0] || {};
    if (!result.waybill) throw new Error(result.remarks?.[0] || 'Delhivery booking failed.');
    return { providerShipmentId: result.refnum || order.OrderNumber, awb: result.waybill, courier: 'Delhivery', status: result.status || 'Manifested', trackingUrl: `https://www.delhivery.com/track/package/${encodeURIComponent(result.waybill)}` };
  }
  tracking(awb) { return requestJson(`https://track.delhivery.com/api/v1/packages/json/?waybill=${encodeURIComponent(awb)}`, { headers: this.headers() }); }
  cancel(awb) { return requestJson('https://track.delhivery.com/api/p/edit', { method: 'POST', headers: this.headers(), body: JSON.stringify({ waybill: awb, cancellation: 'true' }) }); }
}

export const shippingProviders = { shiprocket: new ShiprocketProvider(), delhivery: new DelhiveryProvider() };
export const preferredShippingProvider = () =>
  shippingProviders.shiprocket.configured() ? 'shiprocket' : 'delhivery';

export async function chooseCourier(input) {
  const providers = Object.values(shippingProviders).filter((provider) => provider.configured());
  if (!providers.length) throw Object.assign(new Error('No shipping provider is configured.'), { status: 503 });
  const settled = await Promise.allSettled(providers.map((provider) => provider.quote(input)));
  const quotes = settled.filter((item) => item.status === 'fulfilled').map((item) => item.value);
  if (!quotes.length) throw Object.assign(new Error('No courier can service this address.'), { status: 422 });
  const cheapest = Math.min(...quotes.map((quote) => quote.cost));
  return quotes.sort((a, b) => (a.cost / cheapest + a.estimatedDays / 7) - (b.cost / cheapest + b.estimatedDays / 7))[0];
}

const shipmentLogContext = (context, order, shipment, extra = {}) => ({
  ...context,
  orderId: order.OrderID,
  shipmentId: shipment?.ShipmentID,
  providerShipmentId: shipment?.ProviderShipmentID,
  awb: shipment?.AWBNumber,
  provider: shipment?.Provider,
  ...extra
});

const mirrorShipmentToOrder = (order, shipment) =>
  order._row
    ? updateRow('ORDERS', order._row, {
        ...order,
        OrderStatus: order.OrderStatus === 'Pending Shipment' ? 'Confirmed' : order.OrderStatus,
        TrackingNumber: shipment.AWBNumber || shipment.TrackingNumber || order.TrackingNumber,
        ShippingProvider: shipment.Provider,
        ShipmentID: shipment.ShipmentID,
        AWBNumber: shipment.AWBNumber,
        CourierName: shipment.CourierName,
        TrackingURL: shipment.TrackingURL,
        ShippingStatus: shipment.ShippingStatus,
        PickupStatus: shipment.PickupStatus,
        LabelURL: shipment.LabelURL,
        ManifestURL: shipment.ManifestURL,
        ShippingCreatedAt: shipment.CreatedAt,
        ShippingUpdatedAt: shipment.UpdatedAt,
        UpdatedAt: shipment.UpdatedAt
      })
    : Promise.resolve();

const shipmentLocks = new Map();

async function createShipmentUnlocked(order, preferredProvider, context = {}) {
  logger.info('shipping.create.started', { ...context, orderId: order.OrderID, preferredProvider: preferredProvider || null });
  if (!order._row) {
    const savedOrder = (await getRows('ORDERS')).find((row) => row.OrderID === order.OrderID);
    if (savedOrder) order = { ...savedOrder, ...order };
  }
  if (!order.email && order.CustomerID) {
    const customer = (await getRows('CUSTOMERS')).find((row) => row.CustomerID === order.CustomerID);
    if (customer?.Email) order.email = customer.Email;
  }
  let existing = (await getRows('SHIPMENTS')).find((row) => row.OrderID === order.OrderID);
  const shiprocketComplete = existing?.Provider === 'shiprocket' && existing.AWBNumber && existing.LabelURL && existing.ManifestURL && existing.PickupStatus && existing.PickupStatus !== 'Pending' && !['Failed', 'Retry Pending'].includes(existing.ShippingStatus);
  const otherProviderComplete = existing?.Provider !== 'shiprocket' && existing?.AWBNumber && !['Failed', 'Retry Pending'].includes(existing.ShippingStatus);
  if (shiprocketComplete || otherProviderComplete) {
    logger.info('shipping.create.idempotent_existing', { ...context, orderId: order.OrderID, shipmentId: existing.ShipmentID, provider: existing.Provider });
    return existing;
  }
  const input = { originPincode: env.shippingOriginPincode, destinationPincode: order.Pincode || order.shippingAddress?.pincode, weight: order.weight || env.shippingWeightKg, cod: order.PaymentMethod === 'Cash on Delivery' };
  let quote;
  try {
    const selected = preferredProvider && shippingProviders[preferredProvider];
    if (preferredProvider && !selected?.configured()) throw Object.assign(new Error('Selected shipping provider is not configured.'), { status: 503 });
    quote = selected ? await selected.quote(input) : await chooseCourier(input);
  } catch (error) {
    if (preferredProvider === 'shiprocket' && context.allowFallback !== false && shippingProviders.delhivery.configured()) {
      preferredProvider = 'delhivery';
      quote = await shippingProviders.delhivery.quote(input);
      logger.warn('shipping.provider.fallback', {
        ...context,
        orderId: order.OrderID,
        from: 'shiprocket',
        to: 'delhivery',
        code: error.code || 'SHIPROCKET_UNAVAILABLE',
        providerStatus: error.providerStatus,
        providerCode: error.providerCode,
        providerBody: error.providerBody,
        retryable: Boolean(error.retryable),
        error: error.message
      });
    } else {
    const failedAt = new Date().toISOString();
    const pending = pendingShipment(order, existing, preferredProvider, failedAt);
    if (existing) await updateRow('SHIPMENTS', existing._row, pending).catch(() => {});
    else await appendRow('SHIPMENTS', pending).catch(() => {});
    await markShipmentPending(order, preferredProvider, failedAt);
    await logShippingActivity('Shipment Failed', { orderId: order.OrderID, provider: preferredProvider || 'delhivery', error: error.message });
    logger.warn('shipping.create.retry_pending', { ...context, orderId: order.OrderID, provider: preferredProvider || 'delhivery', code: error.code || 'SHIPPING_PROVIDER_FAILED' });
    throw Object.assign(error, { code: 'SHIPMENT_RETRY_PENDING' });
    }
  }
  const fallbacks = preferredProvider
    ? [shippingProviders[quote.provider]]
    : [shippingProviders[quote.provider], ...Object.values(shippingProviders).filter((provider) => provider.name !== quote.provider && provider.configured())];
  let lastError;
  for (const provider of fallbacks) {
    try {
      const selectedQuote = provider.name === quote.provider ? quote : await provider.quote(input);
      const now = new Date().toISOString();
      const persistProgress = async (changes, stage) => {
        const progress = { ...pendingShipment(order, existing, provider.name, now), ...existing, ...changes, ShipmentID: existing?.ShipmentID || `shipment-${order.OrderID}`, OrderID: order.OrderID, Provider: provider.name, ShippingCharge: Number.isSafeInteger(selectedQuote.cost) ? '' : selectedQuote.cost, EstimatedDays: selectedQuote.estimatedDays, EstimatedDelivery: order.EstimatedDelivery, CreatedAt: existing?.CreatedAt || now, UpdatedAt: new Date().toISOString() };
        if (existing?._row) await updateRow('SHIPMENTS', existing._row, progress);
        else await appendRow('SHIPMENTS', progress);
        existing = (await getRows('SHIPMENTS')).find((row) => row.ShipmentID === progress.ShipmentID) || progress;
        await mirrorShipmentToOrder(order, existing);
        logger.info(`shipping.${stage}`, shipmentLogContext(context, order, existing));
      };
      const result = await provider.create(order, selectedQuote, existing || {}, persistProgress);
      const record = { ...pendingShipment(order, existing, provider.name, now), ...existing, ShipmentID: existing?.ShipmentID || `shipment-${order.OrderID}`, OrderID: order.OrderID, Provider: provider.name, ProviderShipmentID: result.providerShipmentId, AWBNumber: result.awb, TrackingNumber: result.awb, CourierName: result.courier, ShippingCharge: Number.isSafeInteger(selectedQuote.cost) ? '' : selectedQuote.cost, EstimatedDays: selectedQuote.estimatedDays, EstimatedDelivery: order.EstimatedDelivery, LabelURL: result.labelUrl || existing?.LabelURL || '', ManifestURL: result.manifestUrl || existing?.ManifestURL || '', ShippingStatus: result.status, PickupStatus: result.pickupStatus || existing?.PickupStatus || 'Pending', PickupDate: result.pickupDate || existing?.PickupDate || '', TrackingURL: result.trackingUrl || existing?.TrackingURL || '', PackageWeight: input.weight, PackageLength: existing?.PackageLength || 20, PackageWidth: existing?.PackageWidth || 15, PackageHeight: existing?.PackageHeight || 10, CreatedAt: existing?.CreatedAt || now, UpdatedAt: now };
      if (existing) await updateRow('SHIPMENTS', existing._row, record);
      else await appendRow('SHIPMENTS', record);
      await mirrorShipmentToOrder(order, record);
      await appendRow('ORDER_TRACKING', { TrackingID: `tracking-shipment-${order.OrderID}`, OrderID: order.OrderID, CurrentStatus: 'Shipment Created', UpdatedBy: provider.name, Remarks: `${result.courier} · ${result.awb} · ${record.ProviderShipmentID}`, UpdatedAt: now, EstimatedDeliveryDate: order.EstimatedDelivery });
      await logShippingActivity('Shipment Created', { orderId: order.OrderID, shipmentId: record.ShipmentID, provider: provider.name });
      await logShippingActivity('AWB Generated', { orderId: order.OrderID, awb: result.awb, provider: provider.name });
      logger.info('shipping.create.completed', shipmentLogContext(context, order, record));
      return record;
    } catch (error) {
      lastError = error;
      logger.warn('shipping.create.provider_failed', { ...context, orderId: order.OrderID, provider: provider.name, code: error.code || 'SHIPPING_PROVIDER_FAILED' });
      if (provider.name === 'shiprocket' && error.safeToFallback === false) break;
    }
  }
  const failedAt = new Date().toISOString();
  const pending = pendingShipment(order, existing, preferredProvider, failedAt);
  if (existing) await updateRow('SHIPMENTS', existing._row, pending).catch(() => {});
  else await appendRow('SHIPMENTS', pending).catch(() => {});
  await markShipmentPending(order, preferredProvider, failedAt);
  await logShippingActivity('Shipment Failed', { orderId: order.OrderID, provider: preferredProvider || 'delhivery', error: lastError?.message });
  logger.warn('shipping.create.retry_pending', { ...context, orderId: order.OrderID, provider: preferredProvider || 'delhivery', code: lastError?.code || 'SHIPPING_PROVIDER_FAILED' });
  throw Object.assign(lastError || new Error('Shipment creation is pending retry.'), { status: 503, code: 'SHIPMENT_RETRY_PENDING' });
}

export function createShipment(order, preferredProvider, context = {}) {
  const key = order.OrderID || order.OrderNumber;
  if (shipmentLocks.has(key)) return shipmentLocks.get(key);
  const operation = createShipmentUnlocked(order, preferredProvider, context)
    .finally(() => shipmentLocks.delete(key));
  shipmentLocks.set(key, operation);
  return operation;
}

let recoveryRunning = false;

export async function recoverPendingShipments(options = {}, dependencies = {}) {
  if (recoveryRunning) {
    return {
      recovered: [],
      failed: [],
      skipped: [{ orderId: '', orderNumber: '', reason: 'recovery_already_running' }],
      duplicates: [],
      counts: { recovered: 0, failed: 0, skipped: 1, duplicates: 0 }
    };
  }

  const sheets = dependencies.sheets || { getRows };
  const create = dependencies.createShipment || createShipment;
  const provider = dependencies.provider || shippingProviders.shiprocket;
  const log = dependencies.log || logger;
  const limit = Math.min(100, Math.max(1, Number(options.limit || 25)));
  const correlationId = options.correlationId || `shipping-recovery-${Date.now()}`;
  const report = { recovered: [], failed: [], skipped: [], duplicates: [] };
  recoveryRunning = true;

  try {
    const configurationErrors = provider.configurationErrors?.() || [];
    if (!provider.configured?.() || configurationErrors.length) {
      const error = Object.assign(new Error(
        configurationErrors.length
          ? configurationErrors.join('; ')
          : 'Shiprocket is not configured.'
      ), { code: 'SHIPROCKET_CONFIG_INVALID' });
      log.error('shipping.recovery.configuration_invalid', {
        correlationId,
        code: error.code,
        errors: configurationErrors
      });
      throw error;
    }

    const [orders, payments, shipments, addresses, items] = await Promise.all([
      sheets.getRows('ORDERS'),
      sheets.getRows('PAYMENTS'),
      sheets.getRows('SHIPMENTS'),
      sheets.getRows('ADDRESSES'),
      sheets.getRows('ORDER_ITEMS')
    ]);
    const paymentsByOrder = new Map(payments.map((payment) => [payment.OrderID, payment]));
    const shipmentsByOrder = new Map(shipments.map((shipment) => [shipment.OrderID, shipment]));
    const candidates = orders.filter((order) => {
      const shipment = shipmentsByOrder.get(order.OrderID);
      const awb = shipment?.AWBNumber || shipment?.AWB || shipment?.TrackingNumber;
      return !shipment ||
        shipment.ShippingStatus === 'Retry Pending' ||
        !shipment.ShipmentID ||
        !awb;
    });

    log.info('shipping.recovery.started', {
      correlationId,
      candidates: candidates.length,
      limit
    });

    for (const order of candidates.slice(0, limit)) {
      const payment = paymentsByOrder.get(order.OrderID);
      const shipment = shipmentsByOrder.get(order.OrderID);
      const identity = { orderId: order.OrderID, orderNumber: order.OrderNumber };
      const paid = payment?.Status === 'Paid' || order.PaymentStatus === 'Paid';
      const orderStatus = String(order.OrderStatus || '').trim().toLowerCase();
      const awb = shipment?.AWBNumber || shipment?.AWB || shipment?.TrackingNumber || '';

      if (!paid) {
        report.skipped.push({ ...identity, reason: 'order_not_paid' });
        continue;
      }
      if (['cancelled', 'canceled', 'refunded', 'returned'].includes(orderStatus)) {
        report.skipped.push({ ...identity, reason: `order_${orderStatus}` });
        continue;
      }
      if (awb) {
        report.skipped.push({ ...identity, reason: 'awb_already_exists', awb });
        continue;
      }

      const address = addresses.find((row) => row.AddressID === order.AddressID);
      const orderItems = items.filter((row) => row.OrderID === order.OrderID);
      if (!address || !orderItems.length) {
        report.failed.push({
          ...identity,
          code: 'RECOVERY_ORDER_DATA_INCOMPLETE',
          error: !address ? 'Shipping address is missing.' : 'Order items are missing.'
        });
        continue;
      }

      const enriched = {
        ...order,
        shippingAddress: {
          name: address.FullName,
          phone: address.Phone,
          addressLine: [address.AddressLine1, address.AddressLine2, address.Landmark].filter(Boolean).join(', '),
          city: address.City,
          state: address.State,
          pincode: address.Pincode
        },
        items: orderItems
      };

      try {
        // Check the carrier before creation. createShipment repeats this check
        // immediately before its create call, protecting against a race.
        const remote = await provider.findByExternalOrderId(order.OrderNumber);
        const recovered = await create(enriched, 'shiprocket', {
          correlationId,
          recovery: true,
          allowFallback: false,
          orderId: order.OrderID,
          shipmentId: shipment?.ShipmentID || ''
        });
        const result = {
          ...identity,
          shipmentId: recovered.ShipmentID,
          providerShipmentId: recovered.ProviderShipmentID,
          awb: recovered.AWBNumber,
          courier: recovered.CourierName,
          shippingStatus: recovered.ShippingStatus,
          pickupStatus: recovered.PickupStatus
        };
        if (remote || shipment?.ProviderShipmentID) report.duplicates.push({ ...result, reason: 'existing_shiprocket_shipment_reconciled' });
        else report.recovered.push(result);
        log.info('shipping.recovery.order_completed', {
          correlationId,
          ...result,
          reconciled: Boolean(remote || shipment?.ProviderShipmentID)
        });
      } catch (error) {
        report.failed.push({
          ...identity,
          code: error.code || 'SHIPMENT_RECOVERY_FAILED',
          providerStatus: error.providerStatus,
          providerCode: error.providerCode,
          providerBody: error.providerBody,
          validationErrors: error.validationErrors,
          validationFields: error.validationFields,
          error: error.message
        });
        log.error('shipping.recovery.order_failed', {
          correlationId,
          ...identity,
          code: error.code || 'SHIPMENT_RECOVERY_FAILED',
          providerStatus: error.providerStatus,
          providerCode: error.providerCode,
          providerBody: error.providerBody,
          validationErrors: error.validationErrors,
          validationFields: error.validationFields,
          retryable: Boolean(error.retryable),
          error: error.message
        });
      }
    }
  } finally {
    recoveryRunning = false;
  }

  report.counts = {
    recovered: report.recovered.length,
    failed: report.failed.length,
    skipped: report.skipped.length,
    duplicates: report.duplicates.length
  };
  log.info('shipping.recovery.completed', { correlationId, ...report.counts });
  return report;
}

export async function fetchLiveTracking(orderId, customerId) {
  const order = (await getRows('ORDERS')).find((row) => row.OrderID === orderId || row.OrderNumber === orderId);
  if (!order || (customerId && order.CustomerID !== customerId)) throw Object.assign(new Error('Order not found.'), { status: 404 });
  const shipment = (await getRows('SHIPMENTS')).find((row) => row.OrderID === order.OrderID);
  const timeline = (await getRows('ORDER_TRACKING')).filter((row) => row.OrderID === order.OrderID);
  let live = null;
  if (shipment?.AWBNumber && shippingProviders[shipment.Provider]?.configured()) live = await shippingProviders[shipment.Provider].tracking(shipment.AWBNumber).catch(() => null);
  return { order, shipment, tracking: timeline, live, provider: shipment?.Provider || 'pending' };
}

export async function cancelShipment(orderId) {
  const shipment = (await getRows('SHIPMENTS')).find((row) => row.OrderID === orderId || row.ShipmentID === orderId);
  if (!shipment) throw Object.assign(new Error('Shipment not found.'), { status: 404 });
  const provider = shippingProviders[shipment.Provider];
  if (!provider?.configured()) throw Object.assign(new Error(`${shipment.Provider} is not configured.`), { status: 503 });
  await provider.cancel(shipment.Provider === 'shiprocket' ? [Number(shipment.ProviderShipmentID)] : shipment.AWBNumber);
  shipment.ShippingStatus = 'Cancelled'; shipment.UpdatedAt = new Date().toISOString();
  await updateRow('SHIPMENTS', shipment._row, shipment);
  await appendRow('ORDER_TRACKING', { TrackingID: createId('tracking'), OrderID: shipment.OrderID, CurrentStatus: 'Cancelled', UpdatedBy: 'Admin', Remarks: `Cancelled with ${shipment.Provider}`, UpdatedAt: shipment.UpdatedAt, EstimatedDeliveryDate: '' });
  await logShippingActivity('Shipment Cancelled', { orderId: shipment.OrderID, shipmentId: shipment.ShipmentID, provider: shipment.Provider });
  return shipment;
}

const pendingShipment = (order, existing, provider, timestamp) => ({
  ...existing,
  _row: undefined,
  ShipmentID: existing?.ShipmentID || `shipment-${order.OrderID}`,
  OrderID: order.OrderID,
  Provider: provider || existing?.Provider || 'delhivery',
  ProviderShipmentID: existing?.ProviderShipmentID || '',
  AWBNumber: existing?.AWBNumber || '',
  TrackingNumber: existing?.TrackingNumber || existing?.AWBNumber || '',
  CourierName: existing?.CourierName || '',
  ShippingCharge: existing?.ShippingCharge || '',
  EstimatedDays: existing?.EstimatedDays || '',
  LabelURL: existing?.LabelURL || '',
  ManifestURL: existing?.ManifestURL || '',
  ShippingStatus: 'Retry Pending',
  PickupStatus: existing?.PickupStatus || 'Pending',
  PickupDate: existing?.PickupDate || '',
  DispatchDate: existing?.DispatchDate || '',
  DeliveryDate: existing?.DeliveryDate || '',
  LatestEvent: existing?.LatestEvent || 'Shipment Retry Pending',
  LatestEventAt: existing?.LatestEventAt || timestamp,
  TrackingStatusCode: existing?.TrackingStatusCode || '',
  WebhookEventId: existing?.WebhookEventId || '',
  TrackingURL: existing?.TrackingURL || '',
  CreatedAt: existing?.CreatedAt || timestamp,
  UpdatedAt: timestamp
});

const markShipmentPending = (order, provider, timestamp) =>
  order._row
    ? updateRow('ORDERS', order._row, { ...order, OrderStatus: 'Pending Shipment', ShippingProvider: provider || 'delhivery', ShippingStatus: 'Retry Pending', PickupStatus: 'Pending', ShippingUpdatedAt: timestamp }).catch(() => {})
    : Promise.resolve();

const orderToShiprocket = (order) => ({
  order_id: order.OrderNumber,
  order_date: order.CreatedAt,
  pickup_location: env.shiprocketPickupLocation,
  billing_customer_name: order.shippingAddress?.name,
  billing_address: order.shippingAddress?.addressLine,
  billing_city: order.shippingAddress?.city,
  billing_pincode: order.shippingAddress?.pincode,
  billing_state: order.shippingAddress?.state,
  billing_country: 'India',
  billing_email: order.email || '',
  billing_phone: order.shippingAddress?.phone,
  shipping_is_billing: true,
  order_items: (order.items || []).map((item) => ({
    name: item.name || item.productName || item.ProductName,
    sku: item.sku || item.productId || item.ProductID || item.id,
    units: Number(item.quantity || item.Quantity),
    selling_price: Number(item.price || item.Price)
  })),
  payment_method: order.PaymentMethod === 'Cash on Delivery' ? 'COD' : 'Prepaid',
  shipping_charges: Number(order.Shipping || 0),
  sub_total: Number(order.GrandTotal),
  length: 20,
  breadth: 15,
  height: 10,
  weight: order.weight || env.shippingWeightKg
});

const validateShiprocketOrderPayload = (payload) => {
  const validationErrors = {};
  const addError = (field, message) => {
    validationErrors[field] ||= [];
    validationErrors[field].push(message);
  };
  const requiredText = [
    'order_id',
    'order_date',
    'pickup_location',
    'billing_customer_name',
    'billing_phone',
    'billing_address',
    'billing_city',
    'billing_state',
    'billing_country',
    'payment_method'
  ];
  requiredText.forEach((field) => {
    if (!String(payload[field] ?? '').trim()) addError(field, `${field} is required.`);
  });
  if (typeof payload.order_date !== 'string') addError('order_date', 'order_date must be a string.');
  if (!/^\d{6}$/.test(String(payload.billing_pincode ?? ''))) addError('billing_pincode', 'billing_pincode must contain exactly 6 digits.');
  if (!['COD', 'Prepaid'].includes(payload.payment_method)) addError('payment_method', 'payment_method must be COD or Prepaid.');
  if (typeof payload.shipping_charges !== 'number' || !Number.isFinite(payload.shipping_charges) || payload.shipping_charges < 0) {
    addError('shipping_charges', 'shipping_charges must be a non-negative number.');
  }
  if (typeof payload.sub_total !== 'number' || !Number.isFinite(payload.sub_total) || payload.sub_total <= 0) {
    addError('sub_total', 'sub_total must be a positive number.');
  }
  for (const field of ['length', 'breadth', 'height', 'weight']) {
    if (typeof payload[field] !== 'number' || !Number.isFinite(payload[field]) || payload[field] <= 0) {
      addError(field, `${field} must be a positive number.`);
    }
  }
  if (!Array.isArray(payload.order_items) || !payload.order_items.length) addError('order_items', 'order_items must contain at least one item.');
  payload.order_items?.forEach((item, index) => {
    if (!String(item.name ?? '').trim()) addError(`order_items[${index}].name`, 'name is required.');
    if (!String(item.sku ?? '').trim()) addError(`order_items[${index}].sku`, 'sku is required.');
    if (typeof item.units !== 'number' || !Number.isInteger(item.units) || item.units <= 0) {
      addError(`order_items[${index}].units`, 'units must be a positive integer.');
    }
    if (typeof item.selling_price !== 'number' || !Number.isFinite(item.selling_price) || item.selling_price < 0) {
      addError(`order_items[${index}].selling_price`, 'selling_price must be a non-negative number.');
    }
  });
  const validationFields = Object.keys(validationErrors);
  if (validationFields.length) {
    throw Object.assign(new Error(`Shiprocket order payload is invalid: ${validationFields.join(', ')}`), {
      code: 'SHIPROCKET_ORDER_PAYLOAD_INVALID',
      retryable: false,
      safeToFallback: false,
      validationErrors,
      validationFields
    });
  }
};

const remoteOrderProjection = (remote) => {
  const shipment = remote.shipments?.[0] || remote.shipment || {};
  const awb = shipment.awb || shipment.awb_code || remote.awb || remote.awb_code || '';
  return {
    orderReference: String(remote.channel_order_id || remote.channel_order_number || ''),
    providerOrderId: remote.id || remote.order_id || '',
    providerShipmentId: shipment.id || shipment.shipment_id || remote.shipment_id || '',
    awb,
    courier: shipment.courier || shipment.courier_name || remote.courier_name || '',
    shippingStatus: shipment.status || remote.status || 'Shipment Created',
    pickupStatus: shipment.pickup_status || remote.pickup_status || 'Pending',
    estimatedDelivery: shipment.estimated_delivery || remote.estimated_delivery || '',
    labelUrl: shipment.label_url || remote.label_url || '',
    manifestUrl: shipment.manifest_url || remote.manifest_url || '',
    trackingUrl: awb ? shiprocketTrackingUrl(awb) : ''
  };
};

export async function syncShiprocketOrders(context = {}) {
  const provider = shippingProviders.shiprocket;
  if (!provider.configured()) {
    logger.info('shiprocket.sync.skipped', { ...context, reason: 'not_configured' });
    return { fetched: 0, inserted: 0, updated: 0, unmatched: 0 };
  }

  const configurationErrors = provider.configurationErrors();
  if (configurationErrors.length) {
    logger.warn('shiprocket.sync.skipped', { ...context, reason: 'invalid_configuration', errors: configurationErrors });
    return { fetched: 0, inserted: 0, updated: 0, unmatched: 0 };
  }

  const remoteOrders = [];
  let page = 1;
  let lastPage = 1;
  do {
    const result = await provider.listOrders(page, 100);
    remoteOrders.push(...result.orders);
    lastPage = Math.min(result.lastPage || page, 20);
    page += 1;
  } while (page <= lastPage);

  const [orders, payments, shipments] = await Promise.all([
    getRows('ORDERS'),
    getRows('PAYMENTS'),
    getRows('SHIPMENTS')
  ]);
  const paidOrderIds = new Set(payments.filter((payment) => payment.Status === 'Paid').map((payment) => payment.OrderID));
  let inserted = 0;
  let updated = 0;
  let unmatched = 0;

  for (const remote of remoteOrders) {
    const projection = remoteOrderProjection(remote);
    // Never import a carrier-side order into commerce. Only reconcile an
    // existing LitePuff order whose payment is already durable and Paid.
    const order = orders.find((row) =>
      paidOrderIds.has(row.OrderID) &&
      [row.OrderNumber, row.OrderID].map(String).includes(projection.orderReference)
    );
    if (!order) {
      unmatched += 1;
      continue;
    }
    let shipment = shipments.find((row) => row.OrderID === order.OrderID);
    const now = new Date().toISOString();
    const record = {
      ...pendingShipment(order, shipment, 'shiprocket', now),
      ...shipment,
      ShipmentID: shipment?.ShipmentID || `shipment-${order.OrderID}`,
      OrderID: order.OrderID,
      Provider: 'shiprocket',
      ProviderShipmentID: projection.providerShipmentId || shipment?.ProviderShipmentID || '',
      AWBNumber: projection.awb || shipment?.AWBNumber || '',
      TrackingNumber: projection.awb || shipment?.TrackingNumber || '',
      CourierName: projection.courier || shipment?.CourierName || '',
      TrackingURL: projection.trackingUrl || shipment?.TrackingURL || '',
      ShippingStatus: projection.shippingStatus || shipment?.ShippingStatus || 'Shipment Created',
      PickupStatus: projection.pickupStatus || shipment?.PickupStatus || 'Pending',
      LabelURL: projection.labelUrl || shipment?.LabelURL || '',
      ManifestURL: projection.manifestUrl || shipment?.ManifestURL || '',
      EstimatedDelivery: projection.estimatedDelivery || shipment?.EstimatedDelivery || order.EstimatedDelivery,
      LatestEvent: projection.shippingStatus || shipment?.LatestEvent || 'Shipment Reconciled',
      LatestEventAt: now,
      CreatedAt: shipment?.CreatedAt || now,
      UpdatedAt: now
    };
    if (shipment?._row) {
      await updateRow('SHIPMENTS', shipment._row, record);
      updated += 1;
    } else {
      await appendRow('SHIPMENTS', record);
      inserted += 1;
      shipment = record;
    }
    await mirrorShipmentToOrder(order, record);
  }

  logger.info('shiprocket.sync.completed', { ...context, fetched: remoteOrders.length, inserted, updated, unmatched });
  return { fetched: remoteOrders.length, inserted, updated, unmatched };
}
const orderToDelhivery = (order) => ({ name: order.shippingAddress?.name, add: order.shippingAddress?.addressLine, pin: order.shippingAddress?.pincode, city: order.shippingAddress?.city, state: order.shippingAddress?.state, country: 'India', phone: order.shippingAddress?.phone, order: order.OrderNumber, payment_mode: order.PaymentMethod === 'Cash on Delivery' ? 'COD' : 'Prepaid', total_amount: order.GrandTotal, products_desc: (order.items || []).map((item) => item.name || item.ProductName).join(', '), weight: Math.round((order.weight || env.shippingWeightKg) * 1000) });

let retryTimer;
let retryRunning = false;

export async function retryPendingShipments() {
  if (retryRunning) {
    logger.info('shipping.retry.skipped', { reason: 'already_running' });
    return;
  }
  retryRunning = true;
  try {
    await syncShiprocketOrders({ correlationId: 'shiprocket-periodic-sync' })
      .catch((error) => logger.warn('shiprocket.sync.failed', {
        providerStatus: error.providerStatus,
        providerCode: error.providerCode,
        providerBody: error.providerBody,
        retryable: Boolean(error.retryable),
        error: error.message
      }));
    const pending = (await getRows('SHIPMENTS'))
      .filter((row) => row.ShippingStatus === 'Retry Pending')
      .sort((a, b) => String(a.UpdatedAt).localeCompare(String(b.UpdatedAt)))
      .slice(0, 5);
    logger.info('shipping.retry.batch_started', { count: pending.length });
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
      const context = { correlationId: `shipping-retry-${shipment.ShipmentID}`, shipmentId: shipment.ShipmentID };
      logger.info('shipping.retry.attempt_started', { ...context, orderId: order.OrderID, provider: shipment.Provider });
      await createShipment(enriched, shipment.Provider || undefined, context)
        .then(() => logger.info('shipping.retry.attempt_completed', { ...context, orderId: order.OrderID, provider: shipment.Provider }))
        .catch((error) => logger.warn('shipping.retry.deferred', { ...context, orderId: order.OrderID, provider: shipment.Provider, code: error.code || 'SHIPPING_PROVIDER_FAILED' }));
    }
    logger.info('shipping.retry.batch_completed', { count: pending.length });
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
