import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const userFacingFiles = [
  'index.html',
  'src/App.jsx',
  'src/features/upload/UploadView.jsx',
  'src/services/seo.js',
];

test('user-facing product copy uses the approved feedback language', () => {
  userFacingFiles.forEach((file) => {
    const copy = readFileSync(resolve(sourceRoot, file), 'utf8');
    assert.doesNotMatch(copy, /첫인상|first impression/i, `${file} must use the approved feedback language`);
  });
});
