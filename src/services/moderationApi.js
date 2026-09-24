import { supabase } from './supabaseClient.js';

const REPORT_STATUSES = new Set(['received', 'triaged', 'resolved', 'dismissed']);
const REVIEW_NEXT_STATUSES = new Set(['triaged', 'resolved', 'dismissed']);

async function requireUser(client) {
  if (!client) return { error: 'AUTH_REQUIRED' };
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? { error: 'AUTH_REQUIRED' } : { user: data.user };
}

function moderationError(error) {
  if (error?.code === '42501') return { error: 'FORBIDDEN' };
  if (error?.code === '22023') return { error: 'INVALID_TRANSITION' };
  if (error?.code === 'P0002') return { error: 'NOT_FOUND' };
  return { error: 'UNAVAILABLE' };
}

function mapReport(report) {
  return {
    id: report.id,
    reporterId: report.reporter_id,
    targetType: report.target_type,
    targetId: report.target_id,
    reason: report.reason,
    detail: report.detail ?? null,
    status: report.status,
    reviewedBy: report.reviewed_by ?? null,
    reviewedAt: report.reviewed_at ?? null,
    createdAt: report.created_at,
  };
}

/** Reads the private moderation queue. The database remains the authority for staff access. */
export async function listModerationReports({ status = null, limit = 50, client = supabase } = {}) {
  if (status !== null && !REPORT_STATUSES.has(status)) return { error: 'VALIDATION_FAILED' };
  const identity = await requireUser(client);
  if (identity.error) return identity;
  const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const { data, error } = await client.rpc('get_moderation_report_queue', {
    status_filter: status,
    page_size: pageSize,
  });
  if (error) return moderationError(error);
  return { data: (data ?? []).map(mapReport) };
}

/** Applies one server-validated report transition and returns the last reviewer metadata. */
export async function reviewModerationReport(reportId, nextStatus, { client = supabase } = {}) {
  if (!reportId || !REVIEW_NEXT_STATUSES.has(nextStatus)) return { error: 'VALIDATION_FAILED' };
  const identity = await requireUser(client);
  if (identity.error) return identity;
  const { data, error } = await client.rpc('review_report', {
    target_report_id: reportId,
    next_status: nextStatus,
  });
  if (error) return moderationError(error);
  const reviewed = Array.isArray(data) ? data[0] : data;
  if (!reviewed) return { error: 'UNAVAILABLE' };
  return {
    data: {
      reportId: reviewed.report_id,
      status: reviewed.report_status,
      reviewedBy: reviewed.report_reviewed_by,
      reviewedAt: reviewed.report_reviewed_at,
    },
  };
}
