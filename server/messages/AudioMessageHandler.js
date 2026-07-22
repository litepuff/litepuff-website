export class AudioMessageHandler { handle(message) { return { handledBy: 'audio', messageType: 'audio', mediaId: message.media?.id || null }; } }
export const audioMessageHandler = new AudioMessageHandler();
