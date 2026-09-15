import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fixture = await readFile(new URL('./boost-staging-fixture.sql', import.meta.url), 'utf8');

test('Boost staging fixture uses server time and always rolls back', () => {
  assert.match(fixture, /begin;/i);
  assert.match(fixture, /now\(\)\s*-\s*interval\s+'30 minutes'/i);
  assert.match(fixture, /now\(\)\s*-\s*interval\s+'90 minutes'/i);
  assert.match(fixture, /get_my_boost_candidates/i);
  assert.match(fixture, /request_post_boost/i);
  assert.match(fixture, /get_personalized_feed_post_ids/i);
  assert.match(fixture, /unique_violation/i);
  assert.match(fixture, /rollback;\s*$/i);
  assert.doesNotMatch(fixture, /clock_timestamp\(\)|set_config\(\s*'request\.jwt\.claim\.iat'/i);
});
