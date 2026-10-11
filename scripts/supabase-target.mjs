import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function readEnvironment(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).flatMap((line) => {
    const separator = line.indexOf('=');
    return separator > 0 ? [[line.slice(0, separator), line.slice(separator + 1)]] : [];
  }));
}

export function supabaseRefFromUrl(value) {
  try {
    const host = new URL(value).hostname;
    return host.endsWith('.supabase.co') ? host.split('.')[0] : null;
  } catch {
    return null;
  }
}

export function assertSupabaseTarget({ root = process.cwd(), target = 'staging' } = {}) {
  const productionRef = supabaseRefFromUrl(readEnvironment(resolve(root, '.env')).VITE_SUPABASE_URL);
  const stagingRef = supabaseRefFromUrl(readEnvironment(resolve(root, '.env.local')).VITE_SUPABASE_URL);
  const linkedPath = resolve(root, 'supabase/.temp/project-ref');
  const linkedRef = existsSync(linkedPath) ? readFileSync(linkedPath, 'utf8').trim() : null;

  if (!productionRef || !stagingRef) throw new Error('Both production .env and staging .env.local Supabase URLs are required.');
  if (productionRef === stagingRef) throw new Error('Production and staging Supabase refs must be different.');
  const expectedRef = target === 'production' ? productionRef : stagingRef;
  if (!linkedRef) throw new Error('Supabase CLI is not linked. Link the intended project before database work.');
  if (linkedRef !== expectedRef) {
    throw new Error(`Supabase target mismatch: ${target} expects ${expectedRef}, but CLI is linked to ${linkedRef}.`);
  }
  return { target, expectedRef, linkedRef, productionRef, stagingRef };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const targetArg = process.argv.find((item) => item.startsWith('--target='));
  const target = targetArg?.split('=')[1] ?? 'staging';
  if (!['staging', 'production'].includes(target)) throw new Error('Use --target=staging or --target=production.');
  const result = assertSupabaseTarget({ target });
  console.log(JSON.stringify({ ok: true, target: result.target, projectRef: result.expectedRef }, null, 2));
}
