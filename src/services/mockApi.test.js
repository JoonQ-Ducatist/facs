import test from 'node:test';
import assert from 'node:assert/strict';
import { API_ERROR, SAMPLE_STATUS, getSampleStatus, submitVote, toAggregate } from './mockApi.js';

test('the first rating starts results while Boost eligibility starts at ten ratings', () => {
  assert.equal(getSampleStatus(0), SAMPLE_STATUS.INSUFFICIENT);
  assert.equal(getSampleStatus(1), SAMPLE_STATUS.INSUFFICIENT);
  assert.equal(getSampleStatus(9), SAMPLE_STATUS.INSUFFICIENT);
  assert.equal(getSampleStatus(10), SAMPLE_STATUS.EARLY_SIGNAL);
  assert.equal(getSampleStatus(30), SAMPLE_STATUS.BASE_RESULT);
  assert.equal(getSampleStatus(100), SAMPLE_STATUS.EXPANDED_SAMPLE);
});

test('binary vote updates only the chosen aggregate', async () => {
  const post = { id: 'binary-1', evaluationType: 'BINARY', yesVotes: 7, noVotes: 3 };
  const response = await submitVote(post, 'no', new Set());
  assert.equal(response.data.post.yesVotes, 7);
  assert.equal(response.data.post.noVotes, 4);
  assert.equal(response.data.aggregate.approvalRate, 64);
});

test('age vote stays inside the uploader range and recalculates average', async () => {
  const post = { id: 'age-1', evaluationType: 'NUMERIC_AGE', ageMin: 20, ageMax: 40, ageVoteCount: 2, ageEstimate: 30 };
  const valid = await submitVote(post, { type: 'age', value: 36 }, new Set());
  assert.equal(valid.data.post.ageVoteCount, 3);
  assert.equal(valid.data.post.ageEstimate, 32);
  const invalid = await submitVote(post, { type: 'age', value: 41 }, new Set());
  assert.equal(invalid.error.code, API_ERROR.VALIDATION_FAILED);
});

test('duplicate vote remains rejected by the prototype contract', async () => {
  const response = await submitVote({ id: 'binary-2', yesVotes: 1, noVotes: 0 }, 'yes', new Set(['binary-2']));
  assert.equal(response.error.code, API_ERROR.ALREADY_VOTED);
});

test('age aggregate does not expose any actual-age field', () => {
  const aggregate = toAggregate({ evaluationType: 'NUMERIC_AGE', ageVoteCount: 12, ageEstimate: 28.4, actualAge: 35 });
  assert.deepEqual(aggregate, { evaluationType: 'NUMERIC_AGE', averageAge: 28.4, totalVotes: 12, sampleStatus: SAMPLE_STATUS.EARLY_SIGNAL });
});
