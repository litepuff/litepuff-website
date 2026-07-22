import { env } from '../config/env.js';
import { generateInvoice } from './invoiceService.js';
import { emailTemplates, sendMail } from './emailService.js';
import { getRows } from './googleSheets.js';

export async function notifyPaymentSuccess(order, payment) {
  const customer = (await getRows('CUSTOMERS')).find((row) => row.CustomerID === order.CustomerID);
  const invoice = await generateInvoice(order.OrderID);
  const tasks = [];
  if (customer?.Email) tasks.push(sendMail({ to: customer.Email, ...emailTemplates.paymentSuccessful(order, payment), attachments: [{ filename: invoice.fileName, path: invoice.filePath }] }));
  if (env.adminNotifyEmail) tasks.push(sendMail({ to: env.adminNotifyEmail, ...emailTemplates.adminNewOrder(order) }));
  await Promise.allSettled(tasks);
  return invoice;
}

export async function notifyPaymentFailure(payment) {
  const customer = (await getRows('CUSTOMERS')).find((row) => row.CustomerID === payment.CustomerID);
  if (!customer?.Email) return { skipped: true };
  return sendMail({ to: customer.Email, ...emailTemplates.paymentFailed(payment) });
}
