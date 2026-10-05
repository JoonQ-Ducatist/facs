import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// These are the three moderation/media contracts that must be present before
// browser QA. Keep this list small and intentional.
export const REQUIRED_RPC_NAMES = Object.freeze([
  'get_moderation_report_queue',
  'get_moderation_post_preview',
  'get_personalized_feed_post_page',
]);

export const REQUIRED_MIGRATION_CONTRACTS = Object.freeze([
  {
    file: '202609240001_moderation_review_contract.sql',
    tokens: ['create or replace function public.get_moderation_report_queue', 'create or replace function public.review_report'],
  },
  {
    file: '202609250002_moderation_post_preview.sql',
    tokens: ['create or replace function public.get_moderation_post_preview', 'staff_can_read_report_preview_object'],
  },
  {
    file: '202609250003_restore_feed_media_signing.sql',
    tokens: ['create schema if not exists facs_private', 'facs_private.staff_can_read_report_preview_object', 'drop function if exists public.staff_can_read_report_preview_object(text)'],
  },
  {
    file: '202610050004_paged_personalized_feed.sql',
    tokens: ['create or replace function public.get_personalized_feed_post_page', 'after_post_id uuid default null', 'grant execute on function public.get_personalized_feed_post_page(integer, text, uuid) to authenticated'],
  },
]);

export function auditOpenApi(document, requiredRpcNames = REQUIRED_RPC_NAMES) {
  const paths = new Set(Object.keys(document?.paths ?? {}));
  return requiredRpcNames
    .filter((name) => !paths.has(`/rpc/${name}`))
    .map((name) => `/rpc/${name}`);
}

export function auditMigrationContracts(migrationSql, contracts = REQUIRED_MIGRATION_CONTRACTS) {
  const issues = [];
  for (const contract of contracts) {
    const sql = migrationSql[contract.file];
    if (typeof sql !== 'string') {
      issues.push(`${contract.file}: migration file is missing`);
      continue;
    }
    for (const token of contract.tokens) {
      if (!sql.toLowerCase().includes(token.toLowerCase())) issues.push(`${contract.file}: missing contract token "${token}"`);
    }
  }
  return issues;
}

export function readEnvironment(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).flatMap((line) => {
    const separator = line.indexOf('=');
    return separator > 0 ? [[line.slice(0, separator), line.slice(separator + 1)]] : [];
  }));
}

export function assertStagingEnvironment({ stagingUrl, productionUrl }) {
  if (!stagingUrl?.startsWith('https://')) throw new Error('Staging schema guard needs VITE_SUPABASE_URL in .env.local.');
  if (!stagingUrl.includes('.supabase.co')) throw new Error('Staging schema guard only accepts a Supabase HTTPS URL.');
  if (productionUrl && stagingUrl === productionUrl) throw new Error('Staging schema guard refuses the production Supabase URL.');
}

export async function runGuard({ root = ROOT, fetcher = fetch } = {}) {
  const local = readEnvironment(resolve(root, '.env.local'));
  const fallback = readEnvironment(resolve(root, '.env'));
  assertStagingEnvironment({ stagingUrl: local.VITE_SUPABASE_URL, productionUrl: fallback.VITE_SUPABASE_URL });
  if (!local.VITE_SUPABASE_PUBLISHABLE_KEY) throw new Error('Staging schema guard needs VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.');

  const migrationDir = resolve(root, 'supabase/migrations');
  const migrationSql = Object.fromEntries(readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).map((name) => [name, readFileSync(resolve(migrationDir, name), 'utf8')]));
  const migrationIssues = auditMigrationContracts(migrationSql);
  const document = await fetcher(`${local.VITE_SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: local.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${local.VITE_SUPABASE_PUBLISHABLE_KEY}` },
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Staging OpenAPI request failed (${response.status}).`);
    return response.json();
  });
  const missingRpc = auditOpenApi(document);
  return { ok: migrationIssues.length === 0 && missingRpc.length === 0, migrationIssues, missingRpc };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const result = await runGuard();
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(`staging schema guard failed: ${error.message}`);
    process.exitCode = 1;
  }
}
