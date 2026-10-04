const STORAGE_KEY = 'facs_pending_email_auth';
const MAX_AGE_MS = 15 * 60 * 1000;

export function readPendingEmailAuth(storage, now = Date.now()) {
  try {
    const target = storage ?? globalThis.sessionStorage;
    const raw = target?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw);
    if (typeof pending.email === 'string' && pending.email.includes('@') &&
        typeof pending.sentAt === 'number' && now >= pending.sentAt &&
        now - pending.sentAt < MAX_AGE_MS && typeof pending.rememberMe === 'boolean') {
      return pending;
    }
    target.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing and malformed saved state should leave email sign-in usable.
  }
  return null;
}

export function savePendingEmailAuth(email, rememberMe, storage) {
  try {
    (storage ?? globalThis.sessionStorage)?.setItem(STORAGE_KEY, JSON.stringify({ email, rememberMe, sentAt: Date.now() }));
  } catch {
    // Sign-in still works in memory when browser storage is unavailable.
  }
}

export function clearPendingEmailAuth(storage) {
  try {
    (storage ?? globalThis.sessionStorage)?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear when browser storage is unavailable.
  }
}
