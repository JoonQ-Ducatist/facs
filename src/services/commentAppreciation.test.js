import assert from 'node:assert/strict';
import test from 'node:test';
import { readCommentAppreciation, setCommentAppreciation } from './commentAppreciation.js';

const commentId = '85d442df-113e-4607-9006-bae3db977f07';

test('only requests appreciation for the loaded comments and preserves an empty result', async () => {
  let requests = 0;
  const client = { from(table) {
    requests++;
    assert.equal(table, 'comment_appreciations');
    return { select: columns => ({ in: async (key, ids) => {
      assert.equal(columns, 'comment_id');
      assert.equal(key, 'comment_id');
      assert.deepEqual(ids, [commentId]);
      return { data: [] };
    } }) };
  } };
  assert.deepEqual(await readCommentAppreciation([], client), new Set());
  assert.deepEqual(await readCommentAppreciation([commentId], client), new Set());
  assert.equal(requests, 1);
});

test('an unavailable appreciation query remains distinguishable from no marks', async () => {
  const denied = { from: () => ({ select: () => ({ in: async () => ({ error: { code: '42501' } }) }) }) };
  assert.equal(await readCommentAppreciation([commentId], denied), null);
  assert.equal(await readCommentAppreciation([commentId], { from() { throw new Error('offline'); } }), null);
});

test('mark and remove write only the requested comment, and denied writes fail', async () => {
  const operations = [];
  const client = { from: () => ({
    upsert: async (row, options) => { operations.push(['mark', row, options]); return {}; },
    delete: () => ({ eq: async (column, id) => {
      operations.push(['remove', column, id]);
      return { error: { code: '42501' } };
    } }),
  }) };
  assert.equal(await setCommentAppreciation('invalid', true, client), false);
  assert.equal(await setCommentAppreciation(commentId, true, client), true);
  assert.equal(await setCommentAppreciation(commentId, false, client), false);
  assert.deepEqual(operations, [
    ['mark', { comment_id: commentId }, { onConflict: 'comment_id', ignoreDuplicates: true }],
    ['remove', 'comment_id', commentId],
  ]);
});
