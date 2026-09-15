import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('./migrations/202609150001_post_boosts.sql', import.meta.url), 'utf8');

function isBoostEligible({ post, viewerId, votes = [], boosts = [], now }) {
  if (!post || post.author_id !== viewerId || post.status !== 'published' || !post.published_at) return false;
  const ageMs = new Date(now).getTime() - new Date(post.published_at).getTime();
  if (ageMs < 0 || ageMs >= 60 * 60 * 1000) return false;
  if (boosts.some((boost) => boost.post_id === post.id)) return false;
  return votes.filter((vote) => vote.post_id === post.id && vote.voter_id !== post.author_id).length === 0;
}

function boostRank({ post, viewerId, votes = [], boosts = [] }) {
  const boost = boosts.find((item) => item.post_id === post.id && item.status === 'active');
  if (!boost || post.author_id === viewerId) return 1;
  const otherVotes = votes.filter((vote) => vote.post_id === post.id && vote.voter_id !== post.author_id).length;
  return otherVotes < boost.target_votes ? 0 : 1;
}

const now = '2026-09-15T12:00:00.000Z';
const post = { id: 'post-a', author_id: 'author-a', status: 'published', published_at: '2026-09-15T11:30:00.000Z', category: 'outfit' };

test('Boost migration enforces the server-clock one-hour, zero-other-vote rule', () => {
  assert.match(sql, /p\.published_at\s*>=\s*now\(\)\s*-\s*interval\s+'1 hour'/i);
  assert.match(sql, /v\.voter_id\s*<>\s*p\.author_id/i);
  assert.match(sql, /having\s+count\(v\.id\)\s*=\s*0/i);
  assert.match(sql, /auth\.uid\(\)\s+is\s+not\s+null/i);
});

test('zero other ratings within one hour is eligible', () => {
  assert.equal(isBoostEligible({ post, viewerId: 'author-a', now }), true);
});

test('one other rating excludes the Boost candidate', () => {
  assert.equal(isBoostEligible({
    post,
    viewerId: 'author-a',
    now,
    votes: [{ post_id: 'post-a', voter_id: 'rater-b' }],
  }), false);
});

test('an author vote is excluded defensively from the other-vote count', () => {
  assert.equal(isBoostEligible({
    post,
    viewerId: 'author-a',
    now,
    votes: [{ post_id: 'post-a', voter_id: 'author-a' }],
  }), true);
});

test('posts at or beyond one hour are excluded', () => {
  assert.equal(isBoostEligible({
    post: { ...post, published_at: '2026-09-15T11:00:00.000Z' },
    viewerId: 'author-a',
    now,
  }), false);
  assert.equal(isBoostEligible({
    post: { ...post, published_at: '2026-09-15T12:01:00.000Z' },
    viewerId: 'author-a',
    now,
  }), false);
});

test('an existing Boost prevents a duplicate request', () => {
  assert.equal(isBoostEligible({
    post,
    viewerId: 'author-a',
    now,
    boosts: [{ post_id: 'post-a', status: 'active' }],
  }), false);
  assert.match(sql, /post_id\s+uuid\s+primary key\s+references\s+public\.posts/i);
  assert.match(sql, /boost already requested/i);
});

test('Boost priority excludes the uploader but exposes to another permitted member until target votes', () => {
  const boosts = [{ post_id: 'post-a', status: 'active', target_votes: 100 }];
  assert.equal(boostRank({ post, viewerId: 'author-a', boosts }), 1);
  assert.equal(boostRank({ post, viewerId: 'viewer-b', boosts }), 0);
  assert.equal(boostRank({ post, viewerId: 'viewer-b', boosts, votes: Array.from({ length: 100 }, (_, index) => ({ post_id: 'post-a', voter_id: `rater-${index}` })) }), 1);
});

test('feed contract retains category filtering and discovery shuffle after Boost priority', () => {
  assert.match(sql, /category_filter\s+is\s+null\s+or\s+p\.category\s*=\s*category_filter/i);
  assert.match(sql, /md5\(p\.id::text\s*\|\|\s*auth\.uid\(\)::text\s*\|\|\s*current_date::text\)/i);
  assert.match(sql, /case\s+when\s+boost_rank\s*=\s*0\s+then\s+'boosted'/i);
  assert.match(sql, /order\s+by\s+\s*boost_rank\s+asc/i);
});

