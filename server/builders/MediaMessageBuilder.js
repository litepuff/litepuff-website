import { AppError } from '../utils/AppError.js';

const TYPES = new Set(['image', 'video', 'audio', 'document', 'sticker']);
export class MediaMessageBuilder {
  build({ to, type, mediaId, url, caption, filename }) {
    if (!TYPES.has(type)) throw new AppError('WhatsApp media type is invalid.', { status: 422, code: 'WHATSAPP_MEDIA_TYPE_INVALID', expose: true });
    if (Boolean(mediaId) === Boolean(url)) throw new AppError('Provide exactly one WhatsApp media ID or public URL.', { status: 422, code: 'WHATSAPP_MEDIA_SOURCE_INVALID', expose: true });
    if (url && !/^https:\/\//i.test(url)) throw new AppError('WhatsApp media URL must use HTTPS.', { status: 422, code: 'WHATSAPP_MEDIA_URL_INVALID', expose: true });
    if ((type === 'audio' || type === 'sticker') && (caption || filename)) throw new AppError('This WhatsApp media type does not support captions or filenames.', { status: 422, code: 'WHATSAPP_MEDIA_METADATA_INVALID', expose: true });
    if (caption && !['image', 'video', 'document'].includes(type)) throw new AppError('Caption is not supported for this media type.', { status: 422, code: 'WHATSAPP_MEDIA_METADATA_INVALID', expose: true });
    if (filename && type !== 'document') throw new AppError('Filename is supported only for documents.', { status: 422, code: 'WHATSAPP_MEDIA_METADATA_INVALID', expose: true });
    const media = { ...(mediaId ? { id: String(mediaId) } : { link: String(url) }), ...(caption ? { caption: String(caption) } : {}), ...(filename ? { filename: String(filename) } : {}) };
    return { messaging_product: 'whatsapp', recipient_type: 'individual', to, type, [type]: media };
  }
}

export const mediaMessageBuilder = new MediaMessageBuilder();
