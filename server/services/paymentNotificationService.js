import { env } from '../config/env.js';
import { generateInvoice } from './invoiceService.js';
import { emailTemplates } from './emailService.js';
import { getRows } from './googleSheets.js';
import { notificationService } from './NotificationService.js';

export async function notifyPaymentSuccess(order, payment) {
  const customer = (await getRows('CUSTOMERS')).find((row) => row.CustomerID === order.CustomerID);
  const invoice = await generateInvoice(order.OrderID);
  const tasks = [];
  if (customer?.Email) tasks.push(notificationService.sendEmail({ to: customer.Email, template: emailTemplates.paymentSuccessful(order, payment), attachments: [{ filename: invoice.fileName, path: invoice.filePath }], customerId: order.CustomerID, orderId: order.OrderID, type: 'payment_success' }));
  if (env.adminNotifyEmail) tasks.push(notificationService.sendEmail({ to: env.adminNotifyEmail, template: emailTemplates.adminNewOrder(order), orderId: order.OrderID, type: 'admin_new_order' }));
  await Promise.allSettled(tasks);
  return invoice;
}

export async function notifyPaymentFailure(payment) {
  const customer = (await getRows('CUSTOMERS')).find((row) => row.CustomerID === payment.CustomerID);
  if (!customer?.Email) return { skipped: true };
  return notificationService.sendEmail({ to: customer.Email, template: emailTemplates.paymentFailed(payment), customerId: payment.CustomerID, orderId: payment.OrderID, type: 'payment_failed' });
}
