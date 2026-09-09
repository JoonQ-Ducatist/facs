import { API_ERROR, apiFailure, apiSuccess } from './mockApi.js';
import { supabase } from './supabaseClient.js';

const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;

/** Public handles are lower-case, non-identifying IDs rather than email addresses. */
export function normalizeHandle(value) {
  return value.trim().toLowerCase().replace(/^@+/, '');
}

export function isConfiguredHandle(handle) {
  return HANDLE_PATTERN.test(handle ?? '') && !handle.startsWith('member_');
}

async function requireUser() {
  if (!supabase) return { error: apiFailure(API_ERROR.AUTH_REQUIRED, '인증 연결이 설정되지 않았어요.') };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: apiFailure(API_ERROR.AUTH_REQUIRED, '로그인 후 이용할 수 있어요.') };
  return { user: data.user };
}

/** Reads only the authenticated member's own public profile fields. */
export async function getMyProfile() {
  const identity = await requireUser();
  if (identity.error) return identity.error;
  const { data, error } = await supabase.from('profiles').select('id,handle,display_name').eq('id', identity.user.id).maybeSingle();
  if (error) return apiFailure(API_ERROR.INTERNAL_ERROR, '프로필을 불러오지 못했어요.');
  return apiSuccess(data);
}

/** Persists the user's chosen public handle and never stores email in the profile. */
export async function updateMyHandle(rawHandle) {
  const handle = normalizeHandle(rawHandle);
  if (!HANDLE_PATTERN.test(handle) || handle.startsWith('member_')) return apiFailure(API_ERROR.VALIDATION_FAILED, '영문 소문자, 숫자, 밑줄로 3~30자 아이디를 입력해 주세요.');
  const identity = await requireUser();
  if (identity.error) return identity.error;
  const { data, error } = await supabase.from('profiles').update({ handle }).eq('id', identity.user.id).select('id,handle,display_name').single();
  if (error?.code === '23505') return apiFailure(API_ERROR.VALIDATION_FAILED, '이미 사용 중인 아이디예요.');
  if (error) return apiFailure(API_ERROR.INTERNAL_ERROR, '아이디를 저장하지 못했어요.');
  return apiSuccess(data);
}
