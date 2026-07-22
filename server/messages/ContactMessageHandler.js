export class ContactMessageHandler { handle(message) { return { handledBy: 'contacts', messageType: 'contacts', contactCount: message.contacts?.length || 0 }; } }
export const contactMessageHandler = new ContactMessageHandler();
