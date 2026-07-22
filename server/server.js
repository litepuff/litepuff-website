import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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
import { responseEnvelope } from './middleware/responseMiddleware.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import { logger, requestLogger } from './utils/logger.js';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { otpService } from './services/auth/OTPService.js';
import { AppError } from './utils/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadFolder = path.join(__dirname, 'uploads');
const distFolder = path.join(__dirname, '..', 'dist');

fs.mkdirSync(uploadFolder, { recursive: true });
validateProductionEnv();

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

console.log('DIST EXISTS:', fs.existsSync(distFolder));
console.log('DIST PATH:', distFolder);
console.log('CURRENT DIRECTORY:', __dirname);
if (fs.existsSync(distFolder)) console.log('DIST CONTENTS:', fs.readdirSync(distFolder));
if (fs.existsSync(distFolder)) {
  app.use(express.static(distFolder, { maxAge: env.nodeEnv === 'production' ? '1y' : 0, index: false }));
  app.get('*', (request, response) => response.sendFile(path.join(distFolder, 'index.html')));
} else {
  console.error('DIST FOLDER NOT FOUND');
}

// Central error handler keeps API errors consistent and production safe.
app.use(errorHandler);

export function startServer(port = env.port) { otpService.startCleanup(); return app.listen(port, () => logger.info('server.started', { port, environment: env.nodeEnv })); }
export default app;
if (process.env.NODE_ENV !== 'test') startServer();
