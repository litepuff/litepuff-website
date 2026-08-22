import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { appendRow, batchUpdateRows, deleteRow, getRows, updateRow } from "./googleSheets.js";
import { productPricing } from "../utils/productPricing.js";
import { calculateOrderPricing } from "../../shared/orderPricing.js";
import { singleOfferPrice } from "../../shared/offerConfig.js";
import { comboDefinition, getOfferConfig } from "./offerService.js";

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
  return items.map((item, index) => {
    if (String(item.type).toLowerCase() === 'combo') {
      return {
        type: 'combo',
        comboType: String(item.comboType || '').toUpperCase(),
        comboId: String(item.comboId || item.id || `combo-${index + 1}`).trim(),
        items: Array.isArray(item.items) ? item.items.map((selection) => ({
          productId: String(selection.productId || selection.id || '').trim(),
          quantity: Math.min(100, Math.max(1, Math.floor(Number(selection.quantity || 1)))),
        })).filter((selection) => selection.productId) : [],
      };
    }
    return {
      type: 'product',
      productId: String(item.productId || item.id || '').trim(),
      quantity: Math.min(100, Math.max(1, Math.floor(Number(item.quantity || 1)))),
    };
  }).filter((item) => item.type === 'combo' || item.productId);
}

async function pricedCart(customerId, requestedItems = []) {
  let items = normalizeItems(requestedItems);
  if (!items.length)
    items = (await getRows("CART"))
      .filter((row) => row.CustomerID === customerId)
      .map((row) => ({
        type: 'product', productId: row.ProductID,
        quantity: Math.max(1, Number(row.Quantity || 1)),
      }));
  if (!items.length) throw httpError("Your cart is empty.");

  const [products, offerConfig] = await Promise.all([getRows("PRODUCTS"), getOfferConfig()]);
  const requiredStock = new Map();
  const addRequired = (productId, quantity) => requiredStock.set(productId, (requiredStock.get(productId) || 0) + quantity);
  items.forEach((line) => line.type === 'combo'
    ? line.items.forEach((item) => addRequired(item.productId, item.quantity))
    : addRequired(line.productId, line.quantity));
  for (const [productId, quantity] of requiredStock) {
    const product = products.find((row) => row.ProductID === productId && String(row.Status || 'active').toLowerCase() === 'active');
    if (!product || Number(product.Stock || 0) < quantity) throw httpError("One or more cart items are unavailable.", 409);
  }

  return items.flatMap((item, lineIndex) => {
    if (item.type === 'combo') {
      const combo = comboDefinition(offerConfig, item.comboType);
      const selectedQuantity = item.items.reduce((sum, selection) => sum + selection.quantity, 0);
      if (!combo || !combo.enabled || selectedQuantity !== combo.requiredItems) throw httpError('Select exactly the required number of available products for this combo.', 422);
      let allocated = 0;
      const unitPrice = money(combo.price / combo.requiredItems);
      return item.items.map((selection, selectionIndex) => {
        const product = products.find((row) => row.ProductID === selection.productId);
        const isLast = selectionIndex === item.items.length - 1;
        const total = isLast ? money(combo.price - allocated) : money(unitPrice * selection.quantity);
        allocated = money(allocated + total);
        return {
          type: 'combo', comboId: item.comboId || `combo-${lineIndex + 1}`, comboType: item.comboType,
          comboName: `LitePuff ${combo.requiredItems}-Product Combo`, comboPrice: combo.price,
          freeDelivery: combo.freeDelivery, productId: product.ProductID,
          metaCatalogId: String(product.MetaCatalogID || '').trim(), productName: product.Name,
          price: money(total / selection.quantity), originalPrice: Number(product.Price || productPricing().mrp),
          productDiscount: 0, quantity: selection.quantity, total,
        };
      });
    }
    const product = products.find(
      (row) =>
        row.ProductID === item.productId &&
        String(row.Status || "active").toLowerCase() === "active",
    );
    if (!product || Number(product.Stock || 0) < item.quantity)
      throw httpError("One or more cart items are unavailable.", 409);
    const originalPrice = Number(product.Price || productPricing().mrp);
    const price = singleOfferPrice(originalPrice, offerConfig);
    return [{
      type: 'product', comboId: '', comboType: '', comboName: '', comboPrice: 0, freeDelivery: false,
      productId: product.ProductID,
      metaCatalogId: String(product.MetaCatalogID || '').trim(),
      productName: product.Name,
      price,
      originalPrice,
      productDiscount: money((originalPrice - price) * item.quantity),
      quantity: item.quantity,
      total: money(price * item.quantity),
    }];
  });
}

export { calculateOrderPricing };

async function legacyCouponPricing(code, subtotal) {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();
  if (!normalized) return { code: "", discount: 0, row: null };
  const coupons = await getRows("COUPONS");
  const coupon = coupons.find(
    (row) =>
      String(row.Code).trim().toUpperCase() === normalized &&
      String(row.Status).toLowerCase() === "active",
  );
  if (!coupon) throw httpError("Invalid coupon code.", 404);
  if (coupon.Expiry && new Date(coupon.Expiry) < new Date())
    throw httpError("Coupon has expired.", 410);
  if (Number(coupon.MinOrder || 0) > subtotal)
    throw httpError(`Minimum order value is ₹${coupon.MinOrder}.`);
  if (
    Number(coupon.UsageLimit || 0) &&
    Number(coupon.UsedCount || 0) >= Number(coupon.UsageLimit)
  )
    throw httpError("Coupon usage limit reached.", 409);
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

async function priceOnlineCoupon(code, subtotal, paymentMethod) {
  const normalized = String(code || "").trim().toUpperCase();
  if (String(paymentMethod).toLowerCase() === "cod") return { code: "", discount: 0, row: null, freeShipping: false };
  if (!normalized) return { code: "", discount: 0, row: null, freeShipping: false };
  const coupon = (await getRows("COUPONS")).find((row) => String(row.Code || "").trim().toUpperCase() === normalized);
  if (!coupon || String(coupon.Status || "active").toLowerCase() !== "active") throw httpError("Invalid Coupon Code.", 404);
  if (coupon.Expiry && new Date(coupon.Expiry) < new Date()) throw httpError("Offer Expired.", 410);
  if (Number(coupon.MinOrder || 0) > subtotal) throw httpError(`Minimum order value is ₹${coupon.MinOrder}.`, 422);
  if (Number(coupon.UsageLimit || 0) && Number(coupon.UsedCount || 0) >= Number(coupon.UsageLimit)) throw httpError("Coupon usage limit reached.", 409);
  const type = String(coupon.Type || '').toLowerCase();
  if (type === 'percent' && Number(coupon.Value) !== 15) throw httpError('This promotion is no longer active.', 409);
  let discount = type === 'percent' ? discountMoney(subtotal * Number(coupon.Value || 0) / 100) : type === 'flat' ? money(coupon.Value) : 0;
  discount = money(Math.min(discount, Number(coupon.MaxDiscount || discount || 0), subtotal));
  return { code: normalized, discount, row: coupon, freeShipping: type === 'shipping' };
}

export async function buildCheckoutIntent({
  customerId,
  address,
  items,
  couponCode,
  paymentId,
  paymentMethod = "online",
}) {
  const requestedItems = normalizeItems(items);
  const pricedItems = await pricedCart(customerId, requestedItems);
  const preliminary = calculateOrderPricing({ items: pricedItems });
  const coupon = await priceOnlineCoupon(couponCode, preliminary.sellingSubtotal, paymentMethod);
  const pricing = calculateOrderPricing({
    items: pricedItems,
    couponCode: coupon.code,
    couponDiscount: coupon.discount,
    paymentMethod,
  });
  const snapshot = {
    paymentId,
    customerId,
    address: normalizeAddress(address),
    items: pricedItems,
    requestedItems,
    couponCode: coupon.code,
    ...pricing,
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

export function verifyCheckoutIntent(token, { allowExpired = false } = {}) {
  const payload = jwt.verify(token, intentSecret(), { ignoreExpiration: allowExpired });
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
  // The signed checkout intent is the historical, server-authored price and
  // item snapshot. Re-pricing a captured payment against today's catalog can
  // strand a valid payment after an offer/product change. Stock is still
  // checked immediately before the exactly-once inventory mutation below.
  const revalidated = snapshot;
  if (
    snapshot.paymentId !== payment.PaymentID ||
    snapshot.customerId !== payment.CustomerID ||
    !Array.isArray(revalidated.items) ||
    !revalidated.items.length ||
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
  estimated.setDate(estimated.getDate() + 2);
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
  const createdItemRecords = [];
  const inventoryUpdates = [];
  for (const [index, item] of revalidated.items.entries()) {
    const orderItemId = `item-${payment.PaymentID}-${index + 1}`;
    if (existingItems.some((row) => row.OrderItemID === orderItemId)) continue;
    await appendRow("ORDER_ITEMS", {
      OrderItemID: orderItemId,
      OrderID: orderId,
      ProductID: item.productId,
      MetaCatalogID: item.metaCatalogId,
      LineType: item.type,
      ComboID: item.comboId,
      ComboType: item.comboType,
      ComboName: item.comboName,
      ComboPrice: item.comboPrice,
      FreeDelivery: item.freeDelivery,
      ProductName: item.productName,
      Price: item.price,
      Quantity: item.quantity,
      Total: item.total,
    });
    createdItems.push(orderItemId);
    createdItemRecords.push(item);
  }
  const requiredInventory = createdItemRecords.reduce((map, item) => map.set(item.productId, (map.get(item.productId) || 0) + item.quantity), new Map());
  for (const [productId, quantity] of requiredInventory) {
    const product = products.find((row) => row.ProductID === productId);
    if (!product || Number(product.Stock) < quantity) throw httpError("Inventory changed while confirming this order.", 409);
    product.Stock = Number(product.Stock) - quantity;
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
