import { AppError } from '../utils/AppError.js';

const isoTimestamp = (value) => { const milliseconds = Number(value) * 1000; return Number.isFinite(milliseconds) && milliseconds > 0 ? new Date(milliseconds).toISOString() : new Date().toISOString(); };
const e164 = (value) => value ? `+${String(value).replace(/\D/g, '')}` : '';

export class MessageParserService {
  parseMessage(message, value = {}) {
    if (!message?.id || !message?.type || !message?.from) throw new AppError('Incoming WhatsApp message is malformed.', { status: 400, code: 'WHATSAPP_MESSAGE_INVALID', expose: true });
    const type = message.type;
    const interactiveType = type === 'interactive' ? message.interactive?.type : null;
    const normalizedType = interactiveType === 'button_reply' ? 'button_reply' : interactiveType === 'list_reply' ? 'list_reply' : type;
    const media = ['image', 'audio', 'video', 'document', 'sticker'].includes(type) ? { id: message[type]?.id || '', mimeType: message[type]?.mime_type || '', sha256: message[type]?.sha256 || '', caption: message[type]?.caption || '', filename: message[type]?.filename || '' } : null;
    return {
      eventType: 'message', messageType: normalizedType, messageId: message.id, from: e164(message.from), timestamp: isoTimestamp(message.timestamp),
      text: type === 'text' ? String(message.text?.body || '') : type === 'button' ? String(message.button?.text || '') : '', media,
      interactive: type === 'interactive' ? { type: interactiveType || 'unknown', id: message.interactive?.[interactiveType]?.id || '', title: message.interactive?.[interactiveType]?.title || '', description: message.interactive?.[interactiveType]?.description || '' } : null,
      location: type === 'location' ? { latitude: Number(message.location?.latitude), longitude: Number(message.location?.longitude), name: message.location?.name || '', address: message.location?.address || '' } : null,
      contacts: type === 'contacts' && Array.isArray(message.contacts) ? message.contacts : [], reaction: type === 'reaction' ? { messageId: message.reaction?.message_id || '', emoji: message.reaction?.emoji || '' } : null,
      contextMessageId: message.context?.id || '', profileName: value.contacts?.find((contact) => contact.wa_id === message.from)?.profile?.name || '', phoneNumberId: value.metadata?.phone_number_id || ''
    };
  }

  parseStatus(status) {
    if (!status?.id || !status?.status) throw new AppError('WhatsApp delivery event is malformed.', { status: 400, code: 'WHATSAPP_STATUS_INVALID', expose: true });
    return { eventType: 'message_status', messageType: 'status', messageId: status.id, from: e164(status.recipient_id), status: status.status, timestamp: isoTimestamp(status.timestamp), errorCode: status.errors?.[0]?.code ? String(status.errors[0].code) : '' };
  }

  parseTemplateStatus(value) { return { eventType: 'message_template_status', messageType: 'template_status', messageId: value?.message_template_id || '', status: value?.event || value?.status || 'unknown', timestamp: new Date().toISOString() }; }
  parseError(error, value = {}) { return { eventType: 'errors', messageType: 'error', messageId: '', status: 'failed', errorCode: error?.code ? String(error.code) : 'unknown', timestamp: new Date().toISOString(), phoneNumberId: value.metadata?.phone_number_id || '' }; }
}
export const messageParserService = new MessageParserService();
