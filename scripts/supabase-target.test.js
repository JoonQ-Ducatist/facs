import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assertSupabaseTarget } from './supabase-target.mjs';

async function fixture({ linked = 'staging-ref', production = 'production-ref', staging = 'staging-ref' } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'facs-target-'));
  await mkdir(join(root, 'supabase/.temp'), { recursive: true });
  await writeFile(join(root, '.env'), `VITE_SUPABASE_URL=https://${production}.supabase.co\n`);
  await writeFile(join(root, '.env.local'), `VITE_SUPABASE_URL=https://${staging}.supabase.co\n`);
  await writeFile(join(root, 'supabase/.temp/project-ref'), linked);
  return root;
}

test('staging guard accepts only the staging env ref', async () => {
  const root = await fixture();
  assert.equal(assertSupabaseTarget({ root, target: 'staging' }).expectedRef, 'staging-ref');
});

test('staging guard blocks an accidental production CLI link', async () => {
  const root = await fixture({ linked: 'production-ref' });
  assert.throws(() => assertSupabaseTarget({ root, target: 'staging' }), /target mismatch/);
});

test('target guard rejects identical production and staging refs', async () => {
  const root = await fixture({ linked: 'same-ref', production: 'same-ref', staging: 'same-ref' });
  assert.throws(() => assertSupabaseTarget({ root }), /must be different/);
});
