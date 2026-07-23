import { body } from "express-validator";
import {
  appendRow,
  findRow,
  getRows,
  updateRow,
} from "../services/googleSheets.js";
import { createId } from "../utils/createId.js";
import { created, ok } from "../utils/apiResponse.js";
import {
  buildCheckoutIntent,
  materializeCashOnDeliveryOrder,
  materializePaidOrder,
  signCheckoutIntent,
  verifyCheckoutIntent,
} from "../services/orderService.js";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  publicGatewayConfig,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from "../services/paymentGatewayService.js";
import {
  notifyPaymentFailure,
  notifyPaymentSuccess,
} from "../services/paymentNotificationService.js";

export const createPaymentValidators = [
  body("address").isObject(),
  body("items").isArray({ min: 1 }),
];
export const verifyPaymentValidators = [
  body("paymentId").notEmpty(),
  body("checkoutToken").notEmpty(),
  body("razorpayOrderId").notEmpty(),
  body("razorpayPaymentId").notEmpty(),
  body("razorpaySignature").notEmpty(),
];
export const failurePaymentValidators = [
  body("paymentId").notEmpty(),
  body("checkoutToken").notEmpty(),
];

const locks = new Map();
const checkoutLocks = new Map();
const remarks = (value) => {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return { message: String(value || "") };
  }
};
const encodeRemarks = (value) => JSON.stringify(value).slice(0, 20_000);

function publicPayment(row) {
  return {
    id: row.PaymentID,
    paymentId: row.PaymentID,
    orderId: row.OrderID,
    razorpayOrderId: row.RazorpayOrderID,
    transactionId: row.TransactionReference || row.RazorpayPaymentID,
    paymentMethod: row.PaymentMethod,
    amount: Number(row.Amount || 0),
    currency: row.Currency,
    status: row.Status,
    paidAt: row.PaidAt,
    gateway: row.Gateway || "Razorpay",
    remarks: remarks(row.Remarks).message || "",
  };
}

async function withPaymentLock(paymentId, task) {
  if (locks.has(paymentId)) return locks.get(paymentId);
  const promise = task().finally(() => locks.delete(paymentId));
  locks.set(paymentId, promise);
  return promise;
}

async function withCheckoutLock(customerId, task) {
  const prior = checkoutLocks.get(customerId) || Promise.resolve();
  const current = prior.catch(() => {}).then(task);
  checkoutLocks.set(customerId, current);
  return current.finally(() => { if (checkoutLocks.get(customerId) === current) checkoutLocks.delete(customerId); });
}

async function finalizePayment({
  paymentId,
  customerId,
  checkoutToken,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  gatewayPayment,
}) {
  return withPaymentLock(paymentId, async () => {
    const payment = await findRow(
      "PAYMENTS",
      (row) => row.PaymentID === paymentId,
    );
    const snapshot = verifyCheckoutIntent(checkoutToken);
    if (
      !payment ||
      payment.CustomerID !== customerId ||
      snapshot.customerId !== customerId
    ) {
      const error = new Error("Payment session not found.");
      error.status = 404;
      throw error;
    }
    if (payment.Status === "Paid" && payment.OrderID) {
      const order = await findRow(
        "ORDERS",
        (row) => row.OrderID === payment.OrderID,
      );
      return { order, payment, replay: true };
    }
    if (
      payment.RazorpayOrderID !== razorpayOrderId ||
      snapshot.razorpayOrderId !== razorpayOrderId
    ) {
      const error = new Error("Payment order mismatch.");
      error.status = 409;
      throw error;
    }
    if (
      (await getRows("PAYMENTS")).some(
        (row) =>
          row.PaymentID !== payment.PaymentID &&
          row.RazorpayPaymentID === razorpayPaymentId,
      )
    ) {
      const error = new Error("Payment has already been used.");
      error.status = 409;
      throw error;
    }
    if (
      gatewayPayment.order_id !== payment.RazorpayOrderID ||
      Number(gatewayPayment.amount) !==
        Math.round(Number(payment.Amount) * 100) ||
      gatewayPayment.currency !== payment.Currency ||
      !["captured", "authorized"].includes(gatewayPayment.status)
    ) {
      const error = new Error(
        "Gateway payment details could not be validated.",
      );
      error.status = 409;
      throw error;
    }
    const order = await materializePaidOrder({
      payment,
      snapshot,
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod: gatewayPayment.method || "razorpay",
    });
    const saved = await findRow(
      "PAYMENTS",
      (row) => row.PaymentID === payment.PaymentID,
    );
    await notifyPaymentSuccess(order, saved).catch(() => {});
    return { order, payment: saved, replay: false };
  });
}

async function createPaymentOrderUnlocked(request, response) {
  const paymentId = createId("payment");
  const snapshot = await buildCheckoutIntent({
    customerId: request.customer.id,
    address: request.body.address,
    items: request.body.items,
    couponCode: request.body.couponCode || request.body.coupon,
    paymentId,
    firstOrderAllowed: Boolean(request.auth),
  });
  const gatewayOrder = await createRazorpayOrder({
    receipt: paymentId,
    amount: snapshot.grandTotal,
    currency: snapshot.currency,
    notes: { payment_id: paymentId, customer_id: request.customer.id },
  });
  const checkoutToken = signCheckoutIntent(snapshot, gatewayOrder.id);
  const gateway = publicGatewayConfig();
  await appendRow("PAYMENTS", {
    PaymentID: paymentId,
    OrderID: "",
    CustomerID: request.customer.id,
    RazorpayOrderID: gatewayOrder.id,
    RazorpayPaymentID: "",
    RazorpaySignature: "",
    PaymentMethod: "",
    Amount: snapshot.grandTotal,
    Currency: snapshot.currency,
    Status: "Pending",
    PaidAt: "",
    TransactionReference: "",
    Gateway: gateway.gateway,
    Remarks: encodeRemarks({
      checkoutToken,
      firstOrderReserved: snapshot.firstOrderEligible,
      checkoutExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      pricing: { subtotal: snapshot.subtotal, productDiscount: snapshot.productDiscount, firstOrderDiscount: snapshot.firstOrderDiscount, couponDiscount: snapshot.couponDiscount, shipping: snapshot.shipping, tax: snapshot.tax, grandTotal: snapshot.grandTotal },
      message: "Payment checkout created.",
    }),
  });
  created(
    response,
    {
      paymentId,
      razorpayOrderId: gatewayOrder.id,
      order_id: gatewayOrder.id,
      amount: gatewayOrder.amount,
      currency: gatewayOrder.currency,
      keyId: gateway.keyId,
      mode: gateway.mode,
      checkoutToken,
      pricing: { subtotal: snapshot.subtotal, productDiscount: snapshot.productDiscount, firstOrderDiscount: snapshot.firstOrderDiscount, couponDiscount: snapshot.couponDiscount, discount: snapshot.discount, shipping: snapshot.shipping, tax: snapshot.tax, grandTotal: snapshot.grandTotal, firstOrderEligible: snapshot.firstOrderEligible },
    },
    "Secure payment prepared.",
  );
}

export function createPaymentOrder(request, response) { return withCheckoutLock(request.customer.id, () => createPaymentOrderUnlocked(request, response)); }

async function createCashOnDeliveryOrderUnlocked(request, response) {
  const paymentId = createId("payment");
  const snapshot = await buildCheckoutIntent({
    customerId: request.customer.id,
    address: request.body.address,
    items: request.body.items,
    couponCode: request.body.couponCode || request.body.coupon,
    paymentId,
    firstOrderAllowed: Boolean(request.auth),
  });
  await appendRow("PAYMENTS", {
    PaymentID: paymentId,
    OrderID: "",
    CustomerID: request.customer.id,
    RazorpayOrderID: "",
    RazorpayPaymentID: "",
    RazorpaySignature: "",
    PaymentMethod: "Cash on Delivery",
    Amount: snapshot.grandTotal,
    Currency: snapshot.currency,
    Status: "Processing",
    PaidAt: "",
    TransactionReference: paymentId,
    Gateway: "Cash on Delivery",
    Remarks: encodeRemarks({ firstOrderReserved: snapshot.firstOrderEligible, checkoutExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), pricing: { subtotal: snapshot.subtotal, productDiscount: snapshot.productDiscount, firstOrderDiscount: snapshot.firstOrderDiscount, couponDiscount: snapshot.couponDiscount, shipping: snapshot.shipping, tax: snapshot.tax, grandTotal: snapshot.grandTotal }, message: "Creating Cash on Delivery order." }),
  });
  const payment = await findRow(
    "PAYMENTS",
    (row) => row.PaymentID === paymentId,
  );
  const order = await materializeCashOnDeliveryOrder({ payment, snapshot });
  const saved = await findRow("PAYMENTS", (row) => row.PaymentID === paymentId);
  await notifyPaymentSuccess(order, saved).catch(() => {});
  created(
    response,
    { order, payment: publicPayment(saved) },
    "Cash on Delivery order confirmed.",
  );
}

export function createCashOnDeliveryOrder(request, response) { return withCheckoutLock(request.customer.id, () => createCashOnDeliveryOrderUnlocked(request, response)); }

export async function verifyPayment(request, response) {
  if (!verifyRazorpaySignature(request.body))
    return response
      .status(400)
      .json({
        success: false,
        message: "Payment signature verification failed.",
      });
  const gatewayPayment = await fetchRazorpayPayment(
    request.body.razorpayPaymentId,
  );
  const result = await finalizePayment({
    ...request.body,
    customerId: request.customer.id,
    gatewayPayment,
  });
  ok(
    response,
    {
      order: result.order,
      payment: publicPayment(result.payment),
      replay: result.replay,
    },
    result.replay
      ? "Payment was already verified."
      : "Payment verified and order confirmed.",
  );
}

export async function recordPaymentFailure(request, response) {
  const snapshot = verifyCheckoutIntent(request.body.checkoutToken);
  if (snapshot.paymentId !== request.body.paymentId || snapshot.customerId !== request.customer.id) {
    return response.status(401).json({ success: false, message: "Payment authorization is invalid." });
  }
  const payment = await findRow(
    "PAYMENTS",
    (row) =>
      row.PaymentID === request.body.paymentId &&
      row.CustomerID === request.customer.id,
  );
  if (!payment)
    return response
      .status(404)
      .json({ success: false, message: "Payment session not found." });
  if (payment.Status !== "Paid") {
    payment.RazorpayPaymentID =
      request.body.razorpayPaymentId || payment.RazorpayPaymentID;
    payment.TransactionReference = payment.RazorpayPaymentID;
    payment.Status = "Failed";
    payment.Remarks = encodeRemarks({
      ...remarks(payment.Remarks),
      message: String(request.body.reason || "Payment failed").slice(0, 500),
    });
    await updateRow("PAYMENTS", payment._row, payment);
    await notifyPaymentFailure(payment).catch(() => {});
  }
  ok(
    response,
    {
      payment: publicPayment(payment),
      retryAllowed: payment.Status !== "Paid",
    },
    "Payment failure recorded. Your cart is unchanged.",
  );
}

export async function getPayment(request, response) {
  const payment = await findRow(
    "PAYMENTS",
    (row) =>
      row.PaymentID === request.params.paymentId &&
      row.CustomerID === request.customer.id,
  );
  if (!payment)
    return response
      .status(404)
      .json({ success: false, message: "Payment not found." });
  ok(response, {
    payment: publicPayment(payment),
    retryAllowed: payment.Status === "Failed",
  });
}

export async function paymentWebhook(request, response) {
  if (
    !Buffer.isBuffer(request.body) ||
    !verifyWebhookSignature(
      request.body,
      request.headers["x-razorpay-signature"],
    )
  )
    return response
      .status(401)
      .json({
        success: false,
        message: "Invalid webhook signature.",
        errors: [],
      });
  const event = JSON.parse(request.body.toString("utf8"));
  const entity =
    event.payload?.payment?.entity || event.payload?.refund?.entity;
  const payments = await getRows("PAYMENTS");
  const payment = payments.find(
    (row) =>
      row.RazorpayOrderID === entity?.order_id ||
      row.RazorpayPaymentID === entity?.payment_id ||
      row.RazorpayPaymentID === entity?.id,
  );
  if (!payment)
    return ok(response, { received: true }, "Webhook acknowledged.");
  if (event.event === "payment.authorized" && payment.Status !== "Paid") {
    payment.Status = "Authorized";
    payment.RazorpayPaymentID = entity.id;
    payment.TransactionReference = entity.id;
    payment.PaymentMethod = entity.method || "";
    await updateRow("PAYMENTS", payment._row, payment);
  }
  if (event.event === "payment.captured" && payment.Status !== "Paid") {
    const stored = remarks(payment.Remarks);
    await finalizePayment({
      paymentId: payment.PaymentID,
      customerId: payment.CustomerID,
      checkoutToken: stored.checkoutToken,
      razorpayOrderId: payment.RazorpayOrderID,
      razorpayPaymentId: entity.id,
      razorpaySignature: request.headers["x-razorpay-signature"],
      gatewayPayment: entity,
    });
  }
  if (event.event === "payment.failed" && payment.Status !== "Paid") {
    payment.Status = "Failed";
    payment.RazorpayPaymentID = entity?.id || "";
    payment.TransactionReference = payment.RazorpayPaymentID;
    payment.Remarks = encodeRemarks({
      ...remarks(payment.Remarks),
      message: entity?.error_description || "Payment failed",
    });
    await updateRow("PAYMENTS", payment._row, payment);
    await notifyPaymentFailure(payment).catch(() => {});
  }
  if (event.event === "refund.processed") {
    payment.Status = "Refunded";
    payment.Remarks = encodeRemarks({
      ...remarks(payment.Remarks),
      message: "Refund processed.",
    });
    await updateRow("PAYMENTS", payment._row, payment);
    const order = await findRow(
      "ORDERS",
      (row) => row.OrderID === payment.OrderID,
    );
    if (order) {
      order.PaymentStatus = "Refunded";
      order.OrderStatus = "Refunded";
      order.UpdatedAt = new Date().toISOString();
      await updateRow("ORDERS", order._row, order);
    }
  }
  ok(response, { received: true }, "Webhook processed.");
}
