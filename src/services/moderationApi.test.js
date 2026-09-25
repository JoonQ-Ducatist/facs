import assert from 'node:assert/strict';
import test from 'node:test';
import { getModerationPostPreview, listModerationReports, reviewModerationReport } from './moderationApi.js';

function client({ rpcData = [], rpcError = null } = {}) {
  const calls = [];
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'staff-a' } }, error: null }) },
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: rpcData, error: rpcError };
    },
    calls,
  };
}

test('moderation service requests staff queue with bounded filters', async () => {
  const fake = client({ rpcData: [{
    id: 'report-a', reporter_id: 'member-a', target_type: 'post', target_id: 'post-a',
    reason: 'spam', detail: null, status: 'received', reviewed_by: null,
    reviewed_at: null, created_at: '2026-09-24T00:00:00.000Z',
  }] });
  const result = await listModerationReports({ status: 'received', limit: 500, client: fake });
  assert.deepEqual(fake.calls, [{ name: 'get_moderation_report_queue', args: { status_filter: 'received', page_size: 100 } }]);
  assert.deepEqual(result.data[0], {
    id: 'report-a', reporterId: 'member-a', targetType: 'post', targetId: 'post-a',
    reason: 'spam', detail: null, status: 'received', reviewedBy: null,
    reviewedAt: null, createdAt: '2026-09-24T00:00:00.000Z',
  });
});

test('moderation service reviews only allowed next states and maps permission errors', async () => {
  const fake = client({ rpcData: [{
    report_id: 'report-a', report_status: 'triaged', report_reviewed_by: 'staff-a',
    report_reviewed_at: '2026-09-24T00:01:00.000Z',
  }] });
  assert.deepEqual(await reviewModerationReport('report-a', 'triaged', { client: fake }), {
    data: {
      reportId: 'report-a', status: 'triaged', reviewedBy: 'staff-a',
      reviewedAt: '2026-09-24T00:01:00.000Z',
    },
  });
  assert.deepEqual(fake.calls, [{ name: 'review_report', args: { target_report_id: 'report-a', next_status: 'triaged' } }]);
  assert.deepEqual(await reviewModerationReport('report-a', 'received', { client: fake }), { error: 'VALIDATION_FAILED' });
  assert.deepEqual(await reviewModerationReport('report-a', 'triaged', { client: client({ rpcError: { code: '42501' } }) }), { error: 'FORBIDDEN' });
});

test('moderation post preview signs only the reported asset and omits reporter identity', async () => {
  const fake = client({ rpcData: [{
    report_id: 'report-a', post_id: 'post-a', question: 'Is this work-ready?', category: 'work',
    author_handle: 'author_a', visibility: 'followers', published_at: '2026-09-25T00:00:00.000Z',
    preview_asset_id: 'asset-a', preview_storage_path: 'uploads/asset-a', preview_media_type: 'image', reporter_id: 'member-a',
  }] });
  fake.storage = { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://signed.test/asset-a' }, error: null }) }) };
  const result = await getModerationPostPreview('report-a', { client: fake });
  assert.deepEqual(fake.calls, [{ name: 'get_moderation_post_preview', args: { target_report_id: 'report-a' } }]);
  assert.deepEqual(result, { data: {
    reportId: 'report-a', postId: 'post-a', question: 'Is this work-ready?', category: 'work', authorHandle: 'author_a',
    visibility: 'followers', publishedAt: '2026-09-25T00:00:00.000Z', media: { id: 'asset-a', type: 'image', url: 'https://signed.test/asset-a' },
  } });
  assert.equal('reporterId' in result.data, false);
});
