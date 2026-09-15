import test from 'node:test';
import assert from 'node:assert/strict';
import { canSubmitHandle, getHandleSuggestions, getMyProfile, getPublicHandle, isConfiguredHandle, mapHandleSaveResult, normalizeHandle, updateMyHandle } from './profileService.js';

test('a public handle is normalized without carrying an @ prefix', () => {
  assert.equal(normalizeHandle(' @My_Look '), 'my_look');
  assert.equal(normalizeHandle('@user_b'), 'user_b');
});

test('profile header uses each persisted account handle as its single source of truth', () => {
  assert.equal(getPublicHandle({ handle: '@user_b' }), 'user_b');
  assert.equal(getPublicHandle({ handle: 'account_a' }), 'account_a');
  assert.notEqual(getPublicHandle({ handle: 'account_a' }), getPublicHandle({ handle: 'account_b' }));
  assert.equal(getPublicHandle({ handle: 'member_abc123' }), null);
});

test('valid handle can be submitted when availability is unknown, but invalid or occupied values stay blocked', () => {
  assert.equal(canSubmitHandle({ handle: '@user_b', available: null }), true);
  assert.equal(canSubmitHandle({ handle: 'user_b', available: true }), true);
  assert.equal(canSubmitHandle({ handle: 'user_b', available: false }), false);
  assert.equal(canSubmitHandle({ handle: 'ab', available: null }), false);
  assert.equal(canSubmitHandle({ handle: 'user_b', checking: true, available: null }), false);
});

test('profile save adapts the shared API envelope for success, duplicate, and permission failures', () => {
  assert.deepEqual(mapHandleSaveResult({ data: { id: 'a', handle: 'user_a' } }), { ok: true, data: { id: 'a', handle: 'user_a' } });
  assert.deepEqual(mapHandleSaveResult({ error: { code: 'VALIDATION_FAILED', message: 'duplicate' } }), { ok: false, message: 'duplicate' });
  assert.equal(mapHandleSaveResult({ data: { id: 'a', handle: 'member_placeholder' } }).ok, false);
});

test('profile save exposes a localized message for a future one-month handle lock', () => {
  assert.deepEqual(mapHandleSaveResult({ error: { code: 'RATE_LIMITED' } }, 'en'), { ok: false, message: 'You can change your public ID again one month after the last change.' });
  assert.deepEqual(mapHandleSaveResult({ error: { code: 'RATE_LIMITED', fieldErrors: { reason: 'public_handle_change_cooldown' } } }, 'en'), { ok: false, message: 'You can change your public ID again one month after the last change.' });
  assert.deepEqual(mapHandleSaveResult({ error: { code: '22023', message: 'public_handle_change_cooldown' } }), { ok: false, message: '공개 아이디는 변경 후 1개월이 지나야 다시 변경할 수 있어요.' });
});

test('generated member handles never unlock public posting', () => {
  assert.equal(isConfiguredHandle('member_27cf48e1'), false);
  assert.equal(isConfiguredHandle('my_look_daily'), true);
  assert.equal(isConfiguredHandle('한글아이디'), false);
});

test('starter handle suggestions are stable and use valid public-handle syntax', () => {
  const suggestions = getHandleSuggestions('member_27cf48e1');
  assert.deepEqual(suggestions, getHandleSuggestions('member_27cf48e1'));
  assert.equal(suggestions.every((handle) => isConfiguredHandle(handle)), true);
  assert.equal(new Set(suggestions).size, 3);
});

function profileClient({ id, handle, profileReadable = true }) {
  const profile = { id, handle, display_name: null };
  return {
    auth: { getUser: async () => ({ data: { user: { id } }, error: null }) },
    rpc: async () => ({ data: { ...profile }, error: null }),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: profileReadable ? { ...profile } : null, error: null }),
        }),
      }),
    }),
    setHandle(nextHandle) { profile.handle = nextHandle; },
  };
}

test('a saved public handle is confirmed by a server read and survives reload hydration', async () => {
  const client = profileClient({ id: 'member-a', handle: 'member_placeholder' });
  client.rpc = async (_name, args) => {
    client.setHandle(args.input_handle);
    return { data: { id: 'member-a', handle: args.input_handle }, error: null };
  };
  const saved = await updateMyHandle('reload_probe_a', { client });
  assert.equal(saved.data.handle, 'reload_probe_a');
  const afterReload = await getMyProfile({ client });
  assert.equal(afterReload.data.handle, 'reload_probe_a');
});

test('profile sessions remain isolated when handles are saved independently', async () => {
  const accountA = profileClient({ id: 'member-a', handle: 'account_a' });
  const accountB = profileClient({ id: 'member-b', handle: 'account_b' });
  accountA.rpc = async (_name, args) => {
    accountA.setHandle(args.input_handle);
    return { data: { id: 'member-a', handle: args.input_handle }, error: null };
  };
  const saved = await updateMyHandle('account_a_new', { client: accountA });
  assert.equal(saved.data.id, 'member-a');
  assert.equal((await getMyProfile({ client: accountA })).data.handle, 'account_a_new');
  assert.equal((await getMyProfile({ client: accountB })).data.handle, 'account_b');
});

test('a write is not reported as successful when the saved profile cannot be read back', async () => {
  const client = profileClient({ id: 'member-a', handle: 'member_placeholder', profileReadable: false });
  const result = await updateMyHandle('missing_profile', { client });
  assert.equal(result.error.code, 'NOT_FOUND');
});

test('the server cooldown error remains distinct from handle syntax validation', async () => {
  const client = profileClient({ id: 'member-a', handle: 'account_a' });
  client.rpc = async () => ({ data: null, error: { code: '22023', message: 'public_handle_change_cooldown' } });
  const result = await updateMyHandle('account_b', { client });
  assert.equal(result.error.code, 'RATE_LIMITED');
  assert.equal(result.error.fieldErrors.reason, 'public_handle_change_cooldown');
  assert.match(result.error.message, /1개월/);
});
