export const OTP_PROVIDERS = Object.freeze({ EMAIL: 'email', WHATSAPP: 'whatsapp' });
export const OTP_PURPOSES = Object.freeze({ SIGNUP: 'signup', LOGIN: 'login', EMAIL_CHANGE: 'email_change', PHONE_CHANGE: 'phone_change', RECOVERY: 'recovery' });
export const OTP_STATUSES = Object.freeze({ ACTIVE: 'active', VERIFIED: 'verified', EXPIRED: 'expired', INVALIDATED: 'invalidated', LOCKED: 'locked', DELIVERY_FAILED: 'delivery_failed' });
export const OTP_DELIVERY_STATUSES = Object.freeze({ PENDING: 'pending', SENT: 'sent', FAILED: 'failed' });
