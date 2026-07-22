import { mediaMessageBuilder } from '../builders/MediaMessageBuilder.js';

export class WhatsAppMediaService {
  constructor({ builder = mediaMessageBuilder } = {}) { this.builder = builder; }
  build(type, input) { return this.builder.build({ ...input, type }); }
}
export const whatsAppMediaService = new WhatsAppMediaService();
