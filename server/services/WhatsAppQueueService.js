import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export class ImmediateQueueAdapter { async enqueue(job) { return job(); } }
export class WhatsAppQueueService {
  constructor({ adapter = new ImmediateQueueAdapter(), log = logger } = {}) { this.adapter = adapter; this.log = log; this.pending = 0; this.processed = 0; this.failed = 0; }
  async enqueue(handler, metadata = {}) { const jobId = crypto.randomUUID(); this.pending += 1; this.log.info('whatsapp.message.queued', { jobId, messageType: metadata.type }); try { const result = await this.adapter.enqueue(handler, { jobId, metadata }); this.processed += 1; return result; } catch (error) { this.failed += 1; throw error; } finally { this.pending -= 1; } }
  diagnostics() { return { adapter: this.adapter.constructor.name, mode: 'immediate', healthy: true, pending: this.pending, processed: this.processed, failed: this.failed }; }
}
export const whatsAppQueueService = new WhatsAppQueueService();
