import { env } from '../config/env.js';
import { generateInvoice } from './invoiceService.js';
import { emailTemplates } from './emailService.js';
import { getRows } from './googleSheets.js';
import { notificationService } from './NotificationService.js';

export async function notifyPaymentSuccess(order, payment) {
  const customer = (await getRows('CUSTOMERS')).find((row) => row.CustomerID === order.CustomerID);
  const invoice = await generateInvoice(order.OrderID).catch(() => null);
  const tasks = [];
  tasks.push(notificationService.createWebsite({ customerId: order.CustomerID, orderId: order.OrderID, type: 'payment_success', title: 'Payment Successful', message: `Payment received for order ${order.OrderNumber}.`, deepLink: `/account/orders/${order.OrderID}` }));
  if (customer?.Email) tasks.push(notificationService.sendEmail({ to: customer.Email, template: emailTemplates.paymentSuccessful(order, payment), attachments: invoice ? [{ filename: invoice.fileName, path: invoice.filePath }] : [], customerId: order.CustomerID, orderId: order.OrderID, type: 'payment_success' }));
  if (env.adminNotifyEmail) tasks.push(notificationService.sendEmail({ to: env.adminNotifyEmail, template: emailTemplates.adminNewOrder(order), orderId: order.OrderID, type: 'admin_new_order' }));
  await Promise.allSettled(tasks);
  return invoice;
}

export async function notifyPaymentFailure(payment) {
  const customer = (await getRows('CUSTOMERS')).find((row) => row.CustomerID === payment.CustomerID);
  const tasks = [notificationService.createWebsite({ customerId: payment.CustomerID, orderId: payment.OrderID, type: 'payment_failed', title: 'Payment Failed', message: 'Your payment did not complete. Your cart is unchanged.', deepLink: '/checkout' })];
  if (customer?.Email) tasks.push(notificationService.sendEmail({ to: customer.Email, template: emailTemplates.paymentFailed(payment), customerId: payment.CustomerID, orderId: payment.OrderID, type: 'payment_failed' }));
  return Promise.allSettled(tasks);
}
