import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';

function gateway() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    const error = new Error('Razorpay is not configured.');
    error.status = 503;
    throw error;
  }
  const expectedPrefix = env.razorpayMode === 'live' ? 'rzp_live_' : 'rzp_test_';
  if (!env.razorpayKeyId.startsWith(expectedPrefix)) {
    const error = new Error(`Razorpay key does not match RAZORPAY_MODE=${env.razorpayMode}.`);
    error.status = 503;
    throw error;
  }
  return new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret });
}

export async function createRazorpayOrder({ receipt, amount, currency = 'INR', notes = {} }) {
  return gateway().orders.create({ amount: Math.round(Number(amount) * 100), currency, receipt, notes });
}

function safeHmacEqual(expected, received) {
  const actual = String(received || '');
  return actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export function verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const expected = crypto.createHmac('sha256', env.razorpayKeySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
  return safeHmacEqual(expected, razorpaySignature);
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpayWebhookSecret) return false;
  const expected = crypto.createHmac('sha256', env.razorpayWebhookSecret).update(rawBody).digest('hex');
  return safeHmacEqual(expected, signature);
}

export async function fetchRazorpayPayment(paymentId) {
  return gateway().payments.fetch(paymentId);
}

export function publicGatewayConfig() {
  gateway();
  return { keyId: env.razorpayKeyId, gateway: 'Razorpay', mode: env.razorpayMode };
}
