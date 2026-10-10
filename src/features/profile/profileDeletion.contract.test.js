import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../../App.jsx', import.meta.url), 'utf8');

test('profile deletion checks the owner-scoped library even when the post is absent from the paged feed', () => {
  assert.match(app, /const target = profileCards\?\.find\(\(item\) => item\.id === id\) \?\? cards\.find/);
  assert.match(app, /target\.authorId === authUser\?\.id/);
  assert.match(app, /const result = await deleteMySupabasePost\(id\)/);
  assert.match(app, /if \(result\.error\) \{/);
  assert.match(app, /window\.confirm\(locale === 'en'/);
  assert.match(app, /deletingPostIds\.current\.has\(id\)/);
});
