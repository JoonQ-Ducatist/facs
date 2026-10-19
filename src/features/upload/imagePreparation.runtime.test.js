import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareImageForUpload } from './imagePreparation.js';

function browser(t, { width = 4000, height = 3000, context = true, encoded = new Blob(['jpeg'], { type: 'image/jpeg' }), throws = false } = {}) {
  const originalImage = globalThis.Image;
  const originalDocument = globalThis.document;
  let draws = 0;
  let encodes = 0;
  const canvas = {
    getContext: () => context ? { drawImage: () => { draws++; } } : null,
    toBlob: (resolve) => { encodes++; if (throws) throw new Error('unsupported'); resolve(encoded); },
  };
  globalThis.Image = class {
    width = width;
    height = height;
    set src(value) { queueMicrotask(() => this.onload()); }
  };
  globalThis.document = { createElement: () => canvas };
  t.after(() => {
    if (originalImage === undefined) delete globalThis.Image; else globalThis.Image = originalImage;
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
  });
  return { canvas, draws: () => draws, encodes: () => encodes };
}

const jpeg = () => new File(['x'.repeat(100)], 'source.jpeg', { type: 'image/jpeg', lastModified: 123 });

test('image preparation keeps the original when canvas drawing is unavailable', async (t) => {
  const fixture = browser(t, { context: false });
  const original = jpeg();
  assert.equal(await prepareImageForUpload(original), original);
  assert.equal(fixture.encodes(), 0);
});

test('image preparation returns a smaller drawn JPEG within existing dimensions', async (t) => {
  const fixture = browser(t);
  const original = jpeg();
  const result = await prepareImageForUpload(original);
  assert.equal(fixture.draws(), 1);
  assert.equal(fixture.canvas.width, 2048);
  assert.equal(fixture.canvas.height, 1536);
  assert.ok(result.size < original.size);
  assert.equal(result.type, 'image/jpeg');
  assert.equal(result.lastModified, 123);
});

test('image preparation retains originals for failed or larger encoding', async (t) => {
  const original = jpeg();
  const fixture = browser(t, { encoded: new Blob(['x'.repeat(101)]) });
  assert.equal(await prepareImageForUpload(original), original);
  fixture.canvas.toBlob = () => { throw new Error('unsupported'); };
  assert.equal(await prepareImageForUpload(original), original);
});

test('image preparation preserves small JPEG and non-JPEG content without encoding', async (t) => {
  const fixture = browser(t, { width: 1024, height: 768 });
  const original = jpeg();
  assert.equal(await prepareImageForUpload(original), original);
  const png = new File(['png'], 'source.png', { type: 'image/png' });
  assert.equal(await prepareImageForUpload(png), png);
  assert.equal(fixture.encodes(), 0);
});
