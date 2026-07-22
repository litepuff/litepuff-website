import { textMessageHandler } from '../messages/TextMessageHandler.js';
import { imageMessageHandler } from '../messages/ImageMessageHandler.js';
import { videoMessageHandler } from '../messages/VideoMessageHandler.js';
import { audioMessageHandler } from '../messages/AudioMessageHandler.js';
import { stickerMessageHandler } from '../messages/StickerMessageHandler.js';
import { documentMessageHandler } from '../messages/DocumentMessageHandler.js';
import { locationMessageHandler } from '../messages/LocationMessageHandler.js';
import { contactMessageHandler } from '../messages/ContactMessageHandler.js';
import { interactiveMessageHandler } from '../messages/InteractiveMessageHandler.js';
import { buttonReplyHandler } from '../messages/ButtonReplyHandler.js';
import { listReplyHandler } from '../messages/ListReplyHandler.js';
import { reactionMessageHandler } from '../messages/ReactionMessageHandler.js';
import { logger } from '../utils/logger.js';

export class ConversationRouter {
  constructor({ log = logger, handlers = {} } = {}) { this.log = log; this.handlers = { text: textMessageHandler, image: imageMessageHandler, video: videoMessageHandler, audio: audioMessageHandler, sticker: stickerMessageHandler, document: documentMessageHandler, location: locationMessageHandler, contacts: contactMessageHandler, reaction: reactionMessageHandler, interactive: interactiveMessageHandler, button: buttonReplyHandler, button_reply: buttonReplyHandler, list_reply: listReplyHandler, ...handlers }; }
  route(message) { const handler = this.handlers[message.messageType]; if (!handler) { this.log.warn('whatsapp.incoming.unknown-message-type', { messageType: message.messageType }); return { handledBy: 'unknown', messageType: message.messageType, ignored: true }; } return handler.handle(message); }
}
export const conversationRouter = new ConversationRouter();
