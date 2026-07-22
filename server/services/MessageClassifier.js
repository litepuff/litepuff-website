export const MESSAGE_INTENTS = Object.freeze({ GREETING: 'greeting', ORDER_INQUIRY: 'order_inquiry', PRODUCT_INQUIRY: 'product_inquiry', COMPLAINT: 'complaint', SUPPORT: 'support', GENERAL_QUESTION: 'general_question', MEDIA_UPLOAD: 'media_upload', UNKNOWN: 'unknown' });

export class MessageClassifier {
  classify(message) {
    if (['image', 'audio', 'video', 'document', 'sticker'].includes(message.messageType)) return MESSAGE_INTENTS.MEDIA_UPLOAD;
    const text = String(message.text || message.interactive?.title || '').trim().toLowerCase();
    if (!text) return MESSAGE_INTENTS.UNKNOWN;
    if (/^(hi|hello|hey|namaste|good\s*(morning|afternoon|evening))\b/.test(text)) return MESSAGE_INTENTS.GREETING;
    if (/\b(order|tracking|track|shipment|delivery status|where.*order)\b/.test(text)) return MESSAGE_INTENTS.ORDER_INQUIRY;
    if (/\b(product|makhana|flavour|flavor|price|stock|ingredient|available)\b/.test(text)) return MESSAGE_INTENTS.PRODUCT_INQUIRY;
    if (/\b(complaint|damaged|broken|bad|wrong|refund|unhappy|poor)\b/.test(text)) return MESSAGE_INTENTS.COMPLAINT;
    if (/\b(help|support|agent|human|contact)\b/.test(text)) return MESSAGE_INTENTS.SUPPORT;
    if (/\?$|\b(what|when|where|why|how|can|do|is|are)\b/.test(text)) return MESSAGE_INTENTS.GENERAL_QUESTION;
    return MESSAGE_INTENTS.UNKNOWN;
  }
}
export const messageClassifier = new MessageClassifier();
