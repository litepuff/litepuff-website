export class StickerMessageHandler { handle(message) { return { handledBy: 'sticker', messageType: 'sticker', mediaId: message.media?.id || null }; } }
export const stickerMessageHandler = new StickerMessageHandler();
