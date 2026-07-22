export class ReactionMessageHandler { handle(message) { return { handledBy: 'reaction', messageType: 'reaction', targetMessageId: message.reaction?.messageId || null, emojiPresent: Boolean(message.reaction?.emoji) }; } }
export const reactionMessageHandler = new ReactionMessageHandler();
