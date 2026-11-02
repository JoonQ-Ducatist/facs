import { supabase } from '../../services/supabaseClient.js';

/** Refresh only the failed asset through the existing member's Storage policy. */
export async function renewMediaUrl(storagePath, client = supabase) {
  if (!client || typeof storagePath !== 'string' || !storagePath) return null;
  try {
    const { data, error } = await client.storage.from('facs-media').createSignedUrl(storagePath, 60 * 60);
    return error ? null : data?.signedUrl ?? null;
  } catch { return null; }
}
