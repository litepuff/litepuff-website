export class InteractiveMessageHandler { handle(message) { return { handledBy: 'interactive', messageType: 'interactive', interactiveType: message.interactive?.type || 'unknown' }; } }
export const interactiveMessageHandler = new InteractiveMessageHandler();
