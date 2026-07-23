import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { appendRow, batchUpdateRows, deleteRow, getRows, updateRow } from "./googleSheets.js";

const money = (value) => Number(Number(value || 0).toFixed(2));
const discountMoney = (value) => Math.round(Number(value || 0));
const intentSecret = () => `${env.jwtSecret}:checkout-intent`;

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeAddress(address = {}) {
  const normalized = {
    fullName:
      address.fullName ||
      address.name ||
      `${address.firstName || ""} ${address.lastName || ""}`.trim(),
    phone: String(address.phone || "").replace(/\D/g, "").slice(-10),
    addressLine1:
      address.addressLine1 || address.addressLine || address.address1,
    addressLine2: address.addressLine2 || address.address2 || "",
    landmark: address.landmark || "",
    city: address.city,
    state: address.state,
    pincode: address.pincode || address.pinCode,
    country: address.country || "India",
  };
  if (
    !normalized.fullName ||
    !normalized.addressLine1 ||
    !normalized.city ||
    !normalized.state ||
    !/^\d{6}$/.test(String(normalized.pincode || "")) ||
    !/^[6-9]\d{9}$/.test(normalized.phone)
  ) {
    throw httpError("Enter a complete and valid Indian shipping address.", 422);
  }
  return Object.fromEntries(
    Object.entries(normalized).map(([key, value]) => [
      key,
      String(value || "").trim(),
    ]),
  );
}

function normalizeItems(items = []) {
  const normalized = items
    .map((item) => ({
      productId: String(item.productId || item.id || "").trim(),
      quantity: Math.min(100, Math.max(1, Math.floor(Number(item.quantity || 1)))),
    }))
    .filter((item) => item.productId);
  return [...normalized.reduce((map, item) => map.set(item.productId, { productId: item.productId, quantity: (map.get(item.productId)?.quantity || 0) + item.quantity }), new Map()).values()];
}

async function pricedCart(customerId, requestedItems = []) {
  let items = normalizeItems(requestedItems);
  if (!items.length)
    items = (await getRows("CART"))
      .filter((row) => row.CustomerID === customerId)
      .map((row) => ({
        productId: row.ProductID,
        quantity: Math.max(1, Number(row.Quantity || 1)),
      }));
  if (!items.length) throw httpError("Your cart is empty.");

  const products = await getRows("PRODUCTS");
  return items.map((item) => {
    const product = products.find(
      (row) =>
        row.ProductID === item.productId &&
        String(row.Status || "active").toLowerCase() === "active",
    );
    if (!product || Number(product.Stock || 0) < item.quantity)
      throw httpError("One or more cart items are unavailable.", 409);
    const originalPrice = money(product.Price);
    const salePrice = Number(product.DiscountPrice || 0);
    const price = salePrice > 0 && salePrice < originalPrice ? money(salePrice) : originalPrice;
    return {
      productId: product.ProductID,
      productName: product.Name,
      price,
      originalPrice,
      productDiscount: money((originalPrice - price) * item.quantity),
      quantity: item.quantity,
      total: money(price * item.quantity),
    };
  });
}

const successfulOrder = (order) => String(order.PaymentStatus).toLowerCase() === "paid" || ["completed", "delivered"].includes(String(order.OrderStatus).toLowerCase());
const paymentRemarks = (value) => { try { return JSON.parse(value || "{}"); } catch { return {}; } };

async function firstOrderEligibility(customerId, paymentId) {
  const [customers, orders] = await Promise.all([getRows("CUSTOMERS"), getRows("ORDERS")]);
  const customer = customers.find((row) => row.CustomerID === customerId);
  if (!customer || String(customer.Provider || "").toLowerCase() === "guest") return false;
  if (orders.some((order) => order.CustomerID === customerId && successfulOrder(order))) return false;
  const now = Date.now();
  const payments = await getRows("PAYMENTS");
  return !payments.some((payment) => {
    if (payment.CustomerID !== customerId || payment.PaymentID === paymentId || ["Paid", "Failed", "Refunded"].includes(payment.Status)) return false;
    const metadata = paymentRemarks(payment.Remarks);
    return metadata.firstOrderReserved === true && new Date(metadata.checkoutExpiresAt || 0).getTime() > now;
  });
}

export function calculateOrderPricing({ items, couponDiscount = 0, freeShipping = false, firstOrderEligible = false }) {
  const subtotal = money(items.reduce((sum, item) => sum + Number(item.originalPrice) * Number(item.quantity), 0));
  const productDiscount = money(items.reduce((sum, item) => sum + Number(item.productDiscount || 0), 0));
  const sellingSubtotal = money(subtotal - productDiscount);
  const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const firstOrderDiscount = firstOrderEligible ? discountMoney(sellingSubtotal * 0.10) : 0;
  const shipping = freeShipping || quantity >= 2 ? 0 : quantity === 1 ? 29 : 0;
  const normalizedCouponDiscount = money(Math.min(sellingSubtotal, Math.max(0, couponDiscount)));
  const discount = money(productDiscount + firstOrderDiscount + normalizedCouponDiscount);
  return { quantity, subtotal, productDiscount, sellingSubtotal, discountedSubtotal: sellingSubtotal, firstOrderDiscount, couponDiscount: normalizedCouponDiscount, shipping, discount, tax: 0, grandTotal: money(Math.max(0, sellingSubtotal - firstOrderDiscount - normalizedCouponDiscount + shipping)) };
}

async function priceCoupon(code, subtotal, customerId) {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();
  if (!normalized) return { code: "", discount: 0, row: null };
  const coupon = (await getRows("COUPONS")).find(
    (row) =>
      String(row.Code).trim().toUpperCase() === normalized &&
      String(row.Status).toLowerCase() === "active",
  );
  if (!coupon) throw httpError("Coupon is not valid.", 404);
  if (coupon.Expiry && new Date(coupon.Expiry) < new Date())
    throw httpError("Coupon has expired.", 410);
  if (Number(coupon.MinOrder || 0) > subtotal)
    throw httpError(`Minimum order value is ₹${coupon.MinOrder}.`);
  if (
    Number(coupon.UsageLimit || 0) &&
    Number(coupon.UsedCount || 0) >= Number(coupon.UsageLimit)
  )
    throw httpError("Coupon usage limit reached.", 409);
  if (
    normalized === "PUFFFIRST" &&
    (await getRows("ORDERS")).some(
      (order) =>
        order.CustomerID === customerId && order.PaymentStatus === "Paid",
    )
  )
    throw httpError("PUFFFIRST is available on your first order only.", 409);
  let discount =
    coupon.Type === "flat"
      ? Number(coupon.Value || 0)
      : coupon.Type === "percent"
        ? discountMoney((subtotal * Number(coupon.Value || 0)) / 100)
        : 0;
  discount = money(
    Math.min(discount, Number(coupon.MaxDiscount || discount || 0)),
  );
  return {
    code: normalized,
    discount,
    row: coupon,
    freeShipping: coupon.Type === "shipping",
  };
}

export async function buildCheckoutIntent({
  customerId,
  address,
  items,
  couponCode,
  paymentId,
  firstOrderAllowed = false,
}) {
  const pricedItems = await pricedCart(customerId, items);
  const preliminary = calculateOrderPricing({ items: pricedItems });
  const { discountedSubtotal } = preliminary;
  const coupon = await priceCoupon(couponCode, discountedSubtotal, customerId);
  const firstOrderEligible = firstOrderAllowed && await firstOrderEligibility(customerId, paymentId);
  const pricing = calculateOrderPricing({ items: pricedItems, couponDiscount: coupon.discount, freeShipping: coupon.freeShipping, firstOrderEligible });
  const snapshot = {
    paymentId,
    customerId,
    address: normalizeAddress(address),
    items: pricedItems,
    couponCode: coupon.code,
    ...pricing,
    firstOrderEligible,
    firstOrderAllowed,
    currency: "INR",
  };
  return snapshot;
}

export function signCheckoutIntent(snapshot, razorpayOrderId) {
  return jwt.sign(
    { ...snapshot, razorpayOrderId, type: "checkout_intent" },
    intentSecret(),
    { expiresIn: "30m" },
  );
}

export function verifyCheckoutIntent(token) {
  const payload = jwt.verify(token, intentSecret());
  if (payload.type !== "checkout_intent")
    throw httpError("Invalid checkout session.", 401);
  return payload;
}

async function nextOrderNumber() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("-", "");
  const count = (await getRows("ORDERS")).filter((row) =>
    String(row.OrderNumber).startsWith(`LP${date}`),
  ).length;
  return `LP${date}${String(count + 1).padStart(4, "0")}`;
}

async function nextTrackingId() {
  const year = new Date().getFullYear();
  const numbers = (await getRows("ORDERS"))
    .map(
      (row) =>
        String(row.TrackingNumber || "").match(
          new RegExp(`^LP${year}(\\d{5})$`),
        )?.[1],
    )
    .filter(Boolean)
    .map(Number);
  return `LP${year}${String(Math.max(0, ...numbers) + 1).padStart(5, "0")}`;
}

let orderWriteQueue = Promise.resolve();

async function materializeOrderUnlocked({
  payment,
  snapshot,
  razorpayPaymentId = "",
  razorpaySignature = "",
  paymentMethod = "razorpay",
  paymentStatus = "Paid",
  gateway = "Razorpay",
}) {
  const orderId = `order-${payment.PaymentID}`;
  let order = (await getRows("ORDERS")).find((row) => row.OrderID === orderId);
  const revalidated = order
    ? snapshot
    : await buildCheckoutIntent({
        customerId: snapshot.customerId,
        address: snapshot.address,
        items: snapshot.items,
        couponCode: snapshot.couponCode,
        paymentId: snapshot.paymentId,
        firstOrderAllowed: snapshot.firstOrderAllowed === true,
      });
  if (
    Number(revalidated.grandTotal) !== Number(payment.Amount) ||
    revalidated.currency !== payment.Currency
  )
    throw httpError(
      "Cart total changed. Contact support with your payment ID.",
      409,
    );

  payment.Status = "Processing";
  await updateRow("PAYMENTS", payment._row, payment);
  const now = new Date().toISOString();
  const estimated = new Date();
  estimated.setDate(estimated.getDate() + 3);
  const addressId = `address-${payment.PaymentID}`;
  if (!(await getRows("ADDRESSES")).some((row) => row.AddressID === addressId))
    await appendRow("ADDRESSES", {
      AddressID: addressId,
      CustomerID: snapshot.customerId,
      FullName: snapshot.address.fullName,
      Phone: snapshot.address.phone,
      AddressLine1: snapshot.address.addressLine1,
      AddressLine2: snapshot.address.addressLine2,
      Landmark: snapshot.address.landmark,
      City: snapshot.address.city,
      State: snapshot.address.state,
      Pincode: snapshot.address.pincode,
      Country: snapshot.address.country,
      AddressType: "Home",
      IsDefault: false,
      CreatedAt: now,
    });
  if (!order) {
    order = {
      OrderID: orderId,
      OrderNumber: await nextOrderNumber(),
      CustomerID: snapshot.customerId,
      AddressID: addressId,
      Subtotal: revalidated.subtotal,
      ProductDiscount: revalidated.productDiscount,
      FirstOrderDiscount: revalidated.firstOrderDiscount,
      CouponDiscount: revalidated.couponDiscount,
      Shipping: revalidated.shipping,
      Discount: revalidated.discount,
      Tax: revalidated.tax,
      GrandTotal: revalidated.grandTotal,
      CouponCode: revalidated.couponCode,
      PaymentMethod: paymentMethod,
      PaymentStatus: paymentStatus,
      OrderStatus: "Confirmed",
      TrackingNumber: await nextTrackingId(),
      EstimatedDelivery: estimated.toISOString().slice(0, 10),
      CreatedAt: now,
      UpdatedAt: now,
    };
    await appendRow("ORDERS", order);
  }
  const products = await getRows("PRODUCTS");
  const existingItems = await getRows("ORDER_ITEMS");
  const createdItems = [];
  const inventoryUpdates = [];
  for (const [index, item] of revalidated.items.entries()) {
    const orderItemId = `item-${payment.PaymentID}-${index + 1}`;
    if (existingItems.some((row) => row.OrderItemID === orderItemId)) continue;
    await appendRow("ORDER_ITEMS", {
      OrderItemID: orderItemId,
      OrderID: orderId,
      ProductID: item.productId,
      ProductName: item.productName,
      Price: item.price,
      Quantity: item.quantity,
      Total: item.total,
    });
    createdItems.push(orderItemId);
    const product = products.find((row) => row.ProductID === item.productId);
    if (!product || Number(product.Stock) < item.quantity) throw httpError("Inventory changed while confirming this order.", 409);
    product.Stock = Number(product.Stock) - item.quantity;
    inventoryUpdates.push({ rowNumber: product._row, record: product });
  }
  try {
    await batchUpdateRows("PRODUCTS", inventoryUpdates);
  } catch (error) {
    // Compensate item rows when inventory could not be committed. This keeps a
    // retry from treating an unadjusted item as already materialized.
    const rows = (await getRows("ORDER_ITEMS")).filter((row) => createdItems.includes(row.OrderItemID)).sort((a, b) => b._row - a._row);
    await Promise.allSettled(rows.map((row) => deleteRow("ORDER_ITEMS", row._row)));
    throw error;
  }
  const paymentNotes = (() => {
    try {
      return JSON.parse(payment.Remarks || "{}");
    } catch {
      return {};
    }
  })();
  if (revalidated.couponCode && !paymentNotes.couponApplied) {
    const coupon = (await getRows("COUPONS")).find(
      (row) => row.Code === revalidated.couponCode,
    );
    if (coupon) {
      coupon.UsedCount = Number(coupon.UsedCount || 0) + 1;
      await updateRow("COUPONS", coupon._row, coupon);
    }
    paymentNotes.couponApplied = true;
    payment.Remarks = JSON.stringify(paymentNotes);
    await updateRow("PAYMENTS", payment._row, payment);
  }
  if (
    !(await getRows("ORDER_TRACKING")).some(
      (row) => row.TrackingID === `tracking-${payment.PaymentID}`,
    )
  )
    await appendRow("ORDER_TRACKING", {
      TrackingID: `tracking-${payment.PaymentID}`,
      OrderID: orderId,
      CurrentStatus: "Confirmed",
      UpdatedBy: gateway,
      Remarks:
        paymentStatus === "Paid"
          ? "Payment confirmed. Your order is being prepared."
          : "Cash on Delivery order confirmed. Your order is being prepared.",
      UpdatedAt: now,
      EstimatedDeliveryDate: order.EstimatedDelivery,
    });
  const cartRows = (await getRows("CART"))
    .filter((row) => row.CustomerID === snapshot.customerId && snapshot.items.some((item) => item.productId === row.ProductID))
    .sort((a, b) => b._row - a._row);
  for (const row of cartRows) await deleteRow("CART", row._row);

  Object.assign(payment, {
    OrderID: orderId,
    RazorpayPaymentID: razorpayPaymentId,
    RazorpaySignature: razorpaySignature,
    PaymentMethod: paymentMethod,
    Status: paymentStatus,
    PaidAt: paymentStatus === "Paid" ? now : "",
    TransactionReference: razorpayPaymentId || payment.PaymentID,
    Gateway: gateway,
    Remarks: JSON.stringify({
      ...paymentNotes,
      message:
        paymentStatus === "Paid"
          ? "Payment verified and order confirmed."
          : "Cash on Delivery order confirmed.",
    }),
  });
  await updateRow("PAYMENTS", payment._row, payment);
  return order;
}

function materializeOrder(options) {
  const operation = orderWriteQueue.catch(() => {}).then(() => materializeOrderUnlocked(options));
  orderWriteQueue = operation.catch(() => {});
  return operation;
}

export function materializePaidOrder(options) {
  return materializeOrder(options);
}

export function materializeCashOnDeliveryOrder({ payment, snapshot }) {
  return materializeOrder({
    payment,
    snapshot,
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    gateway: "Cash on Delivery",
  });
}
