import test from 'node:test';
import assert from 'node:assert/strict';
import { getModerationReportAudit, reportDeduplicationKey, submitPostReport } from './reportsApi.js';

function client({ rpcError = null } = {}) {
  const calls = [];
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'member-a' } }, error: null }) },
    rpc: async (name, args) => { calls.push({ name, args }); return { data: 'report-a', error: rpcError }; },
    calls,
  };
}

test('post reports use the narrow RPC so the browser cannot write review state', async () => {
  const fake = client();
  const result = await submitPostReport('post-a', 'harassment', { client: fake });
  assert.deepEqual(result, { data: { postId: 'post-a', reason: 'harassment' } });
  assert.deepEqual(fake.calls, [{ name: 'submit_post_report', args: { target_post_id: 'post-a', input_reason: 'harassment' } }]);
});

test('post reports distinguish a duplicate from a retryable failure', async () => {
  assert.deepEqual(await submitPostReport('post-a', 'spam', { client: client({ rpcError: { code: '23505' } }) }), { error: 'ALREADY_REPORTED' });
  assert.deepEqual(await submitPostReport('post-a', 'spam', { client: client({ rpcError: { code: '50000' } }) }), { error: 'UNAVAILABLE' });
});

test('report deduplication key is scoped to one member, post, and approved reason', () => {
  assert.equal(reportDeduplicationKey('member-a', 'post-a', 'spam'), 'member-a:post-a:spam');
  assert.equal(reportDeduplicationKey('member-a', 'post-a', 'not-a-reason'), null);
});

test('audit adapter requests only the staff-gated RPC and maps no reporter identity', async () => {
  const fake = client({});
  fake.rpc = async (name, args) => {
    fake.calls.push({ name, args });
    return { data: [{ report_id: 'report-a', reason: 'spam', current_status: 'triaged', report_created_at: '2026-09-27T00:00:00Z', reviewed_at: '2026-09-27T00:01:00Z', action: 'report_status_changed', from_status: 'received', to_status: 'triaged', action_at: '2026-09-27T00:01:00Z', reporter_id: 'never-map-me' }], error: null };
  };
  const result = await getModerationReportAudit('report-a', { client: fake });
  assert.deepEqual(fake.calls, [{ name: 'get_moderation_report_audit', args: { target_report_id: 'report-a' } }]);
  assert.equal(result.data[0].reporterId, undefined);
  assert.deepEqual(result.data[0], {
    reportId: 'report-a', reason: 'spam', status: 'triaged', createdAt: '2026-09-27T00:00:00Z', reviewedAt: '2026-09-27T00:01:00Z',
    action: 'report_status_changed', fromStatus: 'received', toStatus: 'triaged', actionAt: '2026-09-27T00:01:00Z',
  });
});
