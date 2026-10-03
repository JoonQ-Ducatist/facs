import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

test('rejected media gets a persistent alert within the media chooser', async () => {
  const source = await readFile(resolve(root, 'UploadView.jsx'), 'utf8');
  assert.match(source, /const \[mediaAlert, setMediaAlert\] = useState\(''\)/);
  assert.match(source, /setMediaAlert\(nextMessage\)/);
  assert.match(source, /role="alert" aria-live="assertive" className="upload-media-alert mb-3/);
});

test('a valid later selection clears the media chooser alert', async () => {
  const source = await readFile(resolve(root, 'UploadView.jsx'), 'utf8');
  assert.match(source, /setMediaAlert\(nextMessage\);/);
  assert.match(source, /if \(accepted\.length\) setMedia\(\(items\) => \[\.\.\.items, \.\.\.accepted\]\);/);
});
