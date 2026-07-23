import { appendRow, getRows, updateRow } from './googleSheets.js';
import { sendMail, emailTemplates } from './emailService.js';
import { createId } from '../utils/createId.js';
import { logger } from '../utils/logger.js';

const now = () => new Date().toISOString();
const typeLabel = (type) => String(type || 'Update').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function notificationRecord(input) {
  return {
    NotificationID: input.notificationId || createId('notification'),
    CustomerID: input.customerId || '',
    OrderID: input.orderId || '',
    Channel: input.channel || 'website',
    Type: input.type || 'transactional',
    Status: input.status || 'unread',
    ProviderID: input.providerId || '',
    SentAt: input.sentAt || '',
    Error: String(input.error || '').slice(0, 300),
    Title: input.title || typeLabel(input.type),
    Message: String(input.message || '').slice(0, 1_000),
    DeepLink: input.deepLink || '',
    IsRead: String(Boolean(input.isRead)),
    CreatedAt: input.createdAt || now(),
    ReadAt: input.readAt || '',
    Attempts: Number(input.attempts || 0),
    NextAttemptAt: input.nextAttemptAt || '',
    Metadata: typeof input.metadata === 'string' ? input.metadata : JSON.stringify(input.metadata || {})
  };
}

export class NotificationService {
  async createWebsite(input) {
    if (!input.customerId) return { skipped: true };
    const record = notificationRecord({ ...input, channel: 'website', status: 'unread' });
    await appendRow('NOTIFICATIONS', record);
    return record;
  }

  async list(customerId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const normalizedPage = Math.max(1, Number(page) || 1);
    let rows = (await getRows('NOTIFICATIONS'))
      .filter((row) => row.CustomerID === customerId && row.Channel === 'website')
      .sort((a, b) => String(b.CreatedAt).localeCompare(String(a.CreatedAt)));
    if (unreadOnly) rows = rows.filter((row) => String(row.IsRead).toLowerCase() !== 'true');
    const total = rows.length;
    return {
      notifications: rows.slice((normalizedPage - 1) * normalizedLimit, normalizedPage * normalizedLimit),
      unreadCount: rows.filter((row) => String(row.IsRead).toLowerCase() !== 'true').length,
      pagination: { page: normalizedPage, limit: normalizedLimit, total, pages: Math.max(1, Math.ceil(total / normalizedLimit)) }
    };
  }

  async markRead(customerId, notificationId) {
    const row = (await getRows('NOTIFICATIONS')).find((item) => item.NotificationID === notificationId && item.CustomerID === customerId && item.Channel === 'website');
    if (!row) throw Object.assign(new Error('Notification not found.'), { status: 404 });
    if (String(row.IsRead).toLowerCase() !== 'true') {
      row.IsRead = 'true';
      row.Status = 'read';
      row.ReadAt = now();
      await updateRow('NOTIFICATIONS', row._row, row);
    }
    return row;
  }

  async markAllRead(customerId) {
    const rows = (await getRows('NOTIFICATIONS')).filter((item) => item.CustomerID === customerId && item.Channel === 'website' && String(item.IsRead).toLowerCase() !== 'true');
    await Promise.all(rows.map((row) => this.markRead(customerId, row.NotificationID)));
    return rows.length;
  }

  async sendEmail({ to, template, attachments = [], customerId = '', orderId = '', type = 'transactional' }) {
    const record = notificationRecord({
      customerId, orderId, channel: 'email', type, status: 'queued',
      title: template.subject, message: template.subject, attempts: 0,
      metadata: { to, subject: template.subject, html: String(template.html || '').slice(0, 40_000) }
    });
    await appendRow('NOTIFICATIONS', record).catch((error) => logger.warn('notification.queue.audit-failed', { type, code: error.code || 'NOTIFICATION_AUDIT_FAILED' }));
    try {
      const result = await sendMail({ to, ...template, attachments });
      const saved = (await getRows('NOTIFICATIONS')).find((row) => row.NotificationID === record.NotificationID);
      if (saved) await updateRow('NOTIFICATIONS', saved._row, { ...saved, Status: result?.skipped ? 'skipped' : 'sent', ProviderID: result?.id || result?.messageId || '', SentAt: now(), Attempts: 1, Error: '', NextAttemptAt: '' });
      return result;
    } catch (error) {
      const saved = (await getRows('NOTIFICATIONS')).find((row) => row.NotificationID === record.NotificationID);
      if (saved) await updateRow('NOTIFICATIONS', saved._row, { ...saved, Status: 'retry_pending', Error: error.code || error.message, Attempts: 1, NextAttemptAt: new Date(Date.now() + 60_000).toISOString() }).catch(() => {});
      logger.warn('notification.delivery.deferred', { customerId, orderId, type, code: error.code || 'NOTIFICATION_DELIVERY_FAILED' });
      return { queuedForRetry: true };
    }
  }

  async orderStatus(order, status) {
    const customer = (await getRows('CUSTOMERS')).find((row) => row.CustomerID === order.CustomerID);
    const type = `order_${String(status).toLowerCase().replaceAll(' ', '_')}`;
    const message = `Order ${order.OrderNumber || order.OrderID} is now ${status}.`;
    const tasks = [
      this.createWebsite({ customerId: order.CustomerID, orderId: order.OrderID, type, title: `Order ${status}`, message, deepLink: `/account/orders/${order.OrderID}` })
    ];
    if (customer?.Email) tasks.push(this.sendEmail({ to: customer.Email, template: emailTemplates.orderStatus(order, status), customerId: order.CustomerID, orderId: order.OrderID, type }));
    return Promise.allSettled(tasks);
  }
}

export const notificationService = new NotificationService();

let retryTimer;
let retryRunning = false;

export async function retryPendingNotifications() {
  if (retryRunning) return;
  retryRunning = true;
  try {
    const currentTime = Date.now();
    const pending = (await getRows('NOTIFICATIONS'))
      .filter((row) => row.Channel === 'email' && row.Status === 'retry_pending' && Number(row.Attempts || 0) < 5 && new Date(row.NextAttemptAt || 0).getTime() <= currentTime)
      .sort((a, b) => String(a.NextAttemptAt).localeCompare(String(b.NextAttemptAt)))
      .slice(0, 10);
    for (const row of pending) {
      let metadata = {};
      try { metadata = JSON.parse(row.Metadata || '{}'); } catch {}
      const attempts = Number(row.Attempts || 0) + 1;
      try {
        const result = await sendMail({ to: metadata.to, subject: metadata.subject || row.Title, html: metadata.html || `<p>${row.Message}</p>` });
        await updateRow('NOTIFICATIONS', row._row, { ...row, Status: result?.skipped ? 'skipped' : 'sent', ProviderID: result?.id || result?.messageId || '', SentAt: now(), Error: '', Attempts: attempts, NextAttemptAt: '' });
      } catch (error) {
        const exhausted = attempts >= 5;
        await updateRow('NOTIFICATIONS', row._row, { ...row, Status: exhausted ? 'failed' : 'retry_pending', Error: error.code || error.message, Attempts: attempts, NextAttemptAt: exhausted ? '' : new Date(Date.now() + Math.min(60 * 60_000, 60_000 * (2 ** (attempts - 1)))).toISOString() }).catch(() => {});
      }
    }
  } finally {
    retryRunning = false;
  }
}

export function startNotificationRetryWorker() {
  if (retryTimer) return retryTimer;
  const interval = Math.max(60_000, Number(process.env.NOTIFICATION_RETRY_INTERVAL_MS || 300_000));
  retryTimer = setInterval(() => retryPendingNotifications().catch((error) => logger.warn('notification.retry-worker.failed', { code: error.code || 'NOTIFICATION_RETRY_WORKER_FAILED' })), interval);
  retryTimer.unref?.();
  return retryTimer;
}
