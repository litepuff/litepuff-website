import { AppError } from '../utils/AppError.js';

export class LocationMessageBuilder {
  build({ to, latitude, longitude, name, address }) {
    const lat = Number(latitude); const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) throw new AppError('WhatsApp location coordinates are invalid.', { status: 422, code: 'WHATSAPP_LOCATION_INVALID', expose: true });
    return { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'location', location: { latitude: lat, longitude: lng, ...(name ? { name: String(name) } : {}), ...(address ? { address: String(address) } : {}) } };
  }
}
export const locationMessageBuilder = new LocationMessageBuilder();
