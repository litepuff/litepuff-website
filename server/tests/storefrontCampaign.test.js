import test from 'node:test';
import assert from 'node:assert/strict';
import { activeCampaign } from '../../src/config/storefrontCampaign.js';

test('campaign stays hidden when disabled', () => {
  assert.equal(activeCampaign({ enabled: false }), null);
});

test('campaign only appears inside its configured window', () => {
  const campaign = { enabled: true, startDate: '2026-10-01T00:00:00Z', endDate: '2026-11-01T00:00:00Z' };
  assert.equal(activeCampaign(campaign, new Date('2026-09-30T23:59:59Z')), null);
  assert.equal(activeCampaign(campaign, new Date('2026-10-15T00:00:00Z')), campaign);
  assert.equal(activeCampaign(campaign, new Date('2026-11-01T00:00:01Z')), null);
});
