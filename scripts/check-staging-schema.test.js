import assert from 'node:assert/strict';
import test from 'node:test';
import { REQUIRED_MIGRATION_CONTRACTS, REQUIRED_RPC_NAMES, auditMigrationContracts, auditOpenApi, probeRpcAvailability, runGuard } from './check-staging-schema.mjs';

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
  assert.deepEqual(missingRpc, REQUIRED_RPC_NAMES.map((name) => `/rpc/${name}`));
});

test('RPC probe distinguishes an unavailable function from an auth rejection', async () => {
  const missing = await probeRpcAvailability({
    stagingUrl: 'https://staging.supabase.co',
    publishableKey: 'test-key',
    requiredRpcNames: ['available_rpc', 'missing_rpc'],
    fetcher: async (url) => url.endsWith('/missing_rpc')
      ? { status: 404, json: async () => ({ code: 'PGRST202' }) }
      : { status: 403, json: async () => ({ code: '42501' }) },
  });
  assert.deepEqual(missing, ['/rpc/missing_rpc']);
});

test('staging guard audits the repository without mutating the database', async () => {
  const result = await runGuard({ fetcher: async () => ({ status: 403, json: async () => ({ code: '42501' }) }) });
  assert.equal(result.ok, true);
  assert.deepEqual(result.migrationIssues, []);
  assert.deepEqual(result.missingRpc, []);
});
