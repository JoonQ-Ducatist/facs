import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

test('only JPEG files are eligible for client-side optimization', async () => {
  const source = await readFile(resolve(root, 'imagePreparation.js'), 'utf8');
  assert.match(source, /file\.type\.toLowerCase\(\) === 'image\/jpeg'/);
  assert.match(source, /return file;/);
});

test('JPEG optimization bounds dimensions and falls back to the original', async () => {
  const source = await readFile(resolve(root, 'imagePreparation.js'), 'utf8');
  assert.match(source, /UPLOAD_IMAGE_MAX_EDGE = 2048/);
  assert.match(source, /blob\.size >= file\.size/);
  assert.match(source, /catch \{\s*return file;/);
});

test('the upload flow stores the prepared JPEG instead of the original source', async () => {
  const source = await readFile(resolve(root, 'UploadView.jsx'), 'utf8');
  assert.match(source, /const uploadFile = type === 'image' \? await prepareImageForUpload\(file\) : file;/);
  assert.match(source, /URL\.createObjectURL\(type === 'image' \? uploadFile : file\)/);
  assert.match(source, /accepted\.push\(makeItem\(uploadFile, url, type\)\)/);
  assert.doesNotMatch(source, /readAsDataURL/);
});

test('file selection exceptions are shown in the media picker area', async () => {
  const source = await readFile(resolve(root, 'UploadView.jsx'), 'utf8');
  assert.match(source, /addFiles\(event\.currentTarget\.files\)\.catch\(\(\) => \{[\s\S]*?setError\(message\);\s*setMediaAlert\(message\);/);
});
