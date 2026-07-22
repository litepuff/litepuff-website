import { messageClassifier, MESSAGE_INTENTS } from './MessageClassifier.js';
import { conversationRouter } from './ConversationRouter.js';
import { conversationStateService } from './ConversationStateService.js';

const STEPS = Object.freeze({ [MESSAGE_INTENTS.GREETING]: 'greeted', [MESSAGE_INTENTS.ORDER_INQUIRY]: 'awaiting_order_reference', [MESSAGE_INTENTS.PRODUCT_INQUIRY]: 'product_inquiry_received', [MESSAGE_INTENTS.COMPLAINT]: 'support_review_required', [MESSAGE_INTENTS.SUPPORT]: 'support_requested', [MESSAGE_INTENTS.GENERAL_QUESTION]: 'question_received', [MESSAGE_INTENTS.MEDIA_UPLOAD]: 'media_received', [MESSAGE_INTENTS.UNKNOWN]: 'unclassified' });
export class ConversationEngine {
  constructor({ classifier = messageClassifier, router = conversationRouter, state = conversationStateService } = {}) { this.classifier = classifier; this.router = router; this.state = state; }
  async process(message, context) { const intent = this.classifier.classify(message); const routed = await this.router.route(message, context); const step = STEPS[intent]; const conversation = await this.state.record(context.conversation, message, { intent, step, customerId: context.customer?.CustomerID || '' }); return { conversation, intent, step, routed }; }
}
export const conversationEngine = new ConversationEngine();
