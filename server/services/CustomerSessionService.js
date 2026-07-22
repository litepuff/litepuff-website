import { sessionRepository } from '../repositories/SessionRepository.js';
import { conversationRepository } from '../repositories/ConversationRepository.js';
import { whatsAppConfig } from '../config/WhatsAppConfig.js';

const truthy = (value) => value === true || String(value).toLowerCase() === 'true';
export class CustomerSessionService {
  constructor({ sessions = sessionRepository, conversations = conversationRepository, timeoutMinutes = whatsAppConfig.whatsappSessionTimeoutMinutes, clock = () => new Date() } = {}) { this.sessions = sessions; this.conversations = conversations; this.timeoutMinutes = timeoutMinutes; this.clock = clock; }
  expiry() { return new Date(this.clock().getTime() + this.timeoutMinutes * 60_000).toISOString(); }
  async resolve({ phone, customer = null }) {
    let session = await this.sessions.findActiveByPhone(phone);
    if (session && new Date(session.ExpiresAt).getTime() <= this.clock().getTime()) { await this.sessions.expire(session.WhatsAppSessionID); await this.conversations.close(session.ConversationID); session = null; }
    const authenticated = Boolean(customer && truthy(customer.PhoneVerified) && String(customer.Status).toLowerCase() === 'active' && !customer.DeletedAt);
    if (session) { session = await this.sessions.update(session.WhatsAppSessionID, { LastActivity: this.clock().toISOString(), ExpiresAt: this.expiry(), CustomerID: customer?.CustomerID || session.CustomerID, Authenticated: authenticated }); const conversation = await this.conversations.findById(session.ConversationID); if (conversation) return { session, conversation, resumed: true }; await this.sessions.close(session.WhatsAppSessionID); session = null; }
    const conversation = await this.conversations.create({ phone, customerId: customer?.CustomerID || '' });
    session = await this.sessions.create({ conversationId: conversation.ConversationID, phone, customerId: customer?.CustomerID || '', authenticated, expiresAt: this.expiry() });
    return { session, conversation, resumed: false };
  }
  async close(sessionId) { const session = await this.sessions.findById(sessionId); if (!session) return null; await this.conversations.close(session.ConversationID); return this.sessions.close(sessionId); }
  activeCount() { return this.sessions.activeCount(); }
}
export const customerSessionService = new CustomerSessionService();
