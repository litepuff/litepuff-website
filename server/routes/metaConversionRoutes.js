import express from 'express';
import { collectMetaConversion } from '../controllers/metaConversionController.js';

const router = express.Router();

router.post('/events', collectMetaConversion);

export default router;
