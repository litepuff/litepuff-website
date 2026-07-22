import { analyticsRepository } from '../repositories/AnalyticsRepository.js';
import { SHEET_NAMES } from '../config/sheets.js';
import { conversationAnalytics } from './ConversationAnalytics.js';
import { deliveryAnalytics } from './DeliveryAnalytics.js';
import { campaignAnalytics } from './CampaignAnalytics.js';
import { customerAnalytics } from './CustomerAnalytics.js';

const since = (days) => Date.now() - days * 86400000;
export class AnalyticsService {
  constructor({ repository = analyticsRepository } = {}) { this.repository = repository; }
  async get() { const data = await this.repository.snapshot(); const messages = data[SHEET_NAMES.WHATSAPP_MESSAGES].rows.filter((row) => !row.DeletedAt); const responseTimes = messages.filter((row) => row.Direction === 'outbound').map((row) => new Date(row.SentAt || row.CreatedAt).getTime() - new Date(row.CreatedAt).getTime()).filter((value) => value >= 0); return { ...deliveryAnalytics.summarize(messages), ...conversationAnalytics.summarize(data[SHEET_NAMES.WHATSAPP_CONVERSATIONS].rows), campaignPerformance: campaignAnalytics.summarize(data[SHEET_NAMES.WHATSAPP_CAMPAIGNS].rows), customerGrowth: customerAnalytics.summarize(data[SHEET_NAMES.CUSTOMERS].rows), messagesToday: messages.filter((row) => new Date(row.CreatedAt).getTime() >= since(1)).length, messagesThisWeek: messages.filter((row) => new Date(row.CreatedAt).getTime() >= since(7)).length, messagesThisMonth: messages.filter((row) => new Date(row.CreatedAt).getTime() >= since(30)).length, averageResponseTimeMs: responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0 }; }
}
export const analyticsService = new AnalyticsService();
