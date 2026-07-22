import { whatsAppConfig } from '../config/WhatsAppConfig.js';
import { templateValidator } from '../validators/TemplateValidator.js';
import { AppError } from '../utils/AppError.js';

export const WHATSAPP_TEMPLATES = Object.freeze({
  AUTHENTICATION: 'authentication', WELCOME: 'welcome', ORDER_CONFIRMATION: 'order_confirmation', PAYMENT_SUCCESS: 'payment_success', PAYMENT_FAILED: 'payment_failed',
  ORDER_PACKED: 'order_packed', ORDER_SHIPPED: 'order_shipped', OUT_FOR_DELIVERY: 'out_for_delivery', DELIVERED: 'delivered', CANCELLED: 'cancelled',
  REFUND_INITIATED: 'refund_initiated', REFUND_COMPLETED: 'refund_completed', COUPON: 'coupon', MARKETING: 'marketing', FESTIVAL_CAMPAIGN: 'festival_campaign', CUSTOM: 'custom'
});

export class WhatsAppTemplateService {
  constructor({ config = whatsAppConfig, validator = templateValidator } = {}) {
    this.config = config; this.validator = validator;
    this.registry = Object.freeze({
      authentication: { name: config.whatsappAuthTemplate, required: ['code', 'expiresMinutes'], button: ['code'] },
      welcome: { name: config.whatsappWelcomeTemplate, required: ['firstName'] },
      order_confirmation: { name: config.whatsappOrderTemplate, required: ['orderNumber', 'total'] },
      payment_success: { name: config.whatsappPaymentSuccessTemplate, required: ['orderNumber', 'amount'] },
      payment_failed: { name: config.whatsappPaymentFailedTemplate, required: ['orderNumber'] },
      order_packed: { name: config.whatsappOrderPackedTemplate, required: ['orderNumber'] },
      order_shipped: { name: config.whatsappShippingTemplate, required: ['orderNumber', 'status', 'trackingUrl'] },
      out_for_delivery: { name: config.whatsappOutForDeliveryTemplate, required: ['orderNumber'] },
      delivered: { name: config.whatsappDeliveredTemplate, required: ['orderNumber'] },
      cancelled: { name: config.whatsappCancelledTemplate, required: ['orderNumber'] },
      refund_initiated: { name: config.whatsappRefundInitiatedTemplate, required: ['orderNumber', 'amount'] },
      refund_completed: { name: config.whatsappRefundCompletedTemplate, required: ['orderNumber', 'amount'] },
      coupon: { name: config.whatsappCouponTemplate, required: ['code', 'offer'] },
      marketing: { name: config.whatsappMarketingTemplate, required: ['firstName', 'message'] },
      festival_campaign: { name: config.whatsappFestivalTemplate, required: ['firstName', 'offer'] }
    });
  }

  resolve(type, { variables = {}, name, parameters = [] } = {}) {
    if (type === WHATSAPP_TEMPLATES.CUSTOM || name) return { name: this.validator.validateName(name), parameters: this.validator.validateParameters(parameters), buttonParameters: [] };
    const definition = this.registry[type];
    if (!definition) throw new AppError('WhatsApp template type is not supported.', { status: 422, code: 'WHATSAPP_TEMPLATE_TYPE_INVALID', expose: true });
    return { name: this.validator.validateName(definition.name), parameters: this.validator.requireVariables(variables, definition.required), buttonParameters: definition.button ? this.validator.requireVariables(variables, definition.button) : [] };
  }

  count() { return Object.keys(this.registry).length + 1; }
  supported() { return [...Object.keys(this.registry), WHATSAPP_TEMPLATES.CUSTOM]; }
}
export const whatsAppTemplateService = new WhatsAppTemplateService();
