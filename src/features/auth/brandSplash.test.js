import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAND_SPLASH_DURATION_MS, brandTaglines, selectBrandTagline } from './brandSplash.js';

test('brand splash keeps the approved two-and-a-half-second duration', () => {
  assert.equal(BRAND_SPLASH_DURATION_MS, 2500);
});

test('brand splash includes the ten approved Korean and English taglines', () => {
  assert.equal(brandTaglines.length, 10);
  for (const tagline of brandTaglines) {
    assert.ok(tagline.ko);
    assert.ok(tagline.en);
  }
});

test('brand splash selects a stable entry from the approved list', () => {
  assert.equal(selectBrandTagline(() => 0), brandTaglines[0]);
  assert.equal(selectBrandTagline(() => 0.999), brandTaglines[9]);
});
