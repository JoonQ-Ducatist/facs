import { supabase } from './supabaseClient.js';

const POST_REPORT_REASONS = new Set(['spam', 'hate', 'harassment', 'sexual_content', 'privacy', 'defamation', 'social_norm_violation', 'other']);

/** A browser-session key only; it intentionally contains no report-detail text. */
export function reportDeduplicationKey(memberId, postId, reason) {
  return memberId && postId && POST_REPORT_REASONS.has(reason) ? `${memberId}:${postId}:${reason}` : null;
}

async function currentUser(client) {
  if (!client) return { error: 'AUTH_REQUIRED' };
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? { error: 'AUTH_REQUIRED' } : { user: data.user };
}

/** Sends one private post report; individual reporter identities never appear in Feed. */
export async function submitPostReport(postId, reason, { client = supabase } = {}) {
  if (!postId || !POST_REPORT_REASONS.has(reason)) return { error: 'VALIDATION_FAILED' };
  const identity = await currentUser(client);
  if (identity.error) return identity;
  // The server derives the reporter and fixes every operational field. A
  // browser can submit a reason, but cannot write or inspect review state.
  const { error } = await client.rpc('submit_post_report', {
    target_post_id: postId,
    input_reason: reason,
  });
  if (!error) return { data: { postId, reason } };
  if (error.code === '23505') return { error: 'ALREADY_REPORTED' };
  return { error: 'UNAVAILABLE' };
}

/** Reads immutable review history only when the server confirms staff access. */
export async function getModerationReportAudit(reportId, { client = supabase } = {}) {
  if (!reportId) return { error: 'VALIDATION_FAILED' };
  const identity = await currentUser(client);
  if (identity.error) return identity;
  const { data, error } = await client.rpc('get_moderation_report_audit', { target_report_id: reportId });
  if (error?.code === '42501') return { error: 'FORBIDDEN' };
  if (error) return { error: 'UNAVAILABLE' };
  return { data: (data ?? []).map((row) => ({
    reportId: row.report_id,
    reason: row.reason,
    status: row.current_status,
    createdAt: row.report_created_at,
    reviewedAt: row.reviewed_at,
    action: row.action ?? null,
    fromStatus: row.from_status ?? null,
    toStatus: row.to_status ?? null,
    actionAt: row.action_at ?? null,
  })) };
}
