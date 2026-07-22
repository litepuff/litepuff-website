import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { env, validateProductionEnv } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import productRoutes, { categoriesRouter } from './routes/productRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import orderRoutes, { trackingRouter } from './routes/orderRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import { addressesRouter, profileRouter, wishlistRouter } from './routes/profileRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import productionRoutes from './routes/productionRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { csrfArchitectureGuard, securityStack, webhookLimiter } from './middleware/securityMiddleware.js';
import { paymentWebhook } from './controllers/paymentController.js';
import healthRoutes from './routes/healthRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import { responseEnvelope } from './middleware/responseMiddleware.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import { logger, requestLogger } from './utils/logger.js';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { otpService } from './services/auth/OTPService.js';
import { AppError } from './utils/AppError.js';
import { googleSheetsConfig } from './config/GoogleSheetsConfig.js';
import { googleSheetsService } from './services/GoogleSheetsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectFolder = path.join(__dirname, '..');
const uploadFolder = path.join(__dirname, 'uploads');
const distFolder = path.join(projectFolder, 'dist');
const distIndex = path.join(distFolder, 'index.html');

function ensureFrontendBuild() {
  if (fs.existsSync(distIndex)) return;

  const viteEntry = path.join(projectFolder, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteEntry)) {
    throw new Error('Frontend build is missing and Vite is not installed. Ensure production dependencies are installed before startup.');
  }

  logger.warn('frontend.build.missing', { distFolder });
  const result = spawnSync(process.execPath, [viteEntry, 'build'], {
    cwd: projectFolder,
    env: process.env,
    encoding: 'utf8',
    timeout: 180_000
  });

  if (result.error || result.status !== 0 || !fs.existsSync(distIndex)) {
    const diagnostic = String(result.stderr || result.stdout || result.error?.message || 'Unknown build failure').slice(-4_000);
    logger.error('frontend.build.failed', { status: result.status, diagnostic });
    throw new Error('Frontend production build failed during server startup.');
  }

  logger.info('frontend.build.completed', { distFolder });
}

fs.mkdirSync(uploadFolder, { recursive: true });
validateProductionEnv();
ensureFrontendBuild();

if (!env.smtpHost || !env.smtpUser || !env.smtpPass) logger.warn('integration.email.disabled', { reason: 'not-configured' });
if (!env.whatsappAccessToken || !env.whatsappPhoneNumberId || !env.whatsappBusinessAccountId) logger.warn('integration.whatsapp.disabled', { reason: 'not-configured' });

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
const allowedOrigins = new Set([env.clientUrl, env.appUrl].filter(Boolean));
app.use(cors({ origin: (origin, callback) => !origin || allowedOrigins.has(origin) ? callback(null, true) : callback(new AppError('Request origin is not allowed.', { status: 403, code: 'CORS_ORIGIN_REJECTED' })), credentials: true }));
app.post('/api/payment/webhook', webhookLimiter, express.raw({ type: 'application/json', limit: '256kb' }), (request, response, next) => Promise.resolve(paymentWebhook(request, response, next)).catch(next));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser(env.cookieSecret));
app.use(securityStack);
app.use(csrfArchitectureGuard);
app.use((request, response, next) => { request.id = request.get('x-request-id') || crypto.randomUUID(); response.set('x-request-id', request.id); next(); });
app.use('/api', responseEnvelope);
app.use(requestLogger);
app.use('/uploads', express.static(uploadFolder));

app.use('/api/health', healthRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoriesRouter);
app.use('/api/blogs', blogRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api', contentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tracking', trackingRouter);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/profile', profileRouter);
app.use('/api', addressesRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api', productionRoutes);

app.use('/api', notFoundHandler);

console.log('DIST EXISTS:', fs.existsSync(distIndex));
console.log('DIST PATH:', distFolder);
console.log('CURRENT DIRECTORY:', __dirname);
if (fs.existsSync(distFolder)) console.log('DIST CONTENTS:', fs.readdirSync(distFolder));
if (fs.existsSync(distIndex)) {
  app.use(express.static(distFolder, { maxAge: env.nodeEnv === 'production' ? '1y' : 0, index: false }));
  app.get('*', (request, response) => response.sendFile(path.join(distFolder, 'index.html')));
} else {
  console.error('DIST FOLDER NOT FOUND');
}

// Central error handler keeps API errors consistent and production safe.
app.use(errorHandler);

export function startServer(port = env.port) {
  otpService.startCleanup();
  return app.listen(port, async () => {
    logger.info('server.started', { port, environment: env.nodeEnv });
    logger.info('google-sheets.credentials.loaded', { configured: googleSheetsConfig.credentialsConfigured, source: googleSheetsConfig.credentialsSource, principal: env.googleServiceAccountEmail, spreadsheetIdSuffix: env.googleSheetId.slice(-6) });
    try {
      const diagnostic = await googleSheetsService.diagnose();
      logger.info('google-sheets.startup.connected', { spreadsheet: diagnostic.spreadsheet, worksheetCount: diagnostic.worksheetCount, worksheets: diagnostic.worksheets, missingWorksheets: diagnostic.missingWorksheets });
    } catch (error) {
      logger.error('google-sheets.startup.failed', { code: error.code, status: error.status, error: error.message, details: error.details, stack: error.stack });
    }
  });
}
export default app;
if (process.env.NODE_ENV !== 'test') startServer();
