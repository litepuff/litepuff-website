export class LocationMessageHandler { handle(message) { return { handledBy: 'location', messageType: 'location', locationPresent: Boolean(message.location) }; } }
export const locationMessageHandler = new LocationMessageHandler();
