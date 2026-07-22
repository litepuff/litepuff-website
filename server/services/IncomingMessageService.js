import { customerBusinessService } from './business/CustomerService.js';
import { googleSheetsService } from './GoogleSheetsService.js';
import { SHEET_NAMES } from '../config/sheets.js';
import { customerSessionService } from './CustomerSessionService.js';
import { conversationEngine } from './ConversationEngine.js';
import { whatsAppHealth } from '../health/WhatsAppHealth.js';
import { logger } from '../utils/logger.js';
import { MessageRepository, messageRepository } from '../repositories/MessageRepository.js';
import { ConversationRepository, conversationRepository } from '../repositories/ConversationRepository.js';

export class IncomingMessageService {
  constructor({ customers = customerBusinessService, sheets = googleSheetsService, sessions = customerSessionService, engine = conversationEngine, health = whatsAppHealth, log = logger, messages, conversations } = {}) { Object.assign(this, { customers, sheets, sessions, engine, health, log }); this.messages = messages || new MessageRepository({ sheets }); this.conversations = conversations || new ConversationRepository({ sheets }); this.phoneLocks = new Map(); }
  async customerContext(phone) { const customer = await this.customers.findByPhone(phone); if (!customer) return { customer: null, orderHistory: [], authenticated: false }; const result = await this.sheets.readRows(SHEET_NAMES.ORDERS, { filter: (row) => row.CustomerID === customer.CustomerID, sort: { field: 'CreatedAt', direction: 'desc' }, pagination: { page: 1, limit: 5 } }); return { customer, orderHistory: result.rows.map((order) => ({ orderId: order.OrderID, orderNumber: order.OrderNumber, status: order.OrderStatus })), authenticated: String(customer.PhoneVerified).toLowerCase() === 'true' && String(customer.Status).toLowerCase() === 'active' }; }
  async processUnlocked(message) {
    const identity = await this.customerContext(message.from);
    const sessionContext = await this.sessions.resolve({ phone: message.from, customer: identity.customer });
    if (sessionContext.conversation?.LastMessageID === message.messageId) { this.log.info('whatsapp.incoming.duplicate-ignored', { messageType: message.messageType, conversationId: sessionContext.conversation.ConversationID }); return { conversationId: sessionContext.conversation.ConversationID, sessionId: sessionContext.session.WhatsAppSessionID, resumed: true, duplicate: true, authenticated: identity.authenticated, orderHistoryCount: identity.orderHistory.length, intent: sessionContext.conversation.CurrentIntent, step: sessionContext.conversation.CurrentStep, handler: 'duplicate' }; }
    const result = await this.engine.process(message, { ...sessionContext, ...identity });
    const content = message.text || message.interactive || message.media || message.location || message.contacts || message.reaction || {};
    await this.messages.create({ messageId: message.messageId, conversationId: result.conversation?.ConversationID, customerId: identity.customer?.CustomerID, phone: message.from, direction: 'inbound', messageType: message.messageType, content, providerMessageId: message.messageId, deliveryStatus: 'received', unread: true, createdAt: message.timestamp });
    await this.conversations.update(result.conversation.ConversationID, { UnreadCount: Number(result.conversation.UnreadCount || 0) + 1 });
    this.health.incomingMessage?.(message.messageType);
    this.log.info('whatsapp.incoming.processed', { messageType: message.messageType, intent: result.intent, conversationId: result.conversation?.ConversationID, sessionResumed: sessionContext.resumed, customerFound: Boolean(identity.customer) });
    return { conversationId: result.conversation?.ConversationID, sessionId: sessionContext.session?.WhatsAppSessionID, resumed: sessionContext.resumed, authenticated: identity.authenticated, orderHistoryCount: identity.orderHistory.length, intent: result.intent, step: result.step, handler: result.routed.handledBy };
  }
  process(message) { const prior = this.phoneLocks.get(message.from) || Promise.resolve(); const task = prior.catch(() => {}).then(() => this.processUnlocked(message)); this.phoneLocks.set(message.from, task); return task.finally(() => { if (this.phoneLocks.get(message.from) === task) this.phoneLocks.delete(message.from); }); }
}
export const incomingMessageService = new IncomingMessageService({ messages: messageRepository, conversations: conversationRepository });
