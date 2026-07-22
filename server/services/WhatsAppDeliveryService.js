import crypto from 'crypto';

export const WHATSAPP_DELIVERY_STATUS = Object.freeze({ QUEUED: 'queued', SENT: 'sent', DELIVERED: 'delivered', READ: 'read', FAILED: 'failed', RETRYING: 'retrying' });

export class WhatsAppDeliveryService {
  constructor({ clock = () => new Date(), limit = 1000 } = {}) { this.clock = clock; this.limit = limit; this.records = new Map(); this.providerIndex = new Map(); this.lastSent = null; this.lastFailure = null; }
  create(type) { const now = this.clock().toISOString(); const record = { deliveryId: crypto.randomUUID(), type, status: WHATSAPP_DELIVERY_STATUS.QUEUED, queuedAt: now, sentAt: null, deliveredAt: null, readAt: null, failedAt: null, retryingAt: null, providerMessageId: null, attempts: 0, errorCode: null }; this.records.set(record.deliveryId, record); this.trim(); return { ...record }; }
  update(deliveryId, status, metadata = {}) { const record = this.records.get(deliveryId); if (!record) return null; const now = this.clock().toISOString(); Object.assign(record, metadata, { status }); if (status === 'sent') { record.sentAt = now; this.lastSent = now; } if (status === 'delivered') record.deliveredAt = now; if (status === 'read') record.readAt = now; if (status === 'failed') { record.failedAt = now; this.lastFailure = now; } if (status === 'retrying') record.retryingAt = now; if (record.providerMessageId) this.providerIndex.set(record.providerMessageId, deliveryId); return { ...record }; }
  markRetrying(id, attempts) { return this.update(id, WHATSAPP_DELIVERY_STATUS.RETRYING, { attempts }); }
  markSent(id, providerMessageId, attempts) { return this.update(id, WHATSAPP_DELIVERY_STATUS.SENT, { providerMessageId, attempts, errorCode: null }); }
  markFailed(id, error, attempts) { return this.update(id, WHATSAPP_DELIVERY_STATUS.FAILED, { attempts, errorCode: error?.code || 'WHATSAPP_DELIVERY_FAILED' }); }
  updateByProviderMessageId(providerMessageId, status) { const id = this.providerIndex.get(providerMessageId); return id ? this.update(id, status) : null; }
  get(id) { const record = this.records.get(id); return record ? { ...record } : null; }
  diagnostics() { return { tracked: this.records.size, lastSent: this.lastSent, lastFailure: this.lastFailure }; }
  trim() { while (this.records.size > this.limit) this.records.delete(this.records.keys().next().value); }
}
export const whatsAppDeliveryService = new WhatsAppDeliveryService();
