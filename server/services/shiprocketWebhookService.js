import crypto from 'crypto';
import { getRows, updateRow, appendRow } from './googleSheets.js';
import { logger } from '../utils/logger.js';
import { notificationService } from './NotificationService.js';

const STATUS_MAP = new Map([
  ['shipment created', { shipment: 'Shipment Created', order: 'Confirmed' }],
  ['pickup scheduled', { shipment: 'Pickup Scheduled', order: 'Ready for Dispatch', pickup: true }],
  ['pickup completed', { shipment: 'Picked Up', order: 'Shipped', dispatch: true }],
  ['picked up', { shipment: 'Picked Up', order: 'Shipped', dispatch: true }],
  ['in transit', { shipment: 'In Transit', order: 'Shipped', dispatch: true }],
  ['out for delivery', { shipment: 'Out for Delivery', order: 'Out for Delivery', dispatch: true }],
  ['delivered', { shipment: 'Delivered', order: 'Delivered', delivery: true }],
  ['cancelled', { shipment: 'Cancelled', order: 'Cancelled' }],
  ['canceled', { shipment: 'Cancelled', order: 'Cancelled' }],
  ['delivery failed', { shipment: 'Delivery Failed' }],
  ['ndr', { shipment: 'NDR' }],
  ['ndr raised', { shipment: 'NDR' }],
  ['rto initiated', { shipment: 'RTO Initiated', order: 'Returned' }],
  ['rto delivered', { shipment: 'RTO Delivered', order: 'Returned', delivery: true }],
]);

const ORDER_RANK = new Map([
  ['Pending', 0],
  ['Confirmed', 1],
  ['Packed', 2],
  ['Ready for Dispatch', 3],
  ['Shipped', 4],
  ['Out for Delivery', 5],
  ['Delivered', 6],
]);

const clean = (value) => String(value || '').trim();
const normalizedStatus = (value) => clean(value).toLowerCase().replaceAll('_', ' ').replace(/\s+/g, ' ');
const eventHash = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 24);
const safeTimestamp = (value) => {
  const parsed = new Date(value || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

function normalize(payload = {}) {
  const statusValue = payload.current_status || payload.status || payload.shipment_status || payload.event;
  const status = STATUS_MAP.get(normalizedStatus(statusValue));
  const awb = clean(payload.awb || payload.awb_code || payload.tracking_number);
  const providerShipmentId = clean(payload.shipment_id || payload.shipmentId);
  const orderReference = clean(payload.channel_order_id || payload.order_id || payload.orderId);
  const timestamp = safeTimestamp(payload.current_timestamp || payload.event_timestamp || payload.updated_at || payload.timestamp || payload.scan_datetime);
  const statusCode = clean(payload.current_status_id || payload.status_code || payload.shipment_status_id);
  const courier = clean(payload.courier_name || payload.courier || payload.sr_courier_name);
  const description = clean(payload.activity || payload.status_description || payload.scan || payload.current_status || payload.status || statusValue);
  const explicitEventId = clean(payload.webhook_event_id || payload.event_id || payload.id);
  const eventId = explicitEventId || eventHash([providerShipmentId, awb, normalizedStatus(statusValue), timestamp, description].join('|'));
  return { status, statusValue: clean(statusValue), awb, providerShipmentId, orderReference, timestamp, statusCode, courier, description, eventId };
}

function nextOrderStatus(current, proposed) {
  if (!proposed) return current;
  if (['Cancelled', 'Returned'].includes(proposed)) return proposed;
  const currentRank = ORDER_RANK.get(current);
  const proposedRank = ORDER_RANK.get(proposed);
  if (currentRank === undefined || proposedRank === undefined) return current || proposed;
  return proposedRank >= currentRank ? proposed : current;
}

export class ShiprocketWebhookService {
  constructor({ sheets = { getRows, updateRow, appendRow }, log = logger, notifier = null } = {}) {
    this.sheets = sheets;
    this.log = log;
    this.notifier = notifier;
  }

  async process(payload, context = {}) {
    const event = normalize(payload);
    this.log.info('shipping.webhook.received', { ...context, webhookEventId: event.eventId, providerShipmentId: event.providerShipmentId, awb: event.awb, status: event.statusValue });
    if (!event.status || (!event.awb && !event.providerShipmentId && !event.orderReference)) {
      const error = new Error('Unsupported or malformed shipping webhook event.');
      error.status = 400;
      error.code = 'SHIPPING_WEBHOOK_INVALID';
      throw error;
    }

    const [shipments, orders, tracking] = await Promise.all([this.sheets.getRows('SHIPMENTS'), this.sheets.getRows('ORDERS'), this.sheets.getRows('ORDER_TRACKING')]);
    let shipment = shipments.find((row) =>
      (event.awb && [row.AWBNumber, row.TrackingNumber].map(clean).includes(event.awb)) ||
      (event.providerShipmentId && clean(row.ProviderShipmentID) === event.providerShipmentId)
    );
    let order = shipment ? orders.find((row) => row.OrderID === shipment.OrderID) : null;
    if (!order && event.orderReference) {
      order = orders.find((row) => [row.OrderID, row.OrderNumber].map(clean).includes(event.orderReference));
      shipment = order ? shipments.find((row) => row.OrderID === order.OrderID) : null;
    }
    if (!shipment || !order) {
      this.log.warn('shipping.webhook.shipment_not_found', { ...context, webhookEventId: event.eventId, providerShipmentId: event.providerShipmentId, awb: event.awb, orderReference: event.orderReference });
      return { received: true, matched: false, replay: false };
    }

    const trackingId = `tracking-shipping-${eventHash(`${shipment.ShipmentID}|${event.eventId}`)}`;
    if (shipment.WebhookEventId === event.eventId || tracking.some((row) => row.TrackingID === trackingId)) {
      this.log.info('shipping.webhook.replayed', { ...context, orderId: order.OrderID, shipmentId: shipment.ShipmentID, providerShipmentId: shipment.ProviderShipmentID, awb: shipment.AWBNumber, webhookEventId: event.eventId });
      return { received: true, matched: true, replay: true };
    }

    const stale = shipment.LatestEventAt && new Date(event.timestamp).getTime() < new Date(shipment.LatestEventAt).getTime();
    const updatedAt = new Date().toISOString();
    const updatedShipment = {
      ...shipment,
      Provider: 'shiprocket',
      ProviderShipmentID: event.providerShipmentId || shipment.ProviderShipmentID,
      AWBNumber: event.awb || shipment.AWBNumber,
      TrackingNumber: event.awb || shipment.TrackingNumber || shipment.AWBNumber,
      CourierName: event.courier || shipment.CourierName,
      TrackingURL: (event.awb || shipment.AWBNumber) ? `https://shiprocket.co/tracking/${encodeURIComponent(event.awb || shipment.AWBNumber)}` : shipment.TrackingURL,
      ShippingStatus: stale ? shipment.ShippingStatus : event.status.shipment,
      PickupStatus: stale ? shipment.PickupStatus : event.status.pickup ? event.status.shipment : shipment.PickupStatus,
      PickupDate: shipment.PickupDate || (event.status.pickup ? event.timestamp : ''),
      DispatchDate: shipment.DispatchDate || (event.status.dispatch ? event.timestamp : ''),
      DeliveryDate: shipment.DeliveryDate || (event.status.delivery ? event.timestamp : ''),
      LatestEvent: stale ? shipment.LatestEvent : event.description || event.status.shipment,
      LatestEventAt: stale ? shipment.LatestEventAt : event.timestamp,
      TrackingStatusCode: stale ? shipment.TrackingStatusCode : event.statusCode,
      WebhookEventId: event.eventId,
      UpdatedAt: updatedAt,
    };
    await this.sheets.updateRow('SHIPMENTS', shipment._row, updatedShipment);

    const updatedOrder = {
      ...order,
      OrderStatus: stale ? order.OrderStatus : nextOrderStatus(order.OrderStatus, event.status.order),
      TrackingNumber: updatedShipment.TrackingNumber || order.TrackingNumber,
      ShippingProvider: 'shiprocket',
      ShipmentID: updatedShipment.ShipmentID,
      AWBNumber: updatedShipment.AWBNumber,
      CourierName: updatedShipment.CourierName,
      TrackingURL: updatedShipment.TrackingURL,
      ShippingStatus: updatedShipment.ShippingStatus,
      PickupStatus: updatedShipment.PickupStatus,
      LabelURL: updatedShipment.LabelURL,
      ManifestURL: updatedShipment.ManifestURL,
      ShippingCreatedAt: updatedShipment.CreatedAt,
      ShippingUpdatedAt: updatedAt,
      UpdatedAt: updatedAt,
    };
    await this.sheets.updateRow('ORDERS', order._row, updatedOrder);
    await this.sheets.appendRow('ORDER_TRACKING', {
      TrackingID: trackingId,
      OrderID: order.OrderID,
      CurrentStatus: event.status.shipment,
      UpdatedBy: 'shiprocket',
      Remarks: `${event.description || event.status.shipment} · ${event.providerShipmentId || updatedShipment.ProviderShipmentID || event.awb}`,
      UpdatedAt: event.timestamp,
      EstimatedDeliveryDate: order.EstimatedDelivery,
    });
    if (!stale && event.status.order) {
      this.notifier?.orderStatus(updatedOrder, updatedOrder.OrderStatus).catch((error) =>
        this.log.warn('shipping.webhook.notification_failed', { ...context, orderId: order.OrderID, code: error.code || 'NOTIFICATION_FAILED' })
      );
    }

    this.log.info('shipping.webhook.processed', { ...context, orderId: order.OrderID, shipmentId: shipment.ShipmentID, providerShipmentId: updatedShipment.ProviderShipmentID, awb: updatedShipment.AWBNumber, webhookEventId: event.eventId, status: event.status.shipment, stale });
    if (event.status.shipment === 'Delivered') this.log.info('shipping.shipment.delivered', { ...context, orderId: order.OrderID, shipmentId: shipment.ShipmentID, providerShipmentId: updatedShipment.ProviderShipmentID, awb: updatedShipment.AWBNumber });
    if (event.status.shipment.startsWith('RTO')) this.log.warn('shipping.shipment.rto', { ...context, orderId: order.OrderID, shipmentId: shipment.ShipmentID, providerShipmentId: updatedShipment.ProviderShipmentID, awb: updatedShipment.AWBNumber, status: event.status.shipment });
    if (event.status.shipment === 'NDR') this.log.warn('shipping.shipment.ndr', { ...context, orderId: order.OrderID, shipmentId: shipment.ShipmentID, providerShipmentId: updatedShipment.ProviderShipmentID, awb: updatedShipment.AWBNumber });
    return { received: true, matched: true, replay: false, stale, orderId: order.OrderID, shipmentId: shipment.ShipmentID };
  }
}

export const shiprocketWebhookService = new ShiprocketWebhookService({ notifier: notificationService });
