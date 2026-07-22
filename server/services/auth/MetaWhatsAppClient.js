import { MetaClient, metaClient } from '../../config/MetaClient.js';

// Backward-compatible names used by the existing OTP provider and tests.
export class MetaWhatsAppClient extends MetaClient {}
export const metaWhatsAppClient = metaClient;
