import test from 'node:test';
import assert from 'node:assert/strict';
import { clearPendingEmailAuth, readPendingEmailAuth, savePendingEmailAuth } from './pendingEmailAuth.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('a sent email code can be entered after the sign-in screen remounts', () => {
  const storage = memoryStorage();
  savePendingEmailAuth('member@example.com', false, storage);
  assert.deepEqual(readPendingEmailAuth(storage), {
    email: 'member@example.com',
    rememberMe: false,
    sentAt: JSON.parse(storage.getItem('facs_pending_email_auth')).sentAt,
  });
  clearPendingEmailAuth(storage);
  assert.equal(readPendingEmailAuth(storage), null);
});

test('expired or malformed pending email state never reopens code entry', () => {
  const storage = memoryStorage();
  savePendingEmailAuth('member@example.com', true, storage);
  const sentAt = readPendingEmailAuth(storage).sentAt;
  assert.equal(readPendingEmailAuth(storage, sentAt + 15 * 60 * 1000), null);
  storage.setItem('facs_pending_email_auth', '{bad json');
  assert.equal(readPendingEmailAuth(storage), null);
});
