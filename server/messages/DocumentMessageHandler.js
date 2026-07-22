export class DocumentMessageHandler { handle(message) { return { handledBy: 'document', messageType: 'document', mediaId: message.media?.id || null, filenamePresent: Boolean(message.media?.filename) }; } }
export const documentMessageHandler = new DocumentMessageHandler();
