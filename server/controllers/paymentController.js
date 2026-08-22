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
import {
  createShipment,
  preferredShippingProvider,
} from "../services/shippingService.js";
import { logger } from "../utils/logger.js";
import { safelyQueuePurchase } from "../services/meta/PurchaseQueueService.js";
import { isValidCapturedPayment } from "../services/meta/PurchasePolicy.js";

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
const requestMetaAttribution = (request) => ({
  fbp: String(request.body?.metaAttribution?.fbp || '').trim(),
  fbc: String(request.body?.metaAttribution?.fbc || '').trim(),
  clientIp: String(request.get('x-forwarded-for') || '').split(',')[0].trim() || request.ip || '',
  clientUserAgent: request.get('user-agent') || '',
});

const scheduleBackgroundTask = (taskName, task, context = {}) => {
  setImmediate(() => {
    const startedAt = Date.now();
    logger.info("background.task.started", { task: taskName, ...context });
    Promise.resolve()
      .then(task)
      .then(() =>
        logger.info("background.task.completed", {
          task: taskName,
          durationMs: Date.now() - startedAt,
          ...context,
        }),
      )
      .catch((error) =>
        logger.error("background.task.failed", {
          task: taskName,
          durationMs: Date.now() - startedAt,
          code: error?.code,
          error: error?.message || String(error),
          ...context,
        }),
      );
  });
};

const schedulePostPaymentTasks = ({
  order,
  payment,
  snapshot,
  correlationId,
}) => {
  const context = {
    correlationId: correlationId || order.OrderID,
    orderId: order.OrderID,
    paymentId: payment.PaymentID,
  };
  const shippingAddress = {
    name: snapshot.address.fullName,
    phone: snapshot.address.phone,
    addressLine: [
      snapshot.address.addressLine1,
      snapshot.address.addressLine2,
      snapshot.address.landmark,
    ]
      .filter(Boolean)
      .join(", "),
    city: snapshot.address.city,
    state: snapshot.address.state,
    pincode: snapshot.address.pincode,
  };

  scheduleBackgroundTask(
    "shipment.create",
    () =>
      createShipment(
        { ...order, shippingAddress, items: snapshot.items },
        preferredShippingProvider(),
        context,
      ),
    context,
  );
  scheduleBackgroundTask(
    "notification.payment-success",
    () => notifyPaymentSuccess(order, payment, context),
    context,
  );
};

function publicPayment(row) {
  const method = String(row.PaymentMethod || '').trim().toLowerCase();
  const gateway = row.Gateway || (method === 'cod' || method.includes('cash') ? 'Cash on Delivery' : 'Razorpay');
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
    gateway,
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
  correlationId,
  allowExpiredCheckout = false,
}) {
  return withPaymentLock(paymentId, async () => {
    logger.info("payment.finalization.started", {
      correlationId,
      paymentId,
      razorpayOrderId,
      razorpayPaymentId,
    });
    const payment = await findRow(
      "PAYMENTS",
      (row) => row.PaymentID === paymentId,
    );
    const snapshot = verifyCheckoutIntent(checkoutToken, { allowExpired: allowExpiredCheckout });
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
      logger.info("payment.finalization.replay", {
        correlationId,
        paymentId,
        orderId: payment.OrderID,
        razorpayPaymentId,
      });
      const order = await findRow(
        "ORDERS",
        (row) => row.OrderID === payment.OrderID,
      );
      const itemCount = order
        ? (await getRows("ORDER_ITEMS")).filter((row) => row.OrderID === order.OrderID).length
        : 0;
      if (!order || itemCount < snapshot.items.length) {
        logger.warn("payment.finalization.incomplete_replay", {
          correlationId,
          paymentId,
          orderId: payment.OrderID,
          orderExists: Boolean(order),
          itemCount,
          expectedItemCount: snapshot.items.length,
        });
      } else {
        await safelyQueuePurchase(
          order.OrderID,
        remarks(payment.Remarks).metaAttribution || {},
        { correlationId, orderId: order.OrderID, paymentId: payment.PaymentID },
        );
        const shipment = (await getRows("SHIPMENTS")).find((row) => row.OrderID === order.OrderID);
        if (!shipment || ["failed", "retry pending"].includes(String(shipment.ShippingStatus || "").trim().toLowerCase())) {
          const context = { correlationId, orderId: order.OrderID, paymentId: payment.PaymentID };
          scheduleBackgroundTask("shipment.create", () => createShipment({
            ...order,
            shippingAddress: {
              name: snapshot.address.fullName,
              phone: snapshot.address.phone,
              addressLine: [snapshot.address.addressLine1, snapshot.address.addressLine2, snapshot.address.landmark].filter(Boolean).join(", "),
              city: snapshot.address.city,
              state: snapshot.address.state,
              pincode: snapshot.address.pincode,
            },
            items: snapshot.items,
          }, preferredShippingProvider(), context), context);
        }
        return { order, payment, replay: true };
      }
    }
    if (payment.RazorpayOrderID !== razorpayOrderId || snapshot.razorpayOrderId !== razorpayOrderId) {
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
    if (!isValidCapturedPayment({ payment, snapshot, gatewayPayment })) {
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
    logger.info("payment.finalization.durable", {
      correlationId,
      paymentId: saved.PaymentID,
      orderId: order.OrderID,
      razorpayPaymentId,
    });
    schedulePostPaymentTasks({
      order,
      payment: saved,
      snapshot,
      correlationId,
    });
    await safelyQueuePurchase(
      order.OrderID,
      remarks(saved.Remarks).metaAttribution || {},
      { correlationId, orderId: order.OrderID, paymentId: saved.PaymentID },
    );
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
    paymentMethod: "online",
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
      checkoutExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      pricing: { subtotal: snapshot.subtotal, couponDiscount: snapshot.couponDiscount, shipping: snapshot.shipping, tax: snapshot.tax, grandTotal: snapshot.grandTotal, paymentMethod: snapshot.paymentMethod },
      metaAttribution: requestMetaAttribution(request),
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
      pricing: { subtotal: snapshot.subtotal, couponDiscount: snapshot.couponDiscount, discount: snapshot.discount, shipping: snapshot.shipping, shippingIncluded: snapshot.shippingIncluded, tax: snapshot.tax, grandTotal: snapshot.grandTotal, paymentMethod: snapshot.paymentMethod, offerStatus: snapshot.offerStatus },
    },
    "Secure payment prepared.",
  );
}

export function createPaymentOrder(request, response) { return withCheckoutLock(request.customer.id, () => createPaymentOrderUnlocked(request, response)); }

async function createCashOnDeliveryOrderUnlocked(request, response) {
  const checkoutRequestId = String(request.body.checkoutRequestId || '').trim().slice(0, 120);
  if (checkoutRequestId) {
    const prior = (await getRows('PAYMENTS')).find((row) => row.CustomerID === request.customer.id && row.TransactionReference === `cod:${checkoutRequestId}`);
    if (prior?.OrderID) {
      const order = await findRow('ORDERS', (row) => row.OrderID === prior.OrderID);
      return ok(response, { order, payment: publicPayment(prior), replay: true }, 'Cash on Delivery order was already confirmed.');
    }
    if (prior) return response.status(409).json({ success: false, message: 'This Cash on Delivery order is still being processed.' });
  }
  const paymentId = createId("payment");
  const snapshot = await buildCheckoutIntent({
    customerId: request.customer.id,
    address: request.body.address,
    items: request.body.items,
    couponCode: request.body.couponCode || request.body.coupon,
    paymentId,
    paymentMethod: "cod",
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
    TransactionReference: checkoutRequestId ? `cod:${checkoutRequestId}` : paymentId,
    Gateway: "Cash on Delivery",
    Remarks: encodeRemarks({ pricing: { subtotal: snapshot.subtotal, couponDiscount: snapshot.couponDiscount, shipping: snapshot.shipping, shippingIncluded: snapshot.shippingIncluded, tax: snapshot.tax, grandTotal: snapshot.grandTotal, paymentMethod: snapshot.paymentMethod }, metaAttribution: requestMetaAttribution(request), message: "Creating Cash on Delivery order." }),
  });
  const payment = await findRow(
    "PAYMENTS",
    (row) => row.PaymentID === paymentId,
  );
  const order = await materializeCashOnDeliveryOrder({ payment, snapshot });
  const saved = await findRow("PAYMENTS", (row) => row.PaymentID === paymentId);
  scheduleBackgroundTask(
    "shipment.create",
    () => createShipment({ ...order, shippingAddress: {
      name: snapshot.address.fullName,
      phone: snapshot.address.phone,
      addressLine: [snapshot.address.addressLine1, snapshot.address.addressLine2, snapshot.address.landmark].filter(Boolean).join(', '),
      city: snapshot.address.city,
      state: snapshot.address.state,
      pincode: snapshot.address.pincode,
    }, items: snapshot.items }, preferredShippingProvider(), { correlationId: request.id, orderId: order.OrderID, paymentId }),
    { correlationId: request.id, orderId: order.OrderID, paymentId },
  );
  scheduleBackgroundTask(
    "notification.cash-on-delivery-success",
    () =>
      notifyPaymentSuccess(order, saved, {
        correlationId: request.id,
        orderId: order.OrderID,
        paymentId: saved.PaymentID,
      }),
    {
      correlationId: request.id,
      orderId: order.OrderID,
      paymentId: saved.PaymentID,
    },
  );
  created(
    response,
    { order, payment: publicPayment(saved) },
    "Cash on Delivery order confirmed.",
  );
}

export function createCashOnDeliveryOrder(request, response) { return withCheckoutLock(request.customer.id, () => createCashOnDeliveryOrderUnlocked(request, response)); }

export async function verifyPayment(request, response) {
  logger.info("payment.verification.requested", {
    correlationId: request.id,
    paymentId: request.body.paymentId,
    razorpayOrderId: request.body.razorpayOrderId,
    razorpayPaymentId: request.body.razorpayPaymentId,
  });
  if (!verifyRazorpaySignature(request.body)) {
    logger.warn("payment.verification.signature_rejected", {
      correlationId: request.id,
      paymentId: request.body.paymentId,
      razorpayOrderId: request.body.razorpayOrderId,
      razorpayPaymentId: request.body.razorpayPaymentId,
    });
    return response
      .status(400)
      .json({
        success: false,
        message: "Payment signature verification failed.",
      });
  }
  const gatewayPayment = await fetchRazorpayPayment(
    request.body.razorpayPaymentId,
  );
  logger.info("payment.verification.gateway_validated", {
    correlationId: request.id,
    paymentId: request.body.paymentId,
    razorpayPaymentId: request.body.razorpayPaymentId,
    gatewayStatus: gatewayPayment.status,
  });
  const result = await finalizePayment({
    ...request.body,
    customerId: request.customer.id,
    gatewayPayment,
    correlationId: request.id,
  });
  logger.info("payment.verification.completed", {
    correlationId: request.id,
    paymentId: result.payment.PaymentID,
    orderId: result.order?.OrderID,
    replay: result.replay,
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
    const context = {
      correlationId: request.id,
      paymentId: payment.PaymentID,
      razorpayPaymentId: payment.RazorpayPaymentID,
    };
    scheduleBackgroundTask(
      "notification.payment-failure",
      () => notifyPaymentFailure(payment, context),
      context,
    );
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
  logger.info("razorpay.webhook.received", {
    correlationId: request.id,
    bodyIsBuffer: Buffer.isBuffer(request.body),
    hasSignature: Boolean(request.headers["x-razorpay-signature"]),
  });
  if (
    !Buffer.isBuffer(request.body) ||
    !verifyWebhookSignature(
      request.body,
      request.headers["x-razorpay-signature"],
    )
  ) {
    logger.warn("razorpay.webhook.signature_rejected", {
      correlationId: request.id,
      bodyIsBuffer: Buffer.isBuffer(request.body),
      hasSignature: Boolean(request.headers["x-razorpay-signature"]),
    });
    return response
      .status(401)
      .json({
        success: false,
        message: "Invalid webhook signature.",
        errors: [],
      });
  }
  const event = JSON.parse(request.body.toString("utf8"));
  const entity =
    event.payload?.payment?.entity || event.payload?.refund?.entity;
  const webhookContext = {
    correlationId: request.id,
    webhookEventId: event.id,
    webhookEvent: event.event,
    razorpayOrderId: entity?.order_id,
    razorpayPaymentId: entity?.payment_id || entity?.id,
  };
  logger.info("razorpay.webhook.signature_validated", webhookContext);
  const payments = await getRows("PAYMENTS");
  const payment = payments.find(
    (row) =>
      row.RazorpayOrderID === entity?.order_id ||
      row.RazorpayPaymentID === entity?.payment_id ||
      row.RazorpayPaymentID === entity?.id,
  );
  if (!payment) {
    logger.warn("razorpay.webhook.payment_not_found", webhookContext);
    return ok(response, { received: true }, "Webhook acknowledged.");
  }
  logger.info("razorpay.webhook.payment_matched", {
    ...webhookContext,
    paymentId: payment.PaymentID,
    orderId: payment.OrderID,
    paymentStatus: payment.Status,
  });
  if (event.event === "payment.authorized" && payment.Status !== "Paid") {
    payment.Status = "Authorized";
    payment.RazorpayPaymentID = entity.id;
    payment.TransactionReference = entity.id;
    payment.PaymentMethod = entity.method || "";
    await updateRow("PAYMENTS", payment._row, payment);
    logger.info("razorpay.webhook.payment_authorized", {
      ...webhookContext,
      paymentId: payment.PaymentID,
    });
  }
  if (event.event === "payment.captured") {
    const stored = remarks(payment.Remarks);
    await finalizePayment({
      paymentId: payment.PaymentID,
      customerId: payment.CustomerID,
      checkoutToken: stored.checkoutToken,
      razorpayOrderId: payment.RazorpayOrderID,
      razorpayPaymentId: entity.id,
      razorpaySignature: request.headers["x-razorpay-signature"],
      gatewayPayment: entity,
      correlationId: request.id,
      allowExpiredCheckout: true,
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
    const context = {
      ...webhookContext,
      paymentId: payment.PaymentID,
      orderId: payment.OrderID,
    };
    scheduleBackgroundTask(
      "notification.webhook-payment-failure",
      () => notifyPaymentFailure(payment, context),
      context,
    );
    logger.info("razorpay.webhook.payment_failure_recorded", context);
  } else if (event.event === "payment.failed") {
    logger.info("razorpay.webhook.replay_ignored", {
      ...webhookContext,
      paymentId: payment.PaymentID,
      orderId: payment.OrderID,
      reason: "payment_already_paid",
    });
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
    logger.info("razorpay.webhook.refund_recorded", {
      ...webhookContext,
      paymentId: payment.PaymentID,
      orderId: payment.OrderID,
    });
  }
  logger.info("razorpay.webhook.processed", {
    ...webhookContext,
    paymentId: payment.PaymentID,
    orderId: payment.OrderID,
  });
  ok(response, { received: true }, "Webhook processed.");
}
