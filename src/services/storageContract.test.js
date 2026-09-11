import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mediaLimitMigration = readFileSync(new URL('../../supabase/migrations/202609110001_align_media_limit.sql', import.meta.url), 'utf8');

test('server media rules accept the product limit of five images plus one video', () => {
  assert.match(mediaLimitMigration, /jsonb_array_length\(input_media\) not between 1 and 6/);
  assert.match(mediaLimitMigration, /image_count > 5 or video_count > 1/);
  assert.match(mediaLimitMigration, /item_count >= 6/);
});
