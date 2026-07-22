import express from 'express';
import { getGooglePrivateKeyDiagnostics } from '../utils/googlePrivateKeyDiagnostics.js';
import { ok } from '../utils/apiResponse.js';

const router = express.Router();

router.get('/google-private-key', (request, response) => {
  ok(response, getGooglePrivateKeyDiagnostics(), 'Google private key metadata collected safely.');
});

export default router;
