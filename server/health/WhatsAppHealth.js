export class WhatsAppHealth {
  constructor(clock = () => new Date()) {
    this.clock = clock;
    this.lastWebhookReceived = null;
    this.lastError = null;
    this.lastConnectionCheck = null;
    this.connected = false;
    this.lastIncomingMessage = null;
    this.lastEvent = null;
    this.parserStatus = 'ready';
  }

  webhookReceived() { this.lastWebhookReceived = this.clock().toISOString(); }
  connectionSucceeded() { this.connected = true; this.lastError = null; this.lastConnectionCheck = this.clock().toISOString(); }
  connectionFailed(error) { this.connected = false; this.lastError = error?.message || 'WhatsApp connection failed.'; this.lastConnectionCheck = this.clock().toISOString(); }
  incomingMessage(messageType) { this.lastIncomingMessage = this.clock().toISOString(); this.lastEvent = messageType; }
  eventReceived(eventType) { this.lastEvent = eventType; }
  snapshot() { return { connected: this.connected, lastWebhookReceived: this.lastWebhookReceived, lastIncomingMessage: this.lastIncomingMessage, lastEvent: this.lastEvent, parserStatus: this.parserStatus, lastError: this.lastError, lastConnectionCheck: this.lastConnectionCheck }; }
}

export const whatsAppHealth = new WhatsAppHealth();
