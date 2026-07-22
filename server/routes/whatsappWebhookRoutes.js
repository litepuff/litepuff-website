import express from 'express';
import { receiveWhatsAppWebhook, verifyWhatsAppWebhook } from '../controllers/WhatsAppWebhookController.js';
import { verifyMetaSignature } from '../middleware/verifyMetaSignature.js';
import { webhookLimiter } from '../middleware/securityMiddleware.js';

const router = express.Router();
const handle = (controller) => (request, response, next) => Promise.resolve(controller(request, response, next)).catch(next);

router.get('/', webhookLimiter, handle(verifyWhatsAppWebhook));
router.post('/', webhookLimiter, express.raw({ type: 'application/json', limit: '256kb' }), verifyMetaSignature, handle(receiveWhatsAppWebhook));

export default router;
