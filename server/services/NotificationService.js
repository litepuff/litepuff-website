import { appendRow } from './googleSheets.js';
import { sendMail, emailTemplates } from './emailService.js';
import { getRows } from './googleSheets.js';
import { createId } from '../utils/createId.js';
import { logger } from '../utils/logger.js';

export class NotificationService {
  async audit({ customerId = '', orderId = '', channel = 'email', type, status, providerId = '', error = '' }) { try { await appendRow('NOTIFICATIONS', { NotificationID: createId('notification'), CustomerID: customerId, OrderID: orderId, Channel: channel, Type: type, Status: status, ProviderID: providerId, SentAt: status === 'sent' ? new Date().toISOString() : '', Error: String(error || '').slice(0, 300) }); } catch (auditError) { logger.warn('notification.audit.failed', { channel, type, code: auditError.code || 'NOTIFICATION_AUDIT_FAILED' }); } }
  async sendEmail({ to, template, attachments = [], customerId = '', orderId = '', type = 'transactional' }) { try { const result = await sendMail({ to, ...template, attachments }); await this.audit({ customerId, orderId, type, status: result?.skipped ? 'skipped' : 'sent', providerId: result?.id || result?.messageId || '' }); return result; } catch (error) { await this.audit({ customerId, orderId, type, status: 'failed', error: error.code || error.message }); throw error; } }
  async orderStatus(order, status) { const customer = (await getRows('CUSTOMERS')).find((row) => row.CustomerID === order.CustomerID); if (!customer?.Email) return { skipped: true }; return this.sendEmail({ to: customer.Email, template: emailTemplates.orderStatus(order, status), customerId: order.CustomerID, orderId: order.OrderID, type: `order_${String(status).toLowerCase().replaceAll(' ', '_')}` }); }
}
export const notificationService = new NotificationService();
