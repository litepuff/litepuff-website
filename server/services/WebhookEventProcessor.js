import { webhookEventRouter } from './WebhookEventRouter.js';
import { logger } from '../utils/logger.js';

export class WebhookEventProcessor {
  constructor({ router = webhookEventRouter, log = logger } = {}) { this.router = router; this.log = log; }
  async process(payload) {
    const eventCounts = {}; let processed = 0; let failed = 0;
    for (const entry of payload.entry || []) {
      for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
        try { const results = await this.router.route(change); for (const result of results) { eventCounts[result.type] = (eventCounts[result.type] || 0) + 1; processed += 1; } }
        catch (error) { failed += 1; this.log.error('whatsapp.webhook.event-failed', { field: change?.field || null, code: error.code || 'WHATSAPP_EVENT_PROCESSING_FAILED', error: error.message }); }
      }
    }
    return { eventCounts, processed, failed };
  }
}
export const webhookEventProcessor = new WebhookEventProcessor();
