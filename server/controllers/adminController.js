import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import {
  appendRow,
  deleteRow,
  getRows,
  updateRow,
} from "../services/googleSheets.js";
import { ok, created } from "../utils/apiResponse.js";
import { createId } from "../utils/createId.js";
import { slugify } from "../utils/slugify.js";
import { customerBusinessService } from "../services/business/CustomerService.js";
import { notificationService } from "../services/NotificationService.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { productPricing } from "../utils/productPricing.js";
import { adminSheetsService } from "../services/AdminSheetsService.js";

const now = () => new Date().toISOString();
const money = (value) => Number(Number(value || 0).toFixed(2));
const bool = (value) =>
  value === true || String(value).toLowerCase() === "true";
const text = (value) => String(value || "").trim();
const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Packed",
  "Ready for Dispatch",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Returned",
  "Refunded",
];

const adminRole = (role) => {
  const normalized = text(role).toLowerCase().replaceAll(" ", "_");
  if (normalized === "owner") return "super_admin";
  return ["super_admin", "admin", "manager", "support"].includes(normalized)
    ? normalized
    : "";
};
const adminProfile = (row) => ({
  id: row.AdminID,
  name: row.Name,
  email: row.Email,
  role: "admin",
  adminRole: adminRole(row.Role),
});

const filterSearch = (rows, query, fields) => {
  const q = text(query).toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    fields.some((field) => text(row[field]).toLowerCase().includes(q)),
  );
};

const paginate = (rows, request) => {
  const page = Math.max(1, Number(request.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(request.query.limit || 25)));
  const start = (page - 1) * limit;
  return {
    data: rows.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: rows.length,
      pages: Math.ceil(rows.length / limit) || 1,
    },
  };
};

const rowById = async (sheet, column, id) => {
  const row = (await getRows(sheet)).find((item) => item[column] === id);
  if (!row) {
    const error = new Error(`${sheet.replaceAll("_", " ")} record not found.`);
    error.status = 404;
    throw error;
  }
  return row;
};

const productDto = (row) => {
  const pricing = productPricing();
  return ({
  id: row.ProductID,
  productId: row.ProductID,
  name: row.Name,
  slug: row.Slug,
  category: row.Category,
  flavor: row.Flavor,
  price: pricing.mrp,
  discountPrice: pricing.sellingPrice,
  weight: pricing.weight,
  stock: Number(row.Stock || 0),
  featured: bool(row.Featured),
  bestSeller: bool(row.BestSeller),
  status: row.Status,
  primaryImage: row.PrimaryImage,
  nutritionPDF: row.NutritionPDF,
  createdAt: row.CreatedAt,
  updatedAt: row.UpdatedAt,
  });
};

const orderDto = (row, customer = null, items = [], payment = null, shipment = null) => ({
  id: row.OrderID,
  orderId: row.OrderID,
  orderNumber: row.OrderNumber,
  customerId: row.CustomerID,
  customer,
  items,
  subtotal: Number(row.Subtotal || 0),
  productDiscount: Number(row.ProductDiscount || 0),
  couponDiscount: Number(row.CouponDiscount || 0),
  shipping: Number(row.Shipping || 0),
  discount: Number(row.Discount || 0),
  tax: Number(row.Tax || 0),
  grandTotal: Number(row.GrandTotal || 0),
  paymentMethod: payment?.PaymentMethod || row.PaymentMethod,
  paymentStatus: payment?.Status || row.PaymentStatus,
  transactionId:
    payment?.TransactionReference || payment?.RazorpayPaymentID || "",
  gateway: payment?.Gateway || "Razorpay",
  paymentAmount: Number(payment?.Amount || row.GrandTotal || 0),
  paymentDate: payment?.PaidAt || "",
  status: row.OrderStatus,
  orderStatus: row.OrderStatus,
  trackingNumber: row.TrackingNumber,
  shippingProvider: shipment?.Provider || row.ShippingProvider,
  awbNumber: shipment?.AWBNumber || row.AWBNumber,
  courierName: shipment?.CourierName || row.CourierName,
  trackingUrl: shipment?.TrackingURL || row.TrackingURL,
  shippingStatus: shipment?.ShippingStatus || row.ShippingStatus || 'Pending Shipment',
  pickupStatus: shipment?.PickupStatus || row.PickupStatus,
  labelUrl: shipment?.LabelURL || row.LabelURL,
  manifestUrl: shipment?.ManifestURL || row.ManifestURL,
  estimatedDelivery: row.EstimatedDelivery,
  createdAt: row.CreatedAt,
  updatedAt: row.UpdatedAt,
});

export async function adminLogin(request, response) {
  const email = String(request.body?.email || "").trim().toLowerCase();
  const password = String(request.body?.password || "");
  if (!email || !password) throw new AppError("Email and password are required.", { status: 422, code: "VALIDATION_ERROR", expose: true });
  if (!env.adminSpreadsheetId || !env.jwtSecret) {
    logger.error("auth.admin.configuration-invalid", { requestId: request.id, databaseConfigured: Boolean(env.adminSpreadsheetId), jwtConfigured: Boolean(env.jwtSecret) });
    throw new AppError("Admin authentication is not configured.", { status: 503, code: "ADMIN_AUTH_NOT_CONFIGURED", expose: true });
  }
  let row;
  try {
    row = await adminSheetsService.findAdminByEmail(email);
  } catch (error) {
    logger.error("auth.admin.database-unavailable", { requestId: request.id, code: error.code, error: error.message });
    throw new AppError("Admin authentication is temporarily unavailable.", { status: 503, code: "ADMIN_AUTH_UNAVAILABLE", expose: true, cause: error });
  }
  if (!row) {
    logger.warn("auth.admin.login-rejected", { requestId: request.id, reason: "email-not-found" });
    throw new AppError("The email or password is incorrect.", { status: 401, code: "INVALID_ADMIN_CREDENTIALS", expose: true });
  }
  if (text(row.Status).toLowerCase() !== "active") {
    logger.warn("auth.admin.login-rejected", { requestId: request.id, reason: "inactive-admin", adminId: row.AdminID });
    throw new AppError("This admin account is inactive.", { status: 403, code: "ADMIN_INACTIVE", expose: true });
  }
  if (!adminRole(row.Role)) {
    logger.error("auth.admin.role-invalid", { requestId: request.id, adminId: row.AdminID, role: row.Role });
    throw new AppError("Admin authentication is temporarily unavailable.", { status: 503, code: "ADMIN_ROLE_INVALID", expose: true });
  }
  let passwordMatches = false;
  try {
    passwordMatches = await bcrypt.compare(password, row.PasswordHash);
  } catch (error) {
    logger.error("auth.admin.password-hash-invalid", { requestId: request.id, adminId: row.AdminID });
    throw new AppError("Admin authentication is temporarily unavailable.", { status: 500, code: "ADMIN_AUTH_CONFIGURATION_ERROR", expose: true, cause: error });
  }
  if (!passwordMatches) {
    logger.warn("auth.admin.login-rejected", { requestId: request.id, reason: "password-mismatch", adminId: row.AdminID });
    throw new AppError("The email or password is incorrect.", { status: 401, code: "INVALID_ADMIN_CREDENTIALS", expose: true });
  }
  const admin = adminProfile(row);
  let token;
  try { token = jwt.sign(admin, env.jwtSecret, { algorithm: "HS256", expiresIn: "7d" }); }
  catch (error) {
    logger.error("auth.admin.token-generation-failed", { requestId: request.id, error: error.message });
    throw new AppError("Admin authentication is temporarily unavailable.", { status: 503, code: "ADMIN_AUTH_UNAVAILABLE", expose: true, cause: error });
  }
  const timestamp = now();
  await adminSheetsService.updateAdmin(row, { LastLogin: timestamp, UpdatedAt: timestamp });
  await adminSheetsService.recordActivity({ request, admin, action: "Login", module: "Authentication" });
  logger.info("auth.admin.login-succeeded", { requestId: request.id, role: admin.role });
  ok(response, { admin, token }, "Admin signed in successfully.");
}

export async function adminLogout(request, response) {
  await adminSheetsService.recordActivity({ request, admin: request.admin, action: "Logout", module: "Authentication" });
  ok(response, {}, "Admin signed out successfully.");
}

export async function getAdminProfile(request, response) {
  const row = await adminSheetsService.findAdminById(request.admin.id);
  if (!row || text(row.Status).toLowerCase() !== "active") {
    throw new AppError("Admin account is unavailable.", { status: 403, code: "ADMIN_INACTIVE", expose: true });
  }
  ok(response, { admin: adminProfile(row) });
}

export async function updateAdminProfile(request, response) {
  const row = await adminSheetsService.findAdminById(request.admin.id);
  if (!row || text(row.Status).toLowerCase() !== "active") {
    throw new AppError("Admin account is unavailable.", { status: 403, code: "ADMIN_INACTIVE", expose: true });
  }
  const name = text(request.body.name) || row.Name;
  const updated = await adminSheetsService.updateAdmin(row, { Name: name, UpdatedAt: now() });
  ok(
    response,
    { admin: adminProfile(updated) },
    "Admin profile preferences updated.",
  );
}

export async function getAdminDashboard(request, response) {
  const [
    orders,
    products,
    customers,
    subscribers,
    reviews,
    messages,
    orderItems,
    payments,
  ] = await Promise.all([
    getRows("ORDERS"),
    getRows("PRODUCTS"),
    getRows("CUSTOMERS"),
    getRows("NEWSLETTER"),
    getRows("REVIEWS"),
    getRows("CONTACT_MESSAGES"),
    getRows("ORDER_ITEMS"),
    getRows("PAYMENTS"),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const paidPayments = payments.filter((payment) => payment.Status === "Paid");
  const paymentDate = (payment) =>
    payment.PaidAt ||
    (() => {
      const timestamp = Number(String(payment.PaymentID || "").split("-")[1]);
      return Number.isFinite(timestamp)
        ? new Date(timestamp).toISOString()
        : "";
    })();
  const todaysPayments = payments.filter((payment) =>
    String(paymentDate(payment)).startsWith(today),
  );
  const todaysOrders = orders.filter((order) =>
    String(order.CreatedAt).startsWith(today),
  );
  const revenue = orders.reduce(
    (sum, order) => sum + Number(order.GrandTotal || 0),
    0,
  );
  const todaysRevenue = orders
    .filter((order) => String(order.CreatedAt).startsWith(today))
    .reduce((sum, order) => sum + Number(order.GrandTotal || 0), 0);
  const deliveredOrders = orders.filter(
    (order) => String(order.OrderStatus).toLowerCase() === "delivered",
  );
  const pendingOrders = orders.filter(
    (order) =>
      !["delivered", "cancelled"].includes(
        String(order.OrderStatus).toLowerCase(),
      ),
  );
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.Rating || 0), 0) /
      reviews.length
    : 0;

  const monthMap = new Map();
  orders.forEach((order) => {
    const key =
      String(order.CreatedAt || order.UpdatedAt || "").slice(0, 7) ||
      "Un dated";
    const current = monthMap.get(key) || { month: key, revenue: 0, orders: 0 };
    current.revenue += Number(order.GrandTotal || 0);
    current.orders += 1;
    monthMap.set(key, current);
  });

  const statusMap = new Map();
  orders.forEach((order) => {
    const key = order.OrderStatus || "Order Placed";
    statusMap.set(key, (statusMap.get(key) || 0) + 1);
  });

  const productSales = new Map();
  orderItems.forEach((item) => {
    const current = productSales.get(item.ProductID) || {
      productId: item.ProductID,
      name: item.ProductName,
      quantity: 0,
      revenue: 0,
    };
    current.quantity += Number(item.Quantity || 0);
    current.revenue += Number(item.Total || 0);
    productSales.set(item.ProductID, current);
  });

  ok(response, {
    metrics: {
      totalRevenue: money(revenue),
      todaysRevenue: money(todaysRevenue),
      todaysPayments: todaysPayments.length,
      todaysOrders: todaysOrders.length,
      successfulPayments: paidPayments.length,
      failedPayments: payments.filter((payment) => payment.Status === "Failed")
        .length,
      pendingPayments: payments.filter(
        (payment) => payment.Status === "Pending",
      ).length,
      totalOrders: orders.length,
      pendingOrders: pendingOrders.length,
      deliveredOrders: deliveredOrders.length,
      cancelledOrders: orders.filter(
        (order) => String(order.OrderStatus).toLowerCase() === "cancelled",
      ).length,
      totalCustomers: customers.length,
      products: products.length,
      newsletterSubscribers: subscribers.filter(
        (row) => String(row.Status).toLowerCase() !== "deleted",
      ).length,
      averageRating: Number(averageRating.toFixed(1)),
      averageOrderValue: orders.length ? money(revenue / orders.length) : 0,
    },
    charts: {
      revenueByMonth: [...monthMap.values()]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((item) => ({ ...item, revenue: money(item.revenue) })),
      ordersByStatus: [...statusMap.entries()].map(([status, count]) => ({
        status,
        count,
      })),
      topSellingProducts: [...productSales.values()]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 8),
    },
    latest: {
      orders: orders
        .slice(-8)
        .reverse()
        .map((order) =>
          orderDto(
            order,
            null,
            [],
            payments.find((payment) => payment.OrderID === order.OrderID),
          ),
        ),
      customers: customers
        .slice(-8)
        .reverse()
        .map((customer) => ({
          id: customer.CustomerID,
          name: `${customer.FirstName} ${customer.LastName}`.trim(),
          email: customer.Email,
          createdAt: customer.CreatedAt,
          status: customer.Status,
        })),
      transactions: payments
        .slice(-8)
        .reverse()
        .map((payment) => ({
          id: payment.PaymentID,
          orderId: payment.OrderID,
          customerId: payment.CustomerID,
          transactionId:
            payment.TransactionReference || payment.RazorpayPaymentID,
          method: payment.PaymentMethod,
          amount: Number(payment.Amount || 0),
          currency: payment.Currency || "INR",
          status: payment.Status,
          paidAt: paymentDate(payment),
          gateway: payment.Gateway || "Razorpay",
        })),
      reviews: reviews.slice(-6).reverse(),
      messages: messages.slice(-6).reverse(),
    },
  });
}

export async function getAdminProducts(request, response) {
  let rows = (await getRows("PRODUCTS")).reverse();
  rows = filterSearch(rows, request.query.search, [
    "Name",
    "Slug",
    "Category",
    "Flavor",
    "Status",
  ]);
  if (request.query.status)
    rows = rows.filter((row) => row.Status === request.query.status);
  if (request.query.category)
    rows = rows.filter((row) => row.Category === request.query.category);
  const page = paginate(rows.map(productDto), request);
  ok(response, { products: page.data, pagination: page.pagination });
}

export async function createAdminProduct(request, response) {
  const createdAt = now();
  const pricing = productPricing();
  const row = {
    ProductID: createId("product"),
    Name: request.body.name,
    Slug: request.body.slug || slugify(request.body.name || ""),
    Category: request.body.category || "Makhana",
    Flavor: request.body.flavor || "",
    ShortDescription: request.body.shortDescription || "",
    Description: request.body.description || "",
    Ingredients: Array.isArray(request.body.ingredients)
      ? request.body.ingredients.join(", ")
      : request.body.ingredients || "",
    NutritionPDF: request.body.nutritionPDF || "",
    Price: pricing.mrp,
    DiscountPrice: pricing.sellingPrice,
    Weight: pricing.weight,
    Stock: request.body.stock ?? 0,
    Featured: Boolean(request.body.featured),
    BestSeller: Boolean(request.body.bestSeller),
    Status: request.body.status || "active",
    PrimaryImage: request.body.primaryImage || "",
    CreatedAt: createdAt,
    UpdatedAt: createdAt,
  };
  await appendRow("PRODUCTS", row);
  created(response, { product: productDto(row) }, "Product created.");
}

export async function updateAdminProduct(request, response) {
  const row = await rowById("PRODUCTS", "ProductID", request.params.id);
  const pricing = productPricing();
  const fields = {
    name: "Name",
    slug: "Slug",
    category: "Category",
    flavor: "Flavor",
    shortDescription: "ShortDescription",
    description: "Description",
    ingredients: "Ingredients",
    nutritionPDF: "NutritionPDF",
    price: "Price",
    discountPrice: "DiscountPrice",
    weight: "Weight",
    stock: "Stock",
    status: "Status",
    primaryImage: "PrimaryImage",
  };
  Object.entries(fields).forEach(([input, column]) => {
    if (request.body[input] !== undefined)
      row[column] =
        input === "ingredients" && Array.isArray(request.body[input])
          ? request.body[input].join(", ")
          : request.body[input];
  });
  if (request.body.featured !== undefined)
    row.Featured = Boolean(request.body.featured);
  if (request.body.bestSeller !== undefined)
    row.BestSeller = Boolean(request.body.bestSeller);
  if (request.body.name !== undefined && request.body.slug === undefined)
    row.Slug = slugify(request.body.name);
  row.Price = pricing.mrp;
  row.DiscountPrice = pricing.sellingPrice;
  row.Weight = pricing.weight;
  row.UpdatedAt = now();
  await updateRow("PRODUCTS", row._row, row);
  ok(response, { product: productDto(row) }, "Product updated.");
}

export async function deleteAdminProduct(request, response) {
  const row = await rowById("PRODUCTS", "ProductID", request.params.id);
  await deleteRow("PRODUCTS", row._row);
  ok(response, {}, "Product deleted.");
}

export async function duplicateAdminProduct(request, response) {
  const source = await rowById("PRODUCTS", "ProductID", request.params.id);
  const stamped = now();
  const row = {
    ...source,
    _row: undefined,
    ProductID: createId("product"),
    Name: `${source.Name} Copy`,
    Slug: `${source.Slug || slugify(source.Name)}-copy-${Date.now().toString().slice(-4)}`,
    CreatedAt: stamped,
    UpdatedAt: stamped,
  };
  await appendRow("PRODUCTS", row);
  created(response, { product: productDto(row) }, "Product duplicated.");
}

export async function getAdminOrders(request, response) {
  const [orders, customers, items, payments, shipments] = await Promise.all([
    getRows("ORDERS"),
    getRows("CUSTOMERS"),
    getRows("ORDER_ITEMS"),
    getRows("PAYMENTS"),
    getRows("SHIPMENTS"),
  ]);
  let rows = orders.reverse();
  rows = filterSearch(rows, request.query.search, [
    "OrderID",
    "OrderNumber",
    "CustomerID",
    "PaymentMethod",
    "PaymentStatus",
    "OrderStatus",
  ]);
  if (request.query.status)
    rows = rows.filter((row) => row.OrderStatus === request.query.status);
  const mapped = rows.map((order) => {
    const customer = customers.find(
      (item) => item.CustomerID === order.CustomerID,
    );
    return orderDto(
      order,
      customer
        ? {
            id: customer.CustomerID,
            name: `${customer.FirstName} ${customer.LastName}`.trim(),
            email: customer.Email,
            phone: customer.Phone,
          }
        : null,
      items.filter((item) => item.OrderID === order.OrderID),
      payments.find((payment) => payment.OrderID === order.OrderID),
      shipments.find((shipment) => shipment.OrderID === order.OrderID),
    );
  });
  const page = paginate(mapped, request);
  ok(response, { orders: page.data, pagination: page.pagination });
}

export async function getAdminOrderById(request, response) {
  const [order, items, payments, tracking, addresses, customers] =
    await Promise.all([
      rowById("ORDERS", "OrderID", request.params.id).catch(() =>
        rowById("ORDERS", "OrderNumber", request.params.id),
      ),
      getRows("ORDER_ITEMS"),
      getRows("PAYMENTS"),
      getRows("ORDER_TRACKING"),
      getRows("ADDRESSES"),
      getRows("CUSTOMERS"),
    ]);
  const customer = customers.find(
    (item) => item.CustomerID === order.CustomerID,
  );
  ok(response, {
    order: {
      ...orderDto(
        order,
        customer,
        items.filter((item) => item.OrderID === order.OrderID),
      ),
      payment: payments.find((item) => item.OrderID === order.OrderID) || null,
      tracking: tracking.filter((item) => item.OrderID === order.OrderID),
      address:
        addresses.find((item) => item.AddressID === order.AddressID) || null,
    },
  });
}

export async function updateAdminOrderStatus(request, response) {
  const row = await rowById("ORDERS", "OrderID", request.params.id).catch(() =>
    rowById("ORDERS", "OrderNumber", request.params.id),
  );
  if (!ORDER_STATUSES.includes(request.body.status))
    return response
      .status(422)
      .json({ success: false, message: "Invalid order status." });
  row.OrderStatus = request.body.status;
  if (request.body.paymentStatus)
    row.PaymentStatus = request.body.paymentStatus;
  if (request.body.estimatedDeliveryDate)
    row.EstimatedDelivery = request.body.estimatedDeliveryDate;
  row.UpdatedAt = now();
  await updateRow("ORDERS", row._row, row);
  await appendRow("ORDER_TRACKING", {
    TrackingID: createId("tracking"),
    OrderID: row.OrderID,
    CurrentStatus: row.OrderStatus,
    UpdatedBy: request.admin?.email || "Admin",
    Remarks:
      request.body.remarks ||
      request.body.description ||
      `Order status updated to ${row.OrderStatus}.`,
    UpdatedAt: row.UpdatedAt,
    EstimatedDeliveryDate: row.EstimatedDelivery,
  });
  await notificationService.orderStatus(row, row.OrderStatus).catch(() => {});
  ok(response, { order: orderDto(row) }, "Order status updated.");
}

export async function getAdminCustomers(request, response) {
  const [customers, orders] = await Promise.all([
    getRows("CUSTOMERS"),
    getRows("ORDERS"),
  ]);
  let rows = filterSearch(customers.reverse(), request.query.search, [
    "FirstName",
    "LastName",
    "Email",
    "Phone",
    "Status",
  ]);
  const mapped = rows.map((customer) => {
    const customerOrders = orders.filter(
      (order) => order.CustomerID === customer.CustomerID,
    );
    return {
      id: customer.CustomerID,
      firstName: customer.FirstName,
      lastName: customer.LastName,
      name: `${customer.FirstName} ${customer.LastName}`.trim(),
      email: customer.Email,
      phone: customer.Phone,
      orders: customerOrders.length,
      totalSpent: money(
        customerOrders.reduce(
          (sum, order) => sum + Number(order.GrandTotal || 0),
          0,
        ),
      ),
      joinedDate: customer.CreatedAt,
      status: customer.Status,
    };
  });
  const page = paginate(mapped, request);
  ok(response, { customers: page.data, pagination: page.pagination });
}

export async function getAdminCustomerById(request, response) {
  const [customer, orders, addresses, wishlist, reviews, payments] =
    await Promise.all([
      rowById("CUSTOMERS", "CustomerID", request.params.id),
      getRows("ORDERS"),
      getRows("ADDRESSES"),
      getRows("WISHLIST"),
      getRows("REVIEWS"),
      getRows("PAYMENTS"),
    ]);
  const customerOrders = orders.filter(
    (row) => row.CustomerID === customer.CustomerID,
  );
  const customerPayments = payments
    .filter((row) => row.CustomerID === customer.CustomerID)
    .reverse()
    .map((payment) => ({
      id: payment.PaymentID,
      orderId: payment.OrderID,
      transactionId: payment.TransactionReference || payment.RazorpayPaymentID,
      method: payment.PaymentMethod,
      amount: Number(payment.Amount || 0),
      currency: payment.Currency || "INR",
      status: payment.Status,
      paidAt: payment.PaidAt,
      gateway: payment.Gateway || "Razorpay",
    }));
  ok(response, {
    customer,
    summary: {
      totalOrders: customerOrders.length,
      totalSpend: money(
        customerPayments
          .filter((payment) => payment.status === "Paid")
          .reduce((sum, payment) => sum + payment.amount, 0),
      ),
    },
    latestPayment: customerPayments[0] || null,
    payments: customerPayments,
    orders: customerOrders,
    addresses: addresses.filter(
      (row) => row.CustomerID === customer.CustomerID,
    ),
    wishlist: wishlist.filter((row) => row.CustomerID === customer.CustomerID),
    reviews: reviews.filter((row) => row.CustomerID === customer.CustomerID),
  });
}

export async function updateAdminCustomerStatus(request, response) {
  const row = await customerBusinessService.updateCustomer(request.params.id, { status: request.body.status });
  ok(response, { customer: customerBusinessService.publicIdentity(row) }, "Customer status updated.");
}

export async function getAdminInventory(request, response) {
  let rows = (await getRows("PRODUCTS")).map(productDto);
  rows = filterSearch(rows, request.query.search, [
    "name",
    "category",
    "status",
  ]);
  if (request.query.stock === "low")
    rows = rows.filter((item) => item.stock > 0 && item.stock <= 10);
  if (request.query.stock === "out")
    rows = rows.filter((item) => item.stock <= 0);
  const page = paginate(rows, request);
  ok(response, { inventory: page.data, pagination: page.pagination });
}

export async function updateAdminInventory(request, response) {
  const row = await rowById("PRODUCTS", "ProductID", request.params.id);
  const delta =
    request.body.delta !== undefined ? Number(request.body.delta) : null;
  row.Stock =
    delta === null
      ? Number(request.body.stock || 0)
      : Math.max(0, Number(row.Stock || 0) + delta);
  row.UpdatedAt = now();
  await updateRow("PRODUCTS", row._row, row);
  ok(response, { product: productDto(row) }, "Inventory updated.");
}

export async function getAdminReviews(request, response) {
  let rows = filterSearch(
    (await getRows("REVIEWS")).reverse(),
    request.query.search,
    ["Title", "Review", "Status", "ProductID", "CustomerID"],
  );
  if (request.query.status)
    rows = rows.filter((row) => row.Status === request.query.status);
  const page = paginate(rows, request);
  ok(response, { reviews: page.data, pagination: page.pagination });
}

export async function updateAdminReview(request, response) {
  const row = await rowById("REVIEWS", "ReviewID", request.params.id);
  row.Status = request.body.status || row.Status;
  await updateRow("REVIEWS", row._row, row);
  ok(response, { review: row }, "Review updated.");
}

export async function deleteAdminReview(request, response) {
  const row = await rowById("REVIEWS", "ReviewID", request.params.id);
  await deleteRow("REVIEWS", row._row);
  ok(response, {}, "Review deleted.");
}

export async function getAdminBlogs(request, response) {
  let rows = filterSearch(
    (await getRows("BLOGS")).reverse(),
    request.query.search,
    ["Title", "Slug", "Category", "Author", "Status"],
  );
  const page = paginate(rows, request);
  ok(response, { blogs: page.data, pagination: page.pagination });
}

export async function createAdminBlog(request, response) {
  const row = {
    BlogID: createId("blog"),
    Title: request.body.title,
    Slug: request.body.slug || slugify(request.body.title || ""),
    Category: request.body.category || "Stories",
    Author: request.body.author || "LitePuff",
    CoverImage: request.body.coverImage || "",
    Excerpt: request.body.excerpt || "",
    Content: request.body.content || "",
    ReadingTime: request.body.readingTime || "",
    Tags: Array.isArray(request.body.tags)
      ? request.body.tags.join(", ")
      : request.body.tags || "",
    Featured: Boolean(request.body.featured),
    PublishedDate: request.body.publishedDate || now(),
    Status: request.body.status || "draft",
  };
  await appendRow("BLOGS", row);
  created(response, { blog: row }, "Blog created.");
}

export async function updateAdminBlog(request, response) {
  const row = await rowById("BLOGS", "BlogID", request.params.id);
  [
    "Title",
    "Slug",
    "Category",
    "Author",
    "CoverImage",
    "Excerpt",
    "Content",
    "ReadingTime",
    "Status",
  ].forEach((column) => {
    const input = column.charAt(0).toLowerCase() + column.slice(1);
    if (request.body[input] !== undefined) row[column] = request.body[input];
  });
  if (request.body.title !== undefined && request.body.slug === undefined)
    row.Slug = slugify(request.body.title);
  if (request.body.tags !== undefined)
    row.Tags = Array.isArray(request.body.tags)
      ? request.body.tags.join(", ")
      : request.body.tags;
  if (request.body.featured !== undefined)
    row.Featured = Boolean(request.body.featured);
  if (request.body.publishedDate !== undefined)
    row.PublishedDate = request.body.publishedDate;
  await updateRow("BLOGS", row._row, row);
  ok(response, { blog: row }, "Blog updated.");
}

export async function deleteAdminBlog(request, response) {
  const row = await rowById("BLOGS", "BlogID", request.params.id);
  await deleteRow("BLOGS", row._row);
  ok(response, {}, "Blog deleted.");
}

export async function getAdminCoupons(request, response) {
  let rows = filterSearch(
    (await getRows("COUPONS")).reverse(),
    request.query.search,
    ["Code", "Type", "Status"],
  );
  const page = paginate(rows, request);
  ok(response, { coupons: page.data, pagination: page.pagination });
}

export async function createAdminCoupon(request, response) {
  const row = {
    CouponID: createId("coupon"),
    Code: text(request.body.code).toUpperCase(),
    Type: request.body.type || "percent",
    Value: request.body.value || 0,
    MinOrder: request.body.minOrder || 0,
    MaxDiscount: request.body.maxDiscount || "",
    Expiry: request.body.expiry || "",
    UsageLimit: request.body.usageLimit || "",
    UsedCount: 0,
    Status: request.body.status || "active",
  };
  await appendRow("COUPONS", row);
  created(response, { coupon: row }, "Coupon created.");
}

export async function updateAdminCoupon(request, response) {
  const row = await rowById("COUPONS", "CouponID", request.params.id);
  const map = {
    code: "Code",
    type: "Type",
    value: "Value",
    minOrder: "MinOrder",
    maxDiscount: "MaxDiscount",
    expiry: "Expiry",
    usageLimit: "UsageLimit",
    usedCount: "UsedCount",
    status: "Status",
  };
  Object.entries(map).forEach(([input, column]) => {
    if (request.body[input] !== undefined)
      row[column] =
        input === "code"
          ? text(request.body[input]).toUpperCase()
          : request.body[input];
  });
  await updateRow("COUPONS", row._row, row);
  ok(response, { coupon: row }, "Coupon updated.");
}

export async function deleteAdminCoupon(request, response) {
  const row = await rowById("COUPONS", "CouponID", request.params.id);
  await deleteRow("COUPONS", row._row);
  ok(response, {}, "Coupon deleted.");
}

export async function getAdminContactMessages(request, response) {
  let rows = filterSearch(
    (await getRows("CONTACT_MESSAGES")).reverse(),
    request.query.search,
    ["Name", "Email", "Phone", "Subject", "Message", "Status"],
  );
  const page = paginate(rows, request);
  ok(response, { messages: page.data, pagination: page.pagination });
}

export async function updateAdminContactMessage(request, response) {
  const row = await rowById("CONTACT_MESSAGES", "MessageID", request.params.id);
  row.Status = request.body.status || "read";
  await updateRow("CONTACT_MESSAGES", row._row, row);
  ok(response, { message: row }, "Message updated.");
}

export async function deleteAdminContactMessage(request, response) {
  const row = await rowById("CONTACT_MESSAGES", "MessageID", request.params.id);
  await deleteRow("CONTACT_MESSAGES", row._row);
  ok(response, {}, "Message deleted.");
}

export async function getAdminNewsletter(request, response) {
  let rows = filterSearch(
    (await getRows("NEWSLETTER")).reverse(),
    request.query.search,
    ["Email", "Status"],
  );
  const page = paginate(rows, request);
  ok(response, { subscribers: page.data, pagination: page.pagination });
}

export async function deleteAdminNewsletterSubscriber(request, response) {
  const row = await rowById("NEWSLETTER", "SubscriberID", request.params.id);
  await deleteRow("NEWSLETTER", row._row);
  ok(response, {}, "Subscriber deleted.");
}

export async function exportAdminNewsletter(request, response) {
  const rows = await getRows("NEWSLETTER");
  const csv = [
    "Email,SubscribedAt,Status",
    ...rows.map(
      (row) => `"${row.Email}","${row.SubscribedAt}","${row.Status}"`,
    ),
  ].join("\n");
  response.setHeader("Content-Type", "text/csv");
  response.setHeader(
    "Content-Disposition",
    'attachment; filename="litepuff-newsletter.csv"',
  );
  response.send(csv);
}
