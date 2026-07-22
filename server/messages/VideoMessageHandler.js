export class VideoMessageHandler { handle(message) { return { handledBy: 'video', messageType: 'video', mediaId: message.media?.id || null }; } }
export const videoMessageHandler = new VideoMessageHandler();
