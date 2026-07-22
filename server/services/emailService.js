import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporter;

function mailer() {
  if (transporter) return transporter;
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) return null;
  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPass }
  });
  return transporter;
}

function layout(title, body) {
  return `
    <div style="margin:0;background:#FAF8F2;padding:28px;font-family:Manrope,Arial,sans-serif;color:#0f2b21">
      <div style="max-width:640px;margin:auto;background:#fff;border:1px solid #ECE7DD;border-radius:24px;padding:28px">
        <p style="letter-spacing:4px;color:#C89B3C;font-size:12px;font-weight:800;margin:0 0 10px">LITEPUFF</p>
        <h1 style="font-family:Georgia,serif;font-size:34px;margin:0 0 16px">${title}</h1>
        <div style="font-size:15px;line-height:1.7;color:#53635c">${body}</div>
        <p style="margin-top:28px;border-top:1px solid #ECE7DD;padding-top:18px;color:#53635c">Thank you for choosing LitePuff.</p>
      </div>
    </div>`;
}

export async function sendMail({ to, subject, html, attachments = [] }) {
  const client = mailer();
  if (!client || !to) {
    logger.warn('integration.email.skipped', { reason: !client ? 'not-configured' : 'recipient-missing' });
    return { skipped: true };
  }
  return client.sendMail({ from: env.mailFrom, to, subject, html, attachments });
}

export const emailTemplates = {
  paymentSuccessful: (order, payment) => ({
    subject: `Payment successful for LitePuff order ${order.OrderNumber}`,
    html: layout('Payment Successful', `<p>We received your payment of <strong>₹${order.GrandTotal}</strong>.</p><p>Order: <strong>${order.OrderNumber}</strong><br>Payment ID: <strong>${payment.RazorpayPaymentID}</strong><br>Tracking ID: <strong>${order.TrackingNumber}</strong></p><p>Your invoice is attached and the order is confirmed.</p>`)
  }),
  paymentFailed: (payment) => ({
    subject: 'LitePuff payment failed — try again',
    html: layout('Payment Failed', `<p>Your payment could not be completed.</p><p>${(() => { try { return JSON.parse(payment.Remarks || '{}').message; } catch { return payment.Remarks; } })() || 'No amount was charged.'}</p><p>Your cart is unchanged. Return to checkout when you are ready to retry payment.</p>`)
  }),
  orderStatus: (order, status) => ({
    subject: `LitePuff order ${order.OrderNumber || order.orderNumber}: ${status}`,
    html: layout(`Order ${status}`, `<p>Your order <strong>${order.OrderNumber || order.orderNumber}</strong> is now <strong>${status}</strong>.</p><p>You can track it from your LitePuff account.</p>`)
  }),
  newsletter: (email) => ({
    subject: 'Welcome to LitePuff stories',
    html: layout('You are subscribed', `<p>${email}, you will now receive LitePuff launches, recipes and snack inspiration.</p>`)
  }),
  passwordReset: () => ({
    subject: 'LitePuff password reset',
    html: layout('Password reset requested', '<p>If this was you, use the reset instructions shown on the website. If not, you can ignore this message.</p>')
  }),
  adminNewOrder: (order) => ({
    subject: `New LitePuff order ${order.OrderNumber || order.orderNumber}`,
    html: layout('New order received', `<p>Order <strong>${order.OrderNumber || order.orderNumber}</strong> has been placed for ₹${order.GrandTotal || order.grandTotal}.</p>`)
  }),
  contactMessage: (message) => ({
    subject: `New contact message: ${message.Subject || message.subject}`,
    html: layout('New contact message', `<p><strong>${message.Name || message.name}</strong> wrote:</p><p>${message.Message || message.message}</p>`)
  }),
  lowStock: (product) => ({
    subject: `Low stock alert: ${product.Name || product.name}`,
    html: layout('Low stock alert', `<p>${product.Name || product.name} has only <strong>${product.Stock || product.stock}</strong> units left.</p>`)
  })
};
