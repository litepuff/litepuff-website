import { conversationRepository } from '../repositories/ConversationRepository.js';

export class ConversationStateService {
  constructor({ conversations = conversationRepository, clock = () => new Date() } = {}) { this.conversations = conversations; this.clock = clock; }
  async record(conversation, message, { intent, step, customerId = '' }) { return this.conversations.update(conversation.ConversationID, { CustomerID: customerId || conversation.CustomerID || '', CurrentIntent: intent, CurrentStep: step, LastMessageID: message.messageId, LastMessageType: message.messageType, LastMessageAt: message.timestamp || this.clock().toISOString() }); }
  close(conversationId) { return this.conversations.close(conversationId); }
  activeCount() { return this.conversations.activeCount(); }
}
export const conversationStateService = new ConversationStateService();
