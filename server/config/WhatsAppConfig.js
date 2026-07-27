const REQUIRED_KEYS = Object.freeze([
  'META_APP_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
  'WHATSAPP_VERIFY_TOKEN',
  'META_APP_SECRET'
]);

const clean = (value) => typeof value === 'string' ? value.trim() : '';

export class WhatsAppConfig {
  constructor(source = process.env) {
    this.whatsappAccessToken = clean(source.WHATSAPP_ACCESS_TOKEN);
    this.whatsappPhoneNumberId = clean(source.WHATSAPP_PHONE_NUMBER_ID);
    this.whatsappBusinessAccountId = clean(source.WHATSAPP_BUSINESS_ACCOUNT_ID);
    this.whatsappVerifyToken = clean(source.WHATSAPP_VERIFY_TOKEN);
    this.metaAppId = clean(source.META_APP_ID);
    this.metaAppSecret = clean(source.META_APP_SECRET);
    this.metaApiVersion = clean(source.META_API_VERSION) || 'v23.0';
    this.whatsappTimeoutMs = Number(source.WHATSAPP_TIMEOUT_MS || 10000);
    this.whatsappMaxRetries = Number(source.WHATSAPP_MAX_RETRIES || 2);
    this.whatsappSessionTimeoutMinutes = Number(source.WHATSAPP_SESSION_TIMEOUT_MINUTES || 30);
    this.whatsappTemplateLanguage = clean(source.WHATSAPP_TEMPLATE_LANGUAGE) || 'en';
    this.whatsappAuthTemplateLanguage = clean(source.WHATSAPP_OTP_TEMPLATE_LANGUAGE) || this.whatsappTemplateLanguage;
    this.whatsappAuthTemplate = clean(source.WHATSAPP_OTP_TEMPLATE || source.WHATSAPP_AUTH_TEMPLATE);
    this.whatsappOrderTemplate = clean(source.ORDER_CONFIRMED_TEMPLATE || source.WHATSAPP_ORDER_TEMPLATE);
    this.whatsappShippingTemplate = clean(source.ORDER_SHIPPED_TEMPLATE || source.WHATSAPP_SHIPPING_TEMPLATE);
    this.whatsappMarketingTemplate = clean(source.WHATSAPP_MARKETING_TEMPLATE) || 'litepuff_marketing';
    this.whatsappWelcomeTemplate = clean(source.WHATSAPP_WELCOME_TEMPLATE) || 'litepuff_welcome';
    this.whatsappPaymentSuccessTemplate = clean(source.PAYMENT_SUCCESS_TEMPLATE || source.WHATSAPP_PAYMENT_SUCCESS_TEMPLATE);
    this.whatsappPaymentFailedTemplate = clean(source.PAYMENT_FAILED_TEMPLATE || source.WHATSAPP_PAYMENT_FAILED_TEMPLATE);
    this.whatsappOrderPackedTemplate = clean(source.WHATSAPP_ORDER_PACKED_TEMPLATE) || 'litepuff_order_packed';
    this.whatsappOutForDeliveryTemplate = clean(source.WHATSAPP_OUT_FOR_DELIVERY_TEMPLATE) || 'litepuff_out_for_delivery';
    this.whatsappDeliveredTemplate = clean(source.ORDER_DELIVERED_TEMPLATE || source.WHATSAPP_DELIVERED_TEMPLATE);
    this.whatsappCancelledTemplate = clean(source.WHATSAPP_CANCELLED_TEMPLATE) || 'litepuff_cancelled';
    this.whatsappRefundInitiatedTemplate = clean(source.WHATSAPP_REFUND_INITIATED_TEMPLATE) || 'litepuff_refund_initiated';
    this.whatsappRefundCompletedTemplate = clean(source.WHATSAPP_REFUND_COMPLETED_TEMPLATE) || 'litepuff_refund_completed';
    this.whatsappCouponTemplate = clean(source.WHATSAPP_COUPON_TEMPLATE) || 'litepuff_coupon';
    this.whatsappFestivalTemplate = clean(source.WHATSAPP_FESTIVAL_TEMPLATE) || 'litepuff_festival_campaign';
    this.whatsappAuthCodeButton = String(source.WHATSAPP_AUTH_CODE_BUTTON ?? 'true').toLowerCase() === 'true';
    this.validation = this.validate(source);
  }

  validate(source = process.env) {
    const missing = REQUIRED_KEYS.filter((key) => !clean(source[key]));
    const templateValues = {
      WHATSAPP_OTP_TEMPLATE: this.whatsappAuthTemplate,
      ORDER_CONFIRMED_TEMPLATE: this.whatsappOrderTemplate,
      ORDER_SHIPPED_TEMPLATE: this.whatsappShippingTemplate,
      ORDER_DELIVERED_TEMPLATE: this.whatsappDeliveredTemplate,
      PAYMENT_SUCCESS_TEMPLATE: this.whatsappPaymentSuccessTemplate,
      PAYMENT_FAILED_TEMPLATE: this.whatsappPaymentFailedTemplate
    };
    missing.push(...Object.entries(templateValues).filter(([, value]) => !value).map(([key]) => key));
    const invalid = [];
    if (!/^v\d+\.\d+$/.test(this.metaApiVersion)) invalid.push('META_API_VERSION');
    if (!Number.isFinite(this.whatsappTimeoutMs) || this.whatsappTimeoutMs <= 0) invalid.push('WHATSAPP_TIMEOUT_MS');
    if (!Number.isInteger(this.whatsappMaxRetries) || this.whatsappMaxRetries < 0) invalid.push('WHATSAPP_MAX_RETRIES');
    if (!Number.isFinite(this.whatsappSessionTimeoutMinutes) || this.whatsappSessionTimeoutMinutes <= 0) invalid.push('WHATSAPP_SESSION_TIMEOUT_MINUTES');
    if (!/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(this.whatsappTemplateLanguage)) invalid.push('WHATSAPP_TEMPLATE_LANGUAGE');
    if (!/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(this.whatsappAuthTemplateLanguage)) invalid.push('WHATSAPP_OTP_TEMPLATE_LANGUAGE');
    const errors = [
      ...missing.map((key) => `Missing ${key}`),
      ...invalid.map((key) => `Invalid ${key}`)
    ];
    return Object.freeze({ enabled: errors.length === 0, missing: Object.freeze(missing), invalid: Object.freeze(invalid), errors: Object.freeze(errors) });
  }

  get configured() { return this.validation.enabled; }
  get outboundConfigured() { return Boolean(this.validation.enabled); }
  get webhookConfigured() { return Boolean(this.whatsappVerifyToken && this.metaAppSecret); }
  get disabledReason() { return this.validation.errors[0] || null; }

  publicState() {
    return {
      configured: this.configured,
      outboundConfigured: this.outboundConfigured,
      webhookConfigured: this.webhookConfigured,
      apiVersion: this.metaApiVersion,
      phoneNumberId: this.whatsappPhoneNumberId || null,
      businessAccountId: this.whatsappBusinessAccountId || null,
      reason: this.disabledReason
    };
  }
}

export const whatsAppConfig = Object.freeze(new WhatsAppConfig());
