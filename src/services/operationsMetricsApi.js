import { apiFailure, apiSuccess, API_ERROR } from './mockApi.js';
import { supabase } from './supabaseClient.js';

/** Reads aggregate-only operations values; rows belonging to members never reach the browser. */
export async function getOperationalMetrics(windowHours, client = supabase) {
  if (!client?.rpc) return apiFailure(API_ERROR.AUTH_REQUIRED, '인증 연결이 설정되지 않았어요.');
  const { data, error } = await client.rpc('get_mvp_operational_metrics', { window_hours: windowHours });
  if (error?.code === '42501') return apiFailure(API_ERROR.FORBIDDEN, '관리자 권한이 필요해요.');
  if (error) return apiFailure(API_ERROR.INTERNAL_ERROR, '운영 지표를 불러오지 못했어요.');
  const metrics = Array.isArray(data) ? data[0] : data;
  return metrics ? apiSuccess(metrics) : apiFailure(API_ERROR.NOT_FOUND, '운영 지표가 아직 준비되지 않았어요.');
}
