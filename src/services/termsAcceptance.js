import { supabase } from './supabaseClient.js';

export const CURRENT_TERMS_VERSION = 'terms-20261009-v1';

function isTemporaryReadError(error, httpStatus) {
  const status = Number(httpStatus);
  return status === 429 || status >= 500 || error?.name === 'TypeError'
    || /failed to fetch|network|timeout|offline/i.test(error?.message ?? '');
}

export async function getMyTermsAcceptanceStatus(client = supabase) {
  if (!client) return { ok: false, accepted: false, error: new Error('Supabase is not configured') };
  let data;
  let error;
  let status;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      ({ data, error, status } = await client.rpc('get_my_terms_acceptance_status'));
    } catch (caught) {
      error = caught;
    }
    if (!error || attempt === 1) break;
    if (Number(status) === 401) {
      try {
        const refreshed = await client.auth?.refreshSession?.();
        if (!refreshed?.data?.session?.access_token || refreshed.error) break;
      } catch {
        break;
      }
      continue;
    }
    if (!isTemporaryReadError(error, status)) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (error) return { ok: false, accepted: false, error, status };
  const record = Array.isArray(data) ? data[0] : data;
  return { ok: true, accepted: record?.terms_version === CURRENT_TERMS_VERSION, record: record ?? null };
}

export async function acceptCurrentTerms(locale, client = supabase) {
  if (!client) return { ok: false, error: new Error('Supabase is not configured') };
  const { data, error } = await client.rpc('accept_current_terms', { input_locale: locale === 'en' ? 'en' : 'ko' });
  const record = Array.isArray(data) ? data[0] : data;
  if (record?.terms_version === CURRENT_TERMS_VERSION) return { ok: true, record };

  // If the write response was lost or empty, confirm the durable state before
  // asking the member to submit the same acceptance again.
  const status = await getMyTermsAcceptanceStatus(client);
  if (status.ok && status.accepted) return { ok: true, record: status.record };
  return { ok: false, error: error ?? status.error ?? new Error('Acceptance was not recorded') };
}
