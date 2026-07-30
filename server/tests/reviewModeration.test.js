import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCustomerReviewEdits, applyModeration, isPublicReview, moderationBucket, reviewStatistics } from '../controllers/productReviewController.js';

const pendingReview = {
  reviewId: 'review-1',
  productId: 'peri-peri-makhana',
  customerId: 'customer-1',
  rating: '5',
  tasteRating: '5',
  freshnessRating: '5',
  packagingRating: '4',
  valueRating: '5',
  crunchinessRating: '5',
  status: 'pending',
  hidden: 'false',
  deleted: 'false',
  spam: 'false',
  createdAt: '2026-07-30T10:00:00.000Z'
};

test('pending reviews are excluded until an admin approves them', () => {
  assert.equal(isPublicReview(pendingReview, 'peri-peri-makhana'), false);
  const approved = applyModeration(pendingReview, { action: 'approve', adminName: 'Aditi Admin', now: '2026-07-31T10:00:00.000Z' });
  assert.equal(approved.status, 'approved');
  assert.equal(approved.approvedBy, 'Aditi Admin');
  assert.equal(approved.approvedAt, '2026-07-31T10:00:00.000Z');
  assert.equal(isPublicReview(approved, 'peri-peri-makhana'), true);
});

test('hidden, spam, and soft-deleted approved reviews remain private', () => {
  const approved = applyModeration(pendingReview, { action: 'approve', adminName: 'Admin' });
  for (const action of ['hide', 'spam', 'delete']) {
    const moderated = applyModeration(approved, { action, adminName: 'Admin' });
    assert.equal(isPublicReview(moderated, approved.productId), false);
  }
});

test('soft delete preserves the row status and restore returns it to its previous queue', () => {
  const rejected = applyModeration(pendingReview, { action: 'reject', reason: 'Irrelevant', adminName: 'Admin' });
  const deleted = applyModeration(rejected, { action: 'delete', adminName: 'Admin' });
  assert.equal(deleted.status, 'rejected');
  assert.equal(moderationBucket(deleted), 'deleted');
  const restored = applyModeration(deleted, { action: 'restore', adminName: 'Admin' });
  assert.equal(restored.status, 'rejected');
  assert.equal(moderationBucket(restored), 'rejected');
});

test('customer edits cannot approve, hide, delete, or mark a review as spam', () => {
  const edited = applyCustomerReviewEdits(pendingReview, { review: 'Updated review text', status: 'approved', approvedBy: 'customer-1', hidden: true, deleted: true, spam: true }, '2026-07-31T12:00:00.000Z');
  assert.equal(edited.review, 'Updated review text');
  assert.equal(edited.status, 'pending');
  assert.equal(edited.approvedBy, '');
  assert.equal(edited.hidden, false);
  assert.equal(edited.deleted, false);
  assert.equal(edited.spam, false);
});

test('rating statistics include only publicly approved reviews', () => {
  const approved = applyModeration(pendingReview, { action: 'approve', adminName: 'Admin' });
  const summary = reviewStatistics([pendingReview, approved], new Date('2026-07-31T12:00:00.000Z'));
  assert.equal(summary.pending, 1);
  assert.equal(summary.approved, 1);
  assert.equal(summary.averageRating, 5);
});
