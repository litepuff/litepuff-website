export class ButtonReplyHandler { handle(message) { return { handledBy: 'button_reply', messageType: 'button_reply', selectionId: message.interactive?.id || null }; } }
export const buttonReplyHandler = new ButtonReplyHandler();
