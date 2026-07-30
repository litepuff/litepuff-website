import path from 'path';
import sharp from 'sharp';
import { appendRow, deleteRow, getRows, updateRow } from '../services/googleSheets.js';
import { createId } from '../utils/createId.js';
import { created, ok } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { notificationService } from '../services/NotificationService.js';

const REVIEW_SHEET = 'PRODUCT_REVIEWS';
const validReportReasons = new Set(['Spam', 'Abuse', 'Fake Review', 'Wrong Product']);
const completedStatuses = new Set(['completed', 'delivered']);
const rejectionReasons = new Set(['Spam', 'Abusive Language', 'Fake Review', 'Irrelevant', 'Duplicate', 'Other']);
const moderationActions = new Set(['approve', 'reject', 'hide', 'unhide', 'spam', 'delete', 'restore']);
const number = (value) => Number(value || 0);
const truthy = (value) => value === true || String(value).toLowerCase() === 'true';
const normalize = (value) => String(value ?? '').trim().toLowerCase();
const json = (value, fallback = []) => { try { return JSON.parse(value || ''); } catch { return fallback; } };
const rating = (value, field = 'rating') => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) throw new AppError(`${field} must be between 1 and 5.`, { status: 422, code: 'VALIDATION_ERROR' });
  return parsed;
};
const reviewById = async (id) => {
  const row = (await getRows(REVIEW_SHEET)).find((item) => item.reviewId === id);
  if (!row) throw new AppError('Review not found.', { status: 404, code: 'REVIEW_NOT_FOUND' });
  return row;
};
const publicReview = (row, replies = []) => ({
  id: row.reviewId, productId: row.productId, customerId: row.customerId,
  customerName: row.customerName || 'LitePuff customer', customerPhoto: row.customerPhoto || '',
  rating: number(row.rating), tasteRating: number(row.tasteRating), freshnessRating: number(row.freshnessRating),
  packagingRating: number(row.packagingRating), valueRating: number(row.valueRating), crunchinessRating: number(row.crunchinessRating),
  title: row.title, review: row.review, images: json(row.images), video: row.video || '',
  verifiedPurchase: truthy(row.verifiedPurchase), helpfulCount: number(row.helpfulCount),
  status: row.status, featured: truthy(row.featured), createdAt: row.createdAt, updatedAt: row.updatedAt,
  reply: row.adminReply ? { adminName: 'LitePuff', reply: row.adminReply, createdAt: row.adminReplyDate } : replies.find((item) => item.reviewId === row.reviewId) || null
});

export function isPublicReview(row, productIds) {
  const acceptedProductIds = (Array.isArray(productIds) ? productIds : [productIds]).map(normalize);
  return acceptedProductIds.includes(normalize(row.productId))
    && normalize(row.status) === 'approved'
    && !truthy(row.hidden)
    && !truthy(row.deleted)
    && !truthy(row.spam);
}

export function moderationBucket(row) {
  if (truthy(row.deleted)) return 'deleted';
  if (truthy(row.spam) || normalize(row.status) === 'spam') return 'spam';
  if (truthy(row.hidden) || normalize(row.status) === 'hidden') return 'hidden';
  return normalize(row.status) || 'pending';
}

export function reviewStatistics(rows, now = new Date()) {
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const approved = rows.filter((row) => isPublicReview(row, row.productId));
  return {
    pending: rows.filter((row) => moderationBucket(row) === 'pending').length,
    approved: approved.length,
    averageRating: approved.length ? Number((approved.reduce((sum, row) => sum + number(row.rating), 0) / approved.length).toFixed(1)) : 0,
    thisWeek: rows.filter((row) => new Date(row.createdAt) >= weekStart).length,
    spam: rows.filter((row) => moderationBucket(row) === 'spam').length,
    rejected: rows.filter((row) => moderationBucket(row) === 'rejected').length
  };
}

export function applyCustomerReviewEdits(row, input, now = new Date().toISOString()) {
  const updated = { ...row };
  for (const field of ['rating', 'tasteRating', 'freshnessRating', 'packagingRating', 'valueRating', 'crunchinessRating']) {
    if (input[field] !== undefined) updated[field] = rating(input[field], field);
  }
  if (input.title !== undefined) updated.title = String(input.title).slice(0, 120);
  if (input.review !== undefined) updated.review = String(input.review).slice(0, 3000);
  updated.status = 'pending'; updated.approvedBy = ''; updated.approvedAt = ''; updated.rejectedReason = '';
  updated.hidden = false; updated.deleted = false; updated.spam = false; updated.updatedAt = now;
  return updated;
}

export function applyModeration(row, { action, reason, adminName, now = new Date().toISOString() }) {
  const normalizedAction = normalize(action);
  if (!moderationActions.has(normalizedAction)) throw new AppError('Select a valid moderation action.', { status: 422, code: 'VALIDATION_ERROR' });
  const updated = { ...row };
  if (normalizedAction === 'approve') {
    updated.status = 'approved'; updated.approvedBy = adminName; updated.approvedAt = now;
    updated.rejectedReason = ''; updated.hidden = false; updated.deleted = false; updated.spam = false;
  }
  if (normalizedAction === 'reject') {
    if (!rejectionReasons.has(reason)) throw new AppError('Select a valid rejection reason.', { status: 422, code: 'VALIDATION_ERROR' });
    updated.status = 'rejected'; updated.rejectedReason = reason; updated.hidden = false; updated.spam = false;
  }
  if (normalizedAction === 'hide') { updated.status = 'hidden'; updated.hidden = true; }
  if (normalizedAction === 'unhide') { updated.status = updated.approvedAt ? 'approved' : 'pending'; updated.hidden = false; }
  if (normalizedAction === 'spam') { updated.status = 'spam'; updated.spam = true; updated.hidden = false; }
  if (normalizedAction === 'delete') updated.deleted = true;
  if (normalizedAction === 'restore') updated.deleted = false;
  updated.updatedAt = now;
  return updated;
}

async function reviewData(productId) {
  const [reviews, replies, products] = await Promise.all([getRows(REVIEW_SHEET), getRows('REVIEW_REPLIES'), getRows('PRODUCTS')]);
  const product = products.find((row) => [row.ProductID, row.Slug].map(normalize).includes(normalize(productId)));
  const acceptedProductIds = [productId, product?.ProductID, product?.Slug].filter(Boolean);
  return { rows: reviews.filter((row) => isPublicReview(row, acceptedProductIds)), replies };
}

export async function getProductReviews(request, response) {
  const { rows, replies } = await reviewData(request.params.id);
  const search = String(request.query.search || '').toLowerCase();
  const filter = String(request.query.filter || 'all');
  let result = rows.filter((row) => !search || `${row.title} ${row.review}`.toLowerCase().includes(search));
  if (/^[1-5]$/.test(filter)) result = result.filter((row) => number(row.rating) === Number(filter));
  if (filter === 'photos') result = result.filter((row) => json(row.images).length);
  if (filter === 'videos') result = result.filter((row) => row.video);
  if (filter === 'verified') result = result.filter((row) => truthy(row.verifiedPurchase));
  const sort = String(request.query.sort || 'helpful');
  result.sort((a, b) => truthy(b.featured) - truthy(a.featured) || (
    sort === 'newest' ? new Date(b.createdAt) - new Date(a.createdAt)
      : sort === 'oldest' ? new Date(a.createdAt) - new Date(b.createdAt)
        : sort === 'highest' ? number(b.rating) - number(a.rating)
          : sort === 'lowest' ? number(a.rating) - number(b.rating)
            : number(b.helpfulCount) - number(a.helpfulCount)
  ));
  const page = Math.max(1, number(request.query.page) || 1);
  const limit = Math.min(50, Math.max(1, number(request.query.limit) || 10));
  ok(response, { reviews: result.slice((page - 1) * limit, page * limit).map((row) => publicReview(row, replies)), pagination: { page, limit, total: result.length, hasMore: page * limit < result.length } });
}

export async function getRatingSummary(request, response) {
  const { rows } = await reviewData(request.params.id);
  const average = (field) => rows.length ? Number((rows.reduce((sum, row) => sum + number(row[field]), 0) / rows.length).toFixed(1)) : 0;
  ok(response, {
    averageRating: average('rating'), count: rows.length,
    distribution: [5, 4, 3, 2, 1].map((value) => ({ rating: value, count: rows.filter((row) => number(row.rating) === value).length })),
    attributes: { taste: average('tasteRating'), freshness: average('freshnessRating'), packaging: average('packagingRating'), value: average('valueRating'), crunchiness: average('crunchinessRating') }
  });
}

export async function getOwnProductReviews(request, response) {
  const [reviews, replies, products] = await Promise.all([getRows(REVIEW_SHEET), getRows('REVIEW_REPLIES'), getRows('PRODUCTS')]);
  const rows = reviews
    .filter((row) => row.customerId === request.customer.id && !truthy(row.deleted))
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .map((row) => {
      const product = products.find((item) => [item.ProductID, item.Slug].map(normalize).includes(normalize(row.productId)));
      return { ...publicReview(row, replies), productName: product?.Name || row.productId, moderationStatus: moderationBucket(row), rejectedReason: row.rejectedReason || '' };
    });
  ok(response, { reviews: rows, pagination: { total: rows.length } });
}

async function optimizeImages(files = []) {
  return Promise.all(files.map(async (file) => {
    const thumbnail = `${path.parse(file.path).name}-thumb.webp`;
    await sharp(file.path).rotate().resize({ width: 360, height: 360, fit: 'cover' }).webp({ quality: 78 }).toFile(path.join(path.dirname(file.path), thumbnail));
    return { url: `/uploads/reviews/${file.filename}`, thumbnail: `/uploads/reviews/${thumbnail}` };
  }));
}

export async function createProductReview(request, response) {
  const customerId = request.customer.id;
  const existing = (await getRows(REVIEW_SHEET)).find((row) => row.customerId === customerId && row.productId === request.params.id);
  if (existing) throw new AppError('You have already reviewed this product.', { status: 409, code: 'DUPLICATE_REVIEW' });
  const [orders, items] = await Promise.all([getRows('ORDERS'), getRows('ORDER_ITEMS')]);
  const order = orders.find((candidate) => candidate.CustomerID === customerId && completedStatuses.has(String(candidate.OrderStatus).toLowerCase()) && items.some((item) => item.OrderID === candidate.OrderID && item.ProductID === request.params.id));
  const now = new Date().toISOString();
  const row = {
    reviewId: createId('review'), productId: request.params.id, orderId: order?.OrderID || '', customerId,
    customerName: `${request.customerRecord.FirstName || ''} ${request.customerRecord.LastName || ''}`.trim(),
    customerPhoto: request.customerRecord.ProfileImage || '', rating: rating(request.body.rating),
    tasteRating: rating(request.body.tasteRating, 'tasteRating'), freshnessRating: rating(request.body.freshnessRating, 'freshnessRating'),
    packagingRating: rating(request.body.packagingRating, 'packagingRating'), valueRating: rating(request.body.valueRating, 'valueRating'),
    crunchinessRating: rating(request.body.crunchinessRating, 'crunchinessRating'),
    title: String(request.body.title || '').slice(0, 120), review: String(request.body.review || '').slice(0, 3000),
    images: JSON.stringify(await optimizeImages(request.files?.images)), video: request.files?.video?.[0] ? `/uploads/reviews/${request.files.video[0].filename}` : '',
    verifiedPurchase: Boolean(order), helpfulCount: 0, status: 'pending', featured: false, createdAt: now, updatedAt: now,
    approvedBy: '', approvedAt: '', rejectedReason: '', hidden: false, deleted: false, spam: false, adminReply: '', adminReplyDate: ''
  };
  if (!row.title || row.review.length < 10) throw new AppError('A title and review of at least 10 characters are required.', { status: 422, code: 'VALIDATION_ERROR' });
  await appendRow(REVIEW_SHEET, row);
  notificationService.createWebsite({
    customerId: 'admin',
    orderId: row.orderId,
    type: 'review_pending_approval',
    title: 'New Review Pending Approval',
    message: `${row.customerName || 'A customer'} submitted a ${row.rating}-star review for ${row.productId}.`,
    deepLink: '/admin/reviews',
    metadata: { reviewId: row.reviewId, productId: row.productId }
  }).catch((error) => logger.warn('review.admin-notification.failed', { reviewId: row.reviewId, code: error.code || 'NOTIFICATION_FAILED' }));
  created(response, { review: publicReview(row) }, 'Your review has been submitted. Reviews are reviewed before being published.');
}

export async function updateProductReview(request, response) {
  const row = await reviewById(request.params.id);
  if (row.customerId !== request.customer.id) throw new AppError('You can only edit your own review.', { status: 403, code: 'FORBIDDEN' });
  const updated = applyCustomerReviewEdits(row, request.body);
  await updateRow(REVIEW_SHEET, row._row, updated);
  ok(response, { review: publicReview(updated) }, 'Review updated and sent for approval.');
}

export async function deleteProductReview(request, response) {
  const row = await reviewById(request.params.id);
  if (row.customerId !== request.customer.id) throw new AppError('You can only delete your own review.', { status: 403, code: 'FORBIDDEN' });
  row.deleted = true;
  row.updatedAt = new Date().toISOString();
  await updateRow(REVIEW_SHEET, row._row, row);
  ok(response, {}, 'Review deleted.');
}

export async function markHelpful(request, response) {
  const row = await reviewById(request.params.id);
  const votes = await getRows('REVIEW_HELPFUL');
  if (votes.some((vote) => vote.reviewId === row.reviewId && vote.customerId === request.customer.id)) throw new AppError('You already marked this review helpful.', { status: 409, code: 'HELPFUL_ALREADY_RECORDED' });
  await appendRow('REVIEW_HELPFUL', { reviewId: row.reviewId, customerId: request.customer.id, createdAt: new Date().toISOString() });
  row.helpfulCount = number(row.helpfulCount) + 1;
  await updateRow(REVIEW_SHEET, row._row, row);
  ok(response, { helpfulCount: row.helpfulCount }, 'Marked helpful.');
}

export async function reportReview(request, response) {
  await reviewById(request.params.id);
  const reason = String(request.body.reason || '');
  if (!validReportReasons.has(reason)) throw new AppError('Select a valid report reason.', { status: 422, code: 'VALIDATION_ERROR' });
  await appendRow('REVIEW_REPORTS', { reportId: createId('report'), reviewId: request.params.id, customerId: request.customer.id, reason, status: 'pending', createdAt: new Date().toISOString() });
  ok(response, {}, 'Report submitted.');
}

export async function replyToReview(request, response) {
  const row = await reviewById(request.params.id);
  const reply = String(request.body.reply || '').slice(0, 1000);
  if (!reply) throw new AppError('Reply is required.', { status: 422, code: 'VALIDATION_ERROR' });
  const existing = (await getRows('REVIEW_REPLIES')).find((item) => item.reviewId === row.reviewId);
  const record = existing || { replyId: createId('reply'), reviewId: row.reviewId, createdAt: new Date().toISOString() };
  record.adminName = request.admin.name || request.admin.email || 'LitePuff'; record.reply = reply;
  if (existing) await updateRow('REVIEW_REPLIES', existing._row, record); else await appendRow('REVIEW_REPLIES', record);
  row.adminReply = reply;
  row.adminReplyDate = new Date().toISOString();
  row.updatedAt = row.adminReplyDate;
  await updateRow(REVIEW_SHEET, row._row, row);
  ok(response, { reply: record }, 'Reply published.');
}

export async function getAdminProductReviews(request, response) {
  const [reviews, reports, products] = await Promise.all([getRows(REVIEW_SHEET), getRows('REVIEW_REPORTS'), getRows('PRODUCTS')]);
  const status = normalize(request.query.status);
  const search = normalize(request.query.search);
  const ratingFilter = number(request.query.rating);
  const verified = normalize(request.query.verified);
  let rows = reviews.filter((row) => {
    const product = products.find((item) => normalize(item.ProductID) === normalize(row.productId) || normalize(item.Slug) === normalize(row.productId));
    return (!status || moderationBucket(row) === status)
      && (!search || `${row.customerName} ${row.title} ${row.review} ${row.productId} ${product?.Name || ''}`.toLowerCase().includes(search))
      && (!ratingFilter || number(row.rating) === ratingFilter)
      && (!verified || String(truthy(row.verifiedPurchase)) === verified);
  });
  rows.sort((left, right) => request.query.sort === 'oldest'
    ? String(left.createdAt).localeCompare(String(right.createdAt))
    : String(right.createdAt).localeCompare(String(left.createdAt)));
  rows = rows.map((row) => {
    const product = products.find((item) => normalize(item.ProductID) === normalize(row.productId) || normalize(item.Slug) === normalize(row.productId));
    return {
      ...publicReview(row),
      orderId: row.orderId,
      productName: product?.Name || row.productId,
      moderationStatus: moderationBucket(row),
      approvedBy: row.approvedBy || '',
      approvedAt: row.approvedAt || '',
      rejectedReason: row.rejectedReason || '',
      hidden: truthy(row.hidden),
      deleted: truthy(row.deleted),
      spam: truthy(row.spam),
      adminReply: row.adminReply || '',
      adminReplyDate: row.adminReplyDate || '',
      reports: reports.filter((report) => report.reviewId === row.reviewId)
    };
  });
  ok(response, { reviews: rows, pagination: { total: rows.length }, statistics: reviewStatistics(reviews) });
}

export async function moderateProductReview(request, response) {
  const row = await reviewById(request.params.id);
  const now = new Date().toISOString();
  const adminName = request.admin.name || request.admin.email || request.admin.id || 'LitePuff Admin';
  const updated = applyModeration(row, { action: request.body.action, reason: request.body.reason, adminName, now });
  await updateRow(REVIEW_SHEET, row._row, updated);
  ok(response, { review: publicReview(updated) }, 'Review moderation updated.');
}

export async function deleteAdminProductReview(request, response) {
  const row = await reviewById(request.params.id);
  row.deleted = true;
  row.updatedAt = new Date().toISOString();
  await updateRow(REVIEW_SHEET, row._row, row);
  ok(response, {}, 'Review deleted.');
}
