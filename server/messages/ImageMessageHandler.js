export class ImageMessageHandler { handle(message) { return { handledBy: 'image', messageType: 'image', mediaId: message.media?.id || null }; } }
export const imageMessageHandler = new ImageMessageHandler();
