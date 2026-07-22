export class TextMessageHandler { handle(message) { return { handledBy: 'text', messageType: message.messageType, textPresent: Boolean(message.text) }; } }
export const textMessageHandler = new TextMessageHandler();
