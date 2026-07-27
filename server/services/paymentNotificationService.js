import { env } from '../config/env.js';
import { generateInvoice } from './invoiceService.js';
import { emailTemplates } from './emailService.js';
import { getRows } from './googleSheets.js';
import { notificationService } from './NotificationService.js';
import { logger } from '../utils/logger.js';
import { WHATSAPP_TEMPLATES } from './WhatsAppTemplateService.js';

export async function notifyPaymentSuccess(order, payment, context = {}) {
  logger.info('notification.payment-success.started', { ...context, orderId: order.OrderID, paymentId: payment.PaymentID });
  const customer = (await getRows('CUSTOMERS')).find((row) => row.CustomerID === order.CustomerID);
  const invoice = await generateInvoice(order.OrderID).catch(() => null);
  const tasks = [];
  tasks.push(notificationService.createWebsite({ customerId: order.CustomerID, orderId: order.OrderID, type: 'payment_success', title: 'Payment Successful', message: `Payment received for order ${order.OrderNumber}.`, deepLink: `/account/orders/${order.OrderID}`, correlationId: context.correlationId }));
  if (customer?.Email) tasks.push(notificationService.sendEmail({ to: customer.Email, template: emailTemplates.paymentSuccessful(order, payment), attachments: invoice ? [{ filename: invoice.fileName, path: invoice.filePath }] : [], customerId: order.CustomerID, orderId: order.OrderID, type: 'payment_success', correlationId: context.correlationId }));
  if (customer?.Phone) {
    tasks.push(notificationService.sendWhatsApp({ to: customer.Phone, template: WHATSAPP_TEMPLATES.ORDER_CONFIRMATION, variables: { orderNumber: order.OrderNumber || order.OrderID, total: order.GrandTotal }, customerId: order.CustomerID, orderId: order.OrderID, type: 'order_confirmed', correlationId: context.correlationId }));
    tasks.push(notificationService.sendWhatsApp({ to: customer.Phone, template: WHATSAPP_TEMPLATES.PAYMENT_SUCCESS, variables: { orderNumber: order.OrderNumber || order.OrderID, amount: order.GrandTotal }, customerId: order.CustomerID, orderId: order.OrderID, type: 'payment_success', correlationId: context.correlationId }));
  }
  if (env.adminNotifyEmail) tasks.push(notificationService.sendEmail({ to: env.adminNotifyEmail, template: emailTemplates.adminNewOrder(order), orderId: order.OrderID, type: 'admin_new_order', correlationId: context.correlationId }));
  const results = await Promise.allSettled(tasks);
  logger.info('notification.payment-success.completed', { ...context, orderId: order.OrderID, paymentId: payment.PaymentID, taskCount: results.length, rejectedCount: results.filter((result) => result.status === 'rejected').length });
  return invoice;
}

export async function notifyPaymentFailure(payment, context = {}) {
  logger.info('notification.payment-failure.started', { ...context, orderId: payment.OrderID, paymentId: payment.PaymentID });
  const customer = (await getRows('CUSTOMERS')).find((row) => row.CustomerID === payment.CustomerID);
  const tasks = [notificationService.createWebsite({ customerId: payment.CustomerID, orderId: payment.OrderID, type: 'payment_failed', title: 'Payment Failed', message: 'Your payment did not complete. Your cart is unchanged.', deepLink: '/checkout', correlationId: context.correlationId })];
  if (customer?.Email) tasks.push(notificationService.sendEmail({ to: customer.Email, template: emailTemplates.paymentFailed(payment), customerId: payment.CustomerID, orderId: payment.OrderID, type: 'payment_failed', correlationId: context.correlationId }));
  if (customer?.Phone) tasks.push(notificationService.sendWhatsApp({ to: customer.Phone, template: WHATSAPP_TEMPLATES.PAYMENT_FAILED, variables: { orderNumber: payment.OrderNumber || payment.OrderID }, customerId: payment.CustomerID, orderId: payment.OrderID, type: 'payment_failed', correlationId: context.correlationId }));
  const results = await Promise.allSettled(tasks);
  logger.info('notification.payment-failure.completed', { ...context, orderId: payment.OrderID, paymentId: payment.PaymentID, taskCount: results.length, rejectedCount: results.filter((result) => result.status === 'rejected').length });
  return results;
}
