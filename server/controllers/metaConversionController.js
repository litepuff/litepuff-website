import { metaConversionService } from '../services/meta/MetaConversionService.js';
import { logger } from '../utils/logger.js';

const methods = Object.freeze({
  PageView: 'pageView',
  ViewContent: 'viewContent',
  AddToCart: 'addToCart',
  InitiateCheckout: 'initiateCheckout',
});

const clientIp = (request) => (
  String(request.get('x-forwarded-for') || '').split(',')[0].trim() ||
  request.ip ||
  ''
);

export function collectMetaConversion(request, response) {
  const eventName = String(request.body?.eventName || '').trim();
  const eventId = String(request.body?.eventId || '').trim();
  const method = methods[eventName];
  if (!method || !eventId) {
    return response.status(422).json({
      success: false,
      message: 'A supported Meta event name and event ID are required.',
    });
  }

  const event = {
    eventId,
    eventTime: request.body.eventTime,
    eventSourceUrl: request.body.eventSourceUrl || request.get('referer'),
    customData: request.body.customData,
    hashedUserData: request.body.hashedUserData,
    userData: {
      externalId: request.auth?.customerId || request.customer?.id,
      clientIp: clientIp(request),
      clientUserAgent: request.get('user-agent'),
      fbp: request.body.fbp,
      fbc: request.body.fbc,
    },
  };
  const context = { correlationId: request.id };

  setImmediate(() => {
    metaConversionService[method](event, context).catch((error) => {
      logger.error('meta.capi.background.failed', {
        correlationId: request.id,
        eventName,
        eventId,
        error: error?.message || String(error),
      });
    });
  });

  return response.status(202).json({
    success: true,
    message: 'Meta conversion event accepted.',
    data: { eventName, eventId },
  });
}
