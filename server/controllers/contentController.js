import { appendRow, getRows, updateRow } from '../services/googleSheets.js';
import { createId } from '../utils/createId.js';
import { created, ok } from '../utils/apiResponse.js';
import { emailTemplates, sendMail } from '../services/emailService.js';
import { env } from '../config/env.js';

const active = (row) => String(row.Status || 'active').toLowerCase() === 'active' || String(row.Status || '').toLowerCase() === 'published';

export async function getFaqs(request, response) {
  const faqs = (await getRows('FAQ')).filter(active).sort((a, b) => Number(a.SortOrder || 0) - Number(b.SortOrder || 0));
  ok(response, { faqs: faqs.map((row) => ({ id: row.FAQID, category: row.Category, question: row.Question, answer: row.Answer, sortOrder: Number(row.SortOrder || 0), status: row.Status })) });
}

export async function getReviews(request, response) {
  const productId = request.query.productId;
  const reviews = (await getRows('REVIEWS')).filter((row) => active(row) && (!productId || row.ProductID === productId));
  const mapped = reviews.map((row) => ({ id: row.ReviewID, customerId: row.CustomerID, orderId: row.OrderID, productId: row.ProductID, rating: Number(row.Rating || 0), title: row.Title, review: row.Review, status: row.Status, createdAt: row.CreatedAt }));
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: mapped.filter((review) => review.rating === rating).length }));
  const averageRating = mapped.length ? Number((mapped.reduce((sum, review) => sum + review.rating, 0) / mapped.length).toFixed(1)) : 0;
  ok(response, { reviews: mapped, averageRating, distribution, count: mapped.length });
}

export async function createReview(request, response) {
  const { orderId = '', productId, rating, title = '', review } = request.body;
  if (!productId || !rating || !review) return response.status(400).json({ success: false, message: 'Product, rating and review are required.' });
  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) return response.status(422).json({ success: false, message: 'Rating must be between 1 and 5.' });
  const [orders, orderItems] = await Promise.all([getRows('ORDERS'), getRows('ORDER_ITEMS')]);
  const order = orders.find((item) => item.OrderID === orderId && item.CustomerID === request.customer.id);
  const purchased = order && orderItems.some((item) => item.OrderID === orderId && item.ProductID === productId);
  if (!purchased) return response.status(403).json({ success: false, message: 'Only verified purchases can be reviewed.' });
  const row = { ReviewID: createId('review'), CustomerID: request.customer.id, OrderID: orderId, ProductID: productId, Rating: rating, Title: title, Review: review, Status: 'pending', CreatedAt: new Date().toISOString() };
  await appendRow('REVIEWS', row);
  created(response, { review: { id: row.ReviewID, productId, rating, title, review, status: row.Status, createdAt: row.CreatedAt } }, 'Review submitted for approval.');
}

export async function submitContactMessage(request, response) {
  const { name, email, phone = '', subject = 'Website enquiry', message } = request.body;
  if (!name || !email || !message) return response.status(400).json({ success: false, message: 'Name, email and message are required.' });
  const row = { MessageID: createId('message'), Name: name, Email: email, Phone: phone, Subject: subject, Message: message, CreatedAt: new Date().toISOString(), Status: 'new' };
  await appendRow('CONTACT_MESSAGES', row);
  sendMail({ to: env.adminNotifyEmail, ...emailTemplates.contactMessage(row) }).catch(() => {});
  created(response, { messageId: row.MessageID }, 'Message received.');
}

export async function subscribeNewsletter(request, response) {
  const email = String(request.body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response.status(400).json({ success: false, message: 'Enter a valid email address.' });
  const subscribers = await getRows('NEWSLETTER');
  const existing = subscribers.find((row) => String(row.Email || '').toLowerCase() === email);
  if (existing) {
    existing.Status = 'active';
    await updateRow('NEWSLETTER', existing._row, existing);
    sendMail({ to: email, ...emailTemplates.newsletter(email) }).catch(() => {});
    return ok(response, { subscriberId: existing.SubscriberID }, 'Newsletter subscription updated.');
  }
  const row = { SubscriberID: createId('subscriber'), Email: email, SubscribedAt: new Date().toISOString(), Status: 'active' };
  await appendRow('NEWSLETTER', row);
  sendMail({ to: email, ...emailTemplates.newsletter(email) }).catch(() => {});
  created(response, { subscriberId: row.SubscriberID }, 'Subscribed successfully.');
}

async function validateLegacyCoupon(request, response) {
  const code = String(request.body.code || '').trim().toUpperCase();
  const subtotal = Number(request.body.subtotal || 0);
  if (!code) return response.status(400).json({ success: false, message: 'Coupon code is required.' });
  const [coupons, orders] = await Promise.all([getRows('COUPONS'), getRows('ORDERS')]);
  const coupon = coupons.find((item) => String(item.Code).trim().toUpperCase() === code);
  if (!coupon || String(coupon.Status).toLowerCase() !== 'active') return response.status(404).json({ success: false, message: 'Invalid coupon code.' });
  if (coupon.Expiry && new Date(coupon.Expiry) < new Date()) return response.status(410).json({ success: false, message: 'Coupon has expired.' });
  if (Number(coupon.MinOrder || 0) > subtotal) return response.status(400).json({ success: false, message: `Minimum order value is ₹${coupon.MinOrder}.` });
  if (Number(coupon.UsageLimit || 0) && Number(coupon.UsedCount || 0) >= Number(coupon.UsageLimit)) return response.status(409).json({ success: false, message: 'Coupon usage limit reached.' });
  const alreadyUsed = orders.some((order) =>
    order.CustomerID === request.customer.id &&
    String(order.CouponCode || '').trim().toUpperCase() === code &&
    !['cancelled', 'failed'].includes(String(order.OrderStatus).toLowerCase())
  );
  if (alreadyUsed) return response.status(409).json({ success: false, message: 'This coupon has already been used on your account.' });
  const hasCompletedOrder = orders.some((order) => order.CustomerID === request.customer.id && (String(order.PaymentStatus).toLowerCase() === 'paid' || ['completed', 'delivered'].includes(String(order.OrderStatus).toLowerCase())));
  if (hasCompletedOrder && String(coupon.FirstOrderOnly || '').toLowerCase() === 'true') return response.status(409).json({ success: false, message: 'This coupon is unavailable.' });

  let discount = 0;
  let freeShipping = false;
  if (coupon.Type === 'percent') discount = Math.round(subtotal * (Number(coupon.Value || 0) / 100));
  if (coupon.Type === 'flat') discount = Number(coupon.Value || 0);
  if (coupon.Type === 'shipping') freeShipping = true;
  discount = Math.min(discount, Number(coupon.MaxDiscount || discount || 0));

  ok(response, { coupon: { code, type: coupon.Type, discount: Number(discount.toFixed(2)), freeShipping } }, 'Coupon applied successfully.');
}

export async function validateCoupon(request, response) {
  const code = String(request.body.code || '').trim().toUpperCase();
  const subtotal = Number(request.body.subtotal || 0);
  const paymentMethod = String(request.body.paymentMethod || 'online').toLowerCase();
  if (!code) return response.status(400).json({ success: false, message: 'Coupon code is required.' });
  if (paymentMethod === 'cod') return response.status(409).json({ success: false, message: 'Coupon available only for Online Payments.' });
  const coupon = (await getRows('COUPONS')).find((item) => String(item.Code || '').trim().toUpperCase() === code);
  if (!coupon || String(coupon.Status || 'active').toLowerCase() !== 'active') return response.status(404).json({ success: false, message: 'Invalid Coupon Code.' });
  if (coupon.Expiry && new Date(coupon.Expiry) < new Date()) return response.status(410).json({ success: false, message: 'Offer Expired.' });
  if (Number(coupon.MinOrder || 0) > subtotal) return response.status(422).json({ success: false, message: `Minimum order value is ₹${coupon.MinOrder}.` });
  if (Number(coupon.UsageLimit || 0) && Number(coupon.UsedCount || 0) >= Number(coupon.UsageLimit)) return response.status(409).json({ success: false, message: 'Coupon usage limit reached.' });
  const type = String(coupon.Type || '').toLowerCase();
  if (type === 'percent' && Number(coupon.Value) !== 15) return response.status(409).json({ success: false, message: 'This promotion is no longer active.' });
  let discount = type === 'percent' ? Math.round(subtotal * Number(coupon.Value || 0) / 100) : type === 'flat' ? Number(coupon.Value || 0) : 0;
  discount = Math.min(discount, Number(coupon.MaxDiscount || discount || 0), subtotal);
  ok(response, { coupon: { code, type, value: Number(coupon.Value || 0), discount: Number(discount.toFixed(2)), freeShipping: type === 'shipping' } }, 'Coupon Applied Successfully.');
}
