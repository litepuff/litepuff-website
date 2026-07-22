export class ListReplyHandler { handle(message) { return { handledBy: 'list_reply', messageType: 'list_reply', selectionId: message.interactive?.id || null }; } }
export const listReplyHandler = new ListReplyHandler();
