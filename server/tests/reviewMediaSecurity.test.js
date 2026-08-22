import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { inspectReviewImage, isMp4ReviewVideo } from '../controllers/productReviewController.js';

test('review image inspection validates decoded content rather than multipart MIME', async () => {
  const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const metadata = await inspectReviewImage(image);
  assert.equal(metadata.format, 'png');
  await assert.rejects(() => inspectReviewImage(Buffer.from('not-an-image')), (error) => error.code === 'REVIEW_IMAGE_INVALID');
});

test('review video inspection requires an MP4 file signature', () => {
  assert.equal(isMp4ReviewVideo(Buffer.from([0, 0, 0, 20, ...Buffer.from('ftypisom'), 0, 0, 0, 0])), true);
  assert.equal(isMp4ReviewVideo(Buffer.from('pretend mp4 content')), false);
});
