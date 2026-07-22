import { whatsAppConfig } from '../config/WhatsAppConfig.js';
import { metaClient } from '../config/MetaClient.js';
import { whatsAppHealth } from '../health/WhatsAppHealth.js';
import { whatsAppMessagingService } from './WhatsAppMessagingService.js';
import { customerSessionService } from './CustomerSessionService.js';
import { conversationStateService } from './ConversationStateService.js';
import { campaignRepository } from '../repositories/CampaignRepository.js';
import { analyticsService } from './AnalyticsService.js';

export class WhatsAppHealthService {
  constructor({ config = whatsAppConfig, client = metaClient, health = whatsAppHealth, messaging = whatsAppMessagingService, sessions = customerSessionService, conversationState = conversationStateService, campaigns = campaignRepository, analytics = analyticsService } = {}) { Object.assign(this, { config, client, health, messaging, sessions, conversationState, campaigns, analytics }); }
  async conversationDiagnostics(enabled) { if (!enabled) return { conversationEngine: 'disabled', webhookStatus: 'waiting', sessionCount: 0, conversationCount: 0, lastIncomingMessage: this.health.lastIncomingMessage, lastEvent: this.health.lastEvent, parserStatus: this.health.parserStatus }; try { const [sessionCount, conversationCount] = await Promise.all([this.sessions.activeCount(), this.conversationState.activeCount()]); return { conversationEngine: 'ready', webhookStatus: this.health.lastWebhookReceived ? 'receiving' : 'waiting', sessionCount, conversationCount, lastIncomingMessage: this.health.lastIncomingMessage, lastEvent: this.health.lastEvent, parserStatus: this.health.parserStatus }; } catch { return { conversationEngine: 'degraded', webhookStatus: this.health.lastWebhookReceived ? 'receiving' : 'waiting', sessionCount: null, conversationCount: null, lastIncomingMessage: this.health.lastIncomingMessage, lastEvent: this.health.lastEvent, parserStatus: this.health.parserStatus }; } }
  async adminDiagnostics(enabled) { if (!enabled) return { dashboardStatus: 'disabled', analyticsStatus: 'disabled', campaignStatus: 'disabled', campaignCount: 0 }; try { const campaigns = await this.campaigns.list({ page: 1, limit: 1 }); await this.analytics.get(); return { dashboardStatus: 'ready', analyticsStatus: 'ready', campaignStatus: 'ready', campaignCount: campaigns.pagination.total }; } catch { return { dashboardStatus: 'degraded', analyticsStatus: 'degraded', campaignStatus: 'degraded', campaignCount: null }; } }
  async check({ probe = true } = {}) {
    const messaging = this.messaging.diagnostics();
    const conversation = await this.conversationDiagnostics(this.config.configured);
    const admin = await this.adminDiagnostics(this.config.configured);
    const common = { ...this.config.publicState(), signatureVerification: Boolean(this.config.metaAppSecret), messagingEnabled: messaging.enabled, queueStatus: messaging.queue, retryStatus: messaging.retry, templateCount: messaging.templateCount, lastSent: messaging.lastSent, lastFailure: messaging.lastFailure, lastWebhookReceived: this.health.lastWebhookReceived, ...conversation, ...admin, lastError: this.health.lastError };
    if (!this.config.configured) return { ...common, connected: false };
    if (probe) { try { await this.client.validateConnection(); this.health.connectionSucceeded(); } catch (error) { this.health.connectionFailed(error); } }
    return { ...common, connected: this.health.connected, signatureVerification: true };
  }
}
export const whatsAppHealthService = new WhatsAppHealthService();
