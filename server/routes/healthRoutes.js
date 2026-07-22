import express from 'express'; import { googleHealth, googleSheetsHealth, health } from '../controllers/healthController.js';
const router = express.Router(); const handle = (controller) => (request, response, next) => Promise.resolve(controller(request, response, next)).catch(next);
router.get('/', handle(health)); router.get('/google', handle(googleHealth)); router.get('/google-sheets', handle(googleSheetsHealth)); export default router;
