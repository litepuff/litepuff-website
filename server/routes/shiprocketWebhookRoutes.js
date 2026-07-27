import express from 'express';
import { receiveShiprocketWebhook } from '../controllers/shiprocketWebhookController.js';
import { verifyShiprocketWebhook } from '../middleware/verifyShiprocketWebhook.js';

const router = express.Router();
const handle = (controller) => (request, response, next) =>
  Promise.resolve(controller(request, response, next)).catch(next);

router.post('/', verifyShiprocketWebhook, handle(receiveShiprocketWebhook));

export default router;
