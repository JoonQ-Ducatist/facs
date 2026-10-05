import assert from 'node:assert/strict';
import test from 'node:test';
import { REQUIRED_MIGRATION_CONTRACTS, REQUIRED_RPC_NAMES, auditMigrationContracts, auditOpenApi, runGuard } from './check-staging-schema.mjs';

test('staging guard accepts the repository migration contracts and exposed RPC fixture', () => {
  const migrationSql = Object.fromEntries(REQUIRED_MIGRATION_CONTRACTS.map((contract) => [contract.file, contract.tokens.join('\n')]));
  const openApi = { paths: Object.fromEntries(REQUIRED_RPC_NAMES.map((name) => [`/rpc/${name}`, {}])) };
  assert.deepEqual(auditMigrationContracts(migrationSql), []);
  assert.deepEqual(auditOpenApi(openApi), []);
});

test('staging guard reports missing migration tokens and RPC paths', () => {
  const migrationSql = { [REQUIRED_MIGRATION_CONTRACTS[0].file]: REQUIRED_MIGRATION_CONTRACTS[0].tokens[0] };
  const missingMigration = auditMigrationContracts(migrationSql);
  const missingRpc = auditOpenApi({ paths: {} });
  assert.match(missingMigration.join('\n'), /migration file is missing/);
  assert.deepEqual(missingRpc, ['/rpc/get_moderation_report_queue', '/rpc/get_moderation_post_preview', '/rpc/get_personalized_feed_post_page']);
});

test('staging guard audits the repository without mutating the database', async () => {
  const openApi = { paths: Object.fromEntries(REQUIRED_RPC_NAMES.map((name) => [`/rpc/${name}`, {}])) };
  const result = await runGuard({ fetcher: async () => ({ ok: true, json: async () => openApi }) });
  assert.equal(result.ok, true);
  assert.deepEqual(result.migrationIssues, []);
  assert.deepEqual(result.missingRpc, []);
});
