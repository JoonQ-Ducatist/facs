import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./FeedView.jsx', import.meta.url), 'utf8');

test('both populated and empty comment previews open the comment panel', () => {
  assert.match(source, /<button type="button" onClick=\{onExpand\} className="comment-preview__text/);
  assert.match(source, /<button type="button" onClick=\{onExpand\} className="comment-preview__empty/);
});

test('comment previews render from the feed card before the detail panel opens', () => {
  assert.match(source, /comments=\{card\.comments \?\? \[\]\}/);
});

test('the comment list renders persisted comments only, not the post caption as a comment', () => {
  assert.doesNotMatch(source, /<Avatar author=\{card\.author\} \/><p className="comment-panel__comment-text/);
  assert.match(source, /visibleComments\.map\(\(comment\)/);
});
