import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  cookieSecret: process.env.COOKIE_SECRET || '',
  accessTokenMinutes: Number(process.env.ACCESS_TOKEN_MINUTES || 15),
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 30),
  otpSecret: process.env.OTP_SECRET || '',
  otpExpiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
  otpCooldownSeconds: Number(process.env.OTP_COOLDOWN_SECONDS || 60),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
  otpMaxResends: Number(process.env.OTP_MAX_RESENDS || 3),
  otpLockMinutes: Number(process.env.OTP_LOCK_MINUTES || 15),
  otpCleanupIntervalMinutes: Number(process.env.OTP_CLEANUP_INTERVAL_MINUTES || 5),
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
  adminRole: process.env.ADMIN_ROLE || 'super_admin',
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASSWORD || '',
  mailFrom: process.env.MAIL_FROM || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailLogoUrl: process.env.EMAIL_LOGO_URL || '',
  adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  razorpayMode: process.env.RAZORPAY_MODE || 'test',
  companyName: process.env.COMPANY_NAME || '',
  supportEmail: process.env.SUPPORT_EMAIL || '',
  supportPhone: process.env.SUPPORT_PHONE || '',
  whatsappNumber: process.env.WHATSAPP_NUMBER || '',
  instagramUrl: process.env.INSTAGRAM_URL || '',
  gstNumber: process.env.GST_NUMBER || '',
  businessAddress: process.env.BUSINESS_ADDRESS || '',
  shiprocketEmail: process.env.SHIPROCKET_EMAIL || '',
  shiprocketPassword: process.env.SHIPROCKET_PASSWORD || '',
  shiprocketPickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
  delhiveryToken: process.env.DELHIVERY_TOKEN || '',
  delhiveryClientName: process.env.DELHIVERY_CLIENT_NAME || '',
  shippingOriginPincode: process.env.SHIPPING_ORIGIN_PINCODE || '',
  shippingWeightKg: Number(process.env.SHIPPING_DEFAULT_WEIGHT_KG || 0.5)
};

export function validateProductionEnv() {
  const required = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: env.jwtRefreshSecret,
    COOKIE_SECRET: env.cookieSecret,
    OTP_SECRET: env.otpSecret,
    FRONTEND_URL: env.clientUrl,
    BACKEND_URL: env.backendUrl
  };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  if (env.nodeEnv === 'production' && env.jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters in production.');
  if (env.nodeEnv === 'production' && env.jwtRefreshSecret.length < 32) throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in production.');
  if (env.nodeEnv === 'production' && env.cookieSecret.length < 32) throw new Error('COOKIE_SECRET must be at least 32 characters in production.');
  if (env.nodeEnv === 'production' && env.otpSecret.length < 32) throw new Error('OTP_SECRET must be at least 32 characters in production.');
  if (env.nodeEnv === 'production' && [env.jwtSecret, env.jwtRefreshSecret, env.cookieSecret, env.otpSecret].some((secret) => /replace|change|example|development/i.test(secret))) throw new Error('Authentication secrets must not use placeholder values in production.');
  if (env.nodeEnv === 'production' && new Set([env.jwtSecret, env.jwtRefreshSecret, env.cookieSecret, env.otpSecret]).size !== 4) throw new Error('Authentication secrets must be independent values.');
  if (env.nodeEnv === 'production' && !env.adminEmail) throw new Error('ADMIN_EMAIL is required in production.');
  if (env.nodeEnv === 'production' && !env.adminPasswordHash) throw new Error('ADMIN_PASSWORD_HASH is required in production; plaintext ADMIN_PASSWORD is not permitted.');
  if (env.nodeEnv === 'production' && env.adminPasswordHash && !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(env.adminPasswordHash)) throw new Error('ADMIN_PASSWORD_HASH must be a valid bcrypt hash.');
  if (env.nodeEnv === 'production') { const invalidUrls = Object.entries({ FRONTEND_URL: env.clientUrl, BACKEND_URL: env.backendUrl, APP_URL: env.appUrl }).filter(([, value]) => !/^https:\/\//i.test(value) || /localhost|127\.0\.0\.1/i.test(value)).map(([key]) => key); if (invalidUrls.length) throw new Error(`Production URLs must use public HTTPS origins: ${invalidUrls.join(', ')}`); }
  if (!Number.isFinite(env.accessTokenMinutes) || env.accessTokenMinutes <= 0) throw new Error('ACCESS_TOKEN_MINUTES must be a positive number.');
  if (!Number.isFinite(env.refreshTokenDays) || env.refreshTokenDays <= 0) throw new Error('REFRESH_TOKEN_DAYS must be a positive number.');
  if (![env.otpExpiresMinutes, env.otpCooldownSeconds, env.otpMaxAttempts, env.otpMaxResends, env.otpLockMinutes, env.otpCleanupIntervalMinutes].every((value) => Number.isFinite(value) && value > 0)) throw new Error('OTP policy values must be positive numbers.');
}
