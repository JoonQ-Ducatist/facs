import { API_ERROR, apiFailure, apiSuccess } from './mockApi.js';
import { supabase } from './supabaseClient.js';

const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;
const HANDLE_PREFIXES = ['mood', 'daily', 'soft', 'bright', 'calm', 'fresh'];
const HANDLE_WORDS = ['look', 'view', 'style', 'frame', 'vibe', 'note'];
export const HANDLE_CHANGE_COOLDOWN_REASON = 'public_handle_change_cooldown';
export const HANDLE_CHANGE_LOCK_ERROR_CODES = Object.freeze([API_ERROR.RATE_LIMITED]);

/** Public handles are lower-case, non-identifying IDs rather than email addresses. */
export function normalizeHandle(value) {
  return value.trim().toLowerCase().replace(/^@+/, '');
}

export function isConfiguredHandle(handle) {
  return HANDLE_PATTERN.test(handle ?? '') && !handle.startsWith('member_');
}

/** Returns the persisted public handle only; generated placeholders never render as a member ID. */
export function getPublicHandle(profile) {
  const handle = normalizeHandle(profile?.handle ?? '');
  return isConfiguredHandle(handle) ? handle : null;
}

/** The client can submit a syntactically valid handle while availability is unknown; the RPC remains final authority. */
export function canSubmitHandle({ handle, saving = false, checking = false, available = null } = {}) {
  return !saving && !checking && available !== false && isConfiguredHandle(normalizeHandle(handle));
}

/** Adapts the shared API envelope to the ProfileView action contract. */
export function mapHandleSaveResult(result, locale = 'ko') {
  if (result?.error) return { ok: false, message: handleSaveErrorMessage(result.error, locale) };
  if (result?.data?.id && isConfiguredHandle(result.data.handle)) return { ok: true, data: result.data };
  return { ok: false, message: '프로필 저장 결과를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.' };
}

/** Provides a stable UI message for a future server-side one-month handle lock. */
export function handleSaveErrorMessage(error, locale = 'ko') {
  const isCooldown = HANDLE_CHANGE_LOCK_ERROR_CODES.includes(error?.code)
    || error?.fieldErrors?.reason === HANDLE_CHANGE_COOLDOWN_REASON
    || (error?.code === '22023' && error?.message === HANDLE_CHANGE_COOLDOWN_REASON);
  if (isCooldown) {
    return locale === 'en'
      ? 'You can change your public ID again one month after the last change.'
      : '공개 아이디는 변경 후 1개월이 지나야 다시 변경할 수 있어요.';
  }
  return error?.message ?? '아이디를 저장하지 못했어요.';
}

/** Makes stable, non-identifying starter IDs so a new member need not invent one. */
export function getHandleSuggestions(seed = '') {
  const value = [...seed].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 17);
  return Array.from({ length: 3 }, (_, index) => {
    const offset = value + index * 37;
    const prefix = HANDLE_PREFIXES[offset % HANDLE_PREFIXES.length];
    const word = HANDLE_WORDS[Math.floor(offset / HANDLE_PREFIXES.length) % HANDLE_WORDS.length];
    return `${prefix}_${word}_${String((offset % 90) + 10)}`;
  });
}

async function requireUser(client = supabase) {
  if (!client) return { error: apiFailure(API_ERROR.AUTH_REQUIRED, '인증 연결이 설정되지 않았어요.') };
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { error: apiFailure(API_ERROR.AUTH_REQUIRED, '로그인 후 이용할 수 있어요.') };
  return { user: data.user };
}

/** Reads only the authenticated member's own public profile fields. */
export async function getMyProfile({ client = supabase } = {}) {
  const identity = await requireUser(client);
  if (identity.error) return identity.error;
  const { data, error } = await client.from('profiles').select('id,handle,display_name,handle_changed_at').eq('id', identity.user.id).maybeSingle();
  if (error) return apiFailure(API_ERROR.INTERNAL_ERROR, '프로필을 불러오지 못했어요.');
  if (!data) return apiFailure(API_ERROR.NOT_FOUND, '프로필 준비가 끝나지 않았어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
  return apiSuccess(data);
}

/** Checks a requested public handle before saving; the database remains final authority. */
export async function checkHandleAvailability(rawHandle) {
  const handle = normalizeHandle(rawHandle);
  if (!HANDLE_PATTERN.test(handle) || handle.startsWith('member_')) return apiSuccess({ handle, available: false, valid: false });
  const identity = await requireUser();
  if (identity.error) return identity.error;
  const { data, error } = await supabase.from('profiles').select('id').eq('handle', handle).maybeSingle();
  if (error) return apiFailure(API_ERROR.INTERNAL_ERROR, '아이디 확인을 할 수 없어요.');
  return apiSuccess({ handle, available: !data || data.id === identity.user.id, valid: true });
}

/** Finds which friendly generated IDs are still available without disclosing profile data. */
export async function getHandleSuggestionsWithAvailability(seed) {
  const suggestions = getHandleSuggestions(seed);
  const identity = await requireUser();
  if (identity.error) return identity.error;
  const { data, error } = await supabase.from('profiles').select('id,handle').in('handle', suggestions);
  if (error) return apiFailure(API_ERROR.INTERNAL_ERROR, '추천 아이디를 불러오지 못했어요.');
  const occupied = new Set((data ?? []).filter((item) => item.id !== identity.user.id).map((item) => item.handle));
  return apiSuccess(suggestions.map((handle) => ({ handle, available: !occupied.has(handle) })));
}

/** Persists the user's chosen public handle and never stores email in the profile. */
export async function updateMyHandle(rawHandle, { client = supabase } = {}) {
  const handle = normalizeHandle(rawHandle);
  if (!HANDLE_PATTERN.test(handle) || handle.startsWith('member_')) return apiFailure(API_ERROR.VALIDATION_FAILED, '영문 소문자, 숫자, 밑줄로 3~30자 아이디를 입력해 주세요.');
  const identity = await requireUser(client);
  if (identity.error) return identity.error;
  const { data, error } = await client.rpc('set_my_public_handle', { input_handle: handle });
  if (error?.code === '23505') return apiFailure(API_ERROR.VALIDATION_FAILED, '이미 사용 중인 아이디예요. 다른 아이디를 선택해 주세요.');
  if (error?.code === '22023' && error?.message === HANDLE_CHANGE_COOLDOWN_REASON) return apiFailure(API_ERROR.RATE_LIMITED, '공개 아이디는 변경 후 1개월이 지나야 다시 변경할 수 있어요.', { reason: HANDLE_CHANGE_COOLDOWN_REASON });
  if (error?.code === '22023') return apiFailure(API_ERROR.VALIDATION_FAILED, '아이디는 영문 소문자·숫자·밑줄로 3~30자까지 입력해 주세요.');
  if (error?.code === '42501' && error?.message === 'profile_not_ready') return apiFailure(API_ERROR.NOT_FOUND, '프로필 준비가 끝나지 않았어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
  if (error?.code === '42501') return apiFailure(API_ERROR.FORBIDDEN, '현재 계정에서는 아이디를 저장할 수 없어요. 다시 로그인해 주세요.');
  if (error) return apiFailure(API_ERROR.INTERNAL_ERROR, '아이디 저장 중 연결 문제가 발생했어요. 잠시 후 다시 시도해 주세요.');
  if (!data?.id) return apiFailure(API_ERROR.NOT_FOUND, '프로필 준비가 끝나지 않았어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
  // Confirm the write through the same authenticated session that will hydrate
  // after a hard reload. This prevents an optimistic success when a table
  // grant, RLS policy, session, or project reference is misconfigured.
  const persisted = await getMyProfile({ client });
  if (persisted.error) return persisted;
  if (persisted.data.id !== identity.user.id || persisted.data.handle !== handle) {
    return apiFailure(API_ERROR.INTERNAL_ERROR, '아이디 저장 결과를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  return persisted;
}
