import assert from 'node:assert/strict';
import test from 'node:test';
import { hasRankingVotes } from './rankingEligibility.js';

test('일반 평가는 호감 또는 비호감 평가가 한 건 이상일 때만 랭킹에 표시한다', () => {
  assert.equal(hasRankingVotes({ yesVotes: 0, noVotes: 0 }), false);
  assert.equal(hasRankingVotes({ yesVotes: 1, noVotes: 0 }), true);
  assert.equal(hasRankingVotes({ yesVotes: 0, noVotes: 1 }), true);
});

test('나이 추정 평가는 유효한 나이 평가가 한 건 이상일 때만 랭킹에 표시한다', () => {
  assert.equal(hasRankingVotes({ evaluationType: 'NUMERIC_AGE', ageVoteCount: 0 }), false);
  assert.equal(hasRankingVotes({ evaluationType: 'NUMERIC_AGE', ageVoteCount: 1 }), true);
});
