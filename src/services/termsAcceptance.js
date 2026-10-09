import { supabase } from './supabaseClient.js';

export const CURRENT_TERMS_VERSION = 'terms-20261009-v1';

export async function getMyTermsAcceptanceStatus(client = supabase) {
  if (!client) return { ok: false, accepted: false, error: new Error('Supabase is not configured') };
  const { data, error } = await client.rpc('get_my_terms_acceptance_status');
  if (error) return { ok: false, accepted: false, error };
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
