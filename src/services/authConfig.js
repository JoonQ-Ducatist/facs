/** Public-only authentication settings. Never place OAuth secrets or service-role keys here. */
// Apple sign-in is intentionally deferred until the Apple Developer enrollment is active.
export const AUTH_PROVIDER = Object.freeze(['google', 'kakao']);

export const AUTH_CONFIG_ERROR = Object.freeze({
  MISSING_PUBLIC_CONFIG: 'MISSING_PUBLIC_CONFIG',
  MISSING_REDIRECT_URL: 'MISSING_REDIRECT_URL',
  INVALID_REDIRECT_URL: 'INVALID_REDIRECT_URL',
});

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null;
    return url;
  } catch {
    return null;
  }
}

const FACS_PREVIEW_HOST = /^product-test-[a-z0-9-]+-joonq-ducatist\.vercel\.app$/;

function previewCallback(currentOrigin) {
  const origin = safeUrl(currentOrigin);
  if (!origin || !FACS_PREVIEW_HOST.test(origin.hostname)) return null;
  return new URL('/auth/callback', origin).toString();
}

/**
 * Production uses its fixed callback. The exact known FACS Preview host uses
 * itself, preventing a Preview test from silently entering production.
 */
export function getPublicAuthConfig(environment = {}, currentOrigin = typeof window === 'undefined' ? '' : window.location.origin) {
  const supabaseUrl = environment.VITE_SUPABASE_URL?.trim();
  // `VITE_SUPABASE_ANON_KEY` remains a temporary compatibility alias while
  // deployments move to Supabase's publishable-key naming.
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || environment.VITE_SUPABASE_ANON_KEY?.trim();
  const currentPreviewCallback = previewCallback(currentOrigin);
  const redirectTo = currentPreviewCallback || environment.VITE_AUTH_REDIRECT_URL?.trim();
  if (!supabaseUrl || !publishableKey) return { ok: false, code: AUTH_CONFIG_ERROR.MISSING_PUBLIC_CONFIG };
  if (!redirectTo) return { ok: false, code: AUTH_CONFIG_ERROR.MISSING_REDIRECT_URL };

  const redirect = safeUrl(redirectTo);
  const appOrigin = currentPreviewCallback ? safeUrl(currentOrigin) : (environment.VITE_APP_ORIGIN?.trim() ? safeUrl(environment.VITE_APP_ORIGIN.trim()) : null);
  if (!redirect || (environment.VITE_APP_ORIGIN?.trim() && !appOrigin) || (appOrigin && redirect.origin !== appOrigin.origin)) {
    return { ok: false, code: AUTH_CONFIG_ERROR.INVALID_REDIRECT_URL };
  }

  return { ok: true, supabaseUrl, publishableKey, redirectTo: redirect.toString() };
}

/** Returns a safe, non-provider-specific callback failure marker for UI messaging. */
export function getAuthCallbackFailure(search = '') {
  const params = new URLSearchParams(search);
  return params.has('error') || params.has('error_code') ? 'AUTH_CALLBACK_FAILED' : null;
}

/** Returns the one-time PKCE code only when an authentication callback supplies it. */
export function getAuthCallbackCode(search = '') {
  return new URLSearchParams(search).get('code');
}
