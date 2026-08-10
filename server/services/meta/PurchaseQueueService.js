import { appendRow, getRows, updateRow } from '../googleSheets.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { metaConversionService } from './MetaConversionService.js';
import { isCodPurchaseOrder, isOnlinePurchaseOrder, purchaseEventId } from './PurchasePolicy.js';

const CHANNEL = 'meta';
const TYPE = 'Purchase';
const RETRY_INTERVAL_MS = 60_000;
const MAX_RETRY_DELAY_MS = 60 * 60_000;
const locks = new Map();
let retryTimer;

const clean = (value) => String(value ?? '').trim();
const parseJson = (value, fallback = {}) => {
  try { return JSON.parse(value || '{}'); } catch { return fallback; }
};
const jobId = (orderId) => `meta-purchase-${clean(orderId)}`;
const nextRetryAt = (attempts) => new Date(Date.now() + Math.min(
  MAX_RETRY_DELAY_MS,
  RETRY_INTERVAL_MS * (2 ** Math.max(0, attempts - 1)),
)).toISOString();
const withLock = (key, task) => {
  if (locks.has(key)) return locks.get(key);
  const operation = Promise.resolve().then(task).finally(() => locks.delete(key));
  locks.set(key, operation);
  return operation;
};

export class PurchaseQueueService {
  constructor({
    sheets = { appendRow, getRows, updateRow },
    meta = metaConversionService,
    clientUrl = env.clientUrl,
    log = logger,
  } = {}) {
    this.sheets = sheets;
    this.meta = meta;
    this.clientUrl = clientUrl;
    this.log = log;
  }

  async context(orderId) {
    const [orders, items, payments, customers, addresses, jobs] = await Promise.all([
      this.sheets.getRows('ORDERS'),
      this.sheets.getRows('ORDER_ITEMS'),
      this.sheets.getRows('PAYMENTS'),
      this.sheets.getRows('CUSTOMERS'),
      this.sheets.getRows('ADDRESSES'),
      this.sheets.getRows('NOTIFICATIONS'),
    ]);
    const order = orders.find((row) => row.OrderID === orderId);
    const payment = payments.find((row) => row.OrderID === orderId);
    return {
      order,
      payment,
      items: items.filter((row) => row.OrderID === orderId),
      customer: customers.find((row) => row.CustomerID === order?.CustomerID),
      address: addresses.find((row) => row.AddressID === order?.AddressID),
      job: jobs.find((row) => row.NotificationID === jobId(orderId)),
    };
  }

  eligible(order, payment) {
    return Boolean(order && payment && (
      isCodPurchaseOrder(order) || isOnlinePurchaseOrder(order, payment)
    ));
  }

  async enqueue(orderId, attribution = {}, requestContext = {}) {
    return withLock(jobId(orderId), async () => {
      const records = await this.context(orderId);
      if (!this.eligible(records.order, records.payment)) {
        return { queued: false, reason: 'purchase_not_eligible' };
      }
      if (records.job) return { queued: true, replay: true, job: records.job };
      const eventId = purchaseEventId(orderId);
      const createdAt = new Date().toISOString();
      const numItems = records.items.reduce(
        (sum, item) => sum + Math.max(1, Number(item.Quantity || 1)),
        0,
      );
      const metadata = {
        eventName: TYPE,
        eventId,
        eventTime: Math.floor(Date.now() / 1000),
        eventSourceUrl: `${this.clientUrl}/order-success/${records.order.OrderID}`,
        value: Number(records.order.GrandTotal || records.payment.Amount || 0),
        currency: 'INR',
        contentIds: records.items.map((item) => clean(item.MetaCatalogID)).filter(Boolean),
        contentName: records.items.map((item) => clean(item.ProductName)).filter(Boolean).join(', '),
        numItems,
        attribution: {
          fbp: clean(attribution.fbp),
          fbc: clean(attribution.fbc),
          clientIp: clean(attribution.clientIp),
          clientUserAgent: clean(attribution.clientUserAgent),
        },
      };
      if (metadata.contentIds.length !== records.items.length) {
        this.log.warn('meta.purchase.catalog_id_missing', {
          ...requestContext,
          orderId,
          missingCount: records.items.length - metadata.contentIds.length,
        });
      }
      const job = {
        NotificationID: jobId(orderId),
        CustomerID: records.order.CustomerID,
        OrderID: records.order.OrderID,
        Channel: CHANNEL,
        Type: TYPE,
        Status: 'pending',
        ProviderID: '',
        SentAt: '',
        Error: '',
        Title: eventId,
        Message: JSON.stringify({ value: metadata.value, currency: metadata.currency }),
        DeepLink: metadata.eventSourceUrl,
        IsRead: false,
        CreatedAt: createdAt,
        ReadAt: '',
        Attempts: 0,
        NextAttemptAt: createdAt,
        Metadata: JSON.stringify(metadata),
      };
      await this.sheets.appendRow('NOTIFICATIONS', job);
      this.log.info('meta.purchase.queued', { ...requestContext, orderId, eventId });
      return { queued: true, replay: false, job };
    });
  }

  async deliver(orderId, requestContext = {}) {
    return withLock(`deliver-${jobId(orderId)}`, async () => {
      const records = await this.context(orderId);
      if (!records.job || !this.eligible(records.order, records.payment)) {
        return { sent: false, skipped: true, reason: 'purchase_not_queued_or_eligible' };
      }
      if (records.job.Status === 'sent') {
        return { sent: true, replay: true, eventId: purchaseEventId(orderId) };
      }
      const metadata = parseJson(records.job.Metadata);
      const contents = records.items.filter((item) => clean(item.MetaCatalogID)).map((item) => ({
        id: clean(item.MetaCatalogID),
        quantity: Math.max(1, Number(item.Quantity || 1)),
        item_price: Number(item.Price || 0),
      }));
      let result;
      try {
        result = await this.meta.purchase({
          eventId: metadata.eventId || purchaseEventId(orderId),
          eventTime: metadata.eventTime,
          eventSourceUrl: metadata.eventSourceUrl,
          userData: {
            externalId: records.order.CustomerID,
            email: records.customer?.Email,
            phone: records.address?.Phone || records.customer?.Phone,
            firstName: records.customer?.FirstName,
            lastName: records.customer?.LastName,
            city: records.address?.City,
            state: records.address?.State,
            country: records.address?.Country,
            zip: records.address?.Pincode,
            fbp: metadata.attribution?.fbp,
            fbc: metadata.attribution?.fbc,
            clientIp: metadata.attribution?.clientIp,
            clientUserAgent: metadata.attribution?.clientUserAgent,
          },
          customData: {
            order_id: records.order.OrderID,
            content_ids: contents.map((item) => item.id),
            content_type: 'product',
            contents,
            content_name: metadata.contentName,
            num_items: Number(metadata.numItems || contents.reduce((sum, item) => sum + item.quantity, 0)),
            value: Number(metadata.value),
            currency: 'INR',
          },
        }, requestContext);
      } catch (error) {
        result = { sent: false, error: error?.message || String(error) };
      }
      const attempts = Number(records.job.Attempts || 0) + 1;
      const sent = result.sent === true;
      const updated = {
        ...records.job,
        Status: sent ? 'sent' : 'retry_pending',
        ProviderID: sent ? clean(result.response?.fbtrace_id) : records.job.ProviderID,
        SentAt: sent ? new Date().toISOString() : '',
        Error: sent ? '' : clean(result.reason || result.error || `http_${result.status || 'unknown'}`),
        Attempts: attempts,
        NextAttemptAt: sent ? '' : nextRetryAt(attempts),
      };
      await this.sheets.updateRow('NOTIFICATIONS', records.job._row, updated);
      return { ...result, eventId: metadata.eventId, job: updated };
    });
  }

  async enqueueAndDeliver(orderId, attribution = {}, requestContext = {}) {
    const queued = await this.enqueue(orderId, attribution, requestContext);
    if (!queued.queued) return queued;
    return this.deliver(orderId, requestContext);
  }

  async retryPending() {
    const jobs = await this.sheets.getRows('NOTIFICATIONS');
    const now = Date.now();
    const due = jobs.filter((job) => (
      job.Channel === CHANNEL &&
      job.Type === TYPE &&
      job.Status !== 'sent' &&
      new Date(job.NextAttemptAt || 0).getTime() <= now
    ));
    return Promise.allSettled(due.map((job) => this.deliver(job.OrderID, {
      correlationId: `meta-purchase-retry-${job.OrderID}`,
    })));
  }
}

export const purchaseQueueService = new PurchaseQueueService();

export async function safelyQueuePurchase(orderId, attribution = {}, context = {}) {
  try {
    return await purchaseQueueService.enqueueAndDeliver(orderId, attribution, context);
  } catch (error) {
    logger.error('meta.purchase.queue_failed', {
      ...context,
      orderId,
      error: error?.message || String(error),
    });
    return { sent: false, skipped: true, reason: 'queue_failure' };
  }
}

export function startPurchaseRetryWorker() {
  if (retryTimer) return retryTimer;
  void purchaseQueueService.retryPending().catch((error) =>
    logger.warn('meta.purchase.retry_worker.failed', { error: error?.message || String(error) }));
  retryTimer = setInterval(() => purchaseQueueService.retryPending().catch((error) =>
    logger.warn('meta.purchase.retry_worker.failed', { error: error?.message || String(error) })), RETRY_INTERVAL_MS);
  retryTimer.unref?.();
  return retryTimer;
}
