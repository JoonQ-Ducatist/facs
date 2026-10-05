import { API_ERROR, apiFailure, apiSuccess } from './mockApi.js';
import { supabase } from './supabaseClient.js';

export const PUBLIC_HANDLE_MAX_LENGTH = 12;
const HANDLE_PATTERN = new RegExp(`^[a-z0-9_]{3,${PUBLIC_HANDLE_MAX_LENGTH}}$`);
const LEGACY_DISPLAY_HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;
const HANDLE_PREFIXES = ['mood', 'daily', 'soft', 'bright', 'calm', 'fresh'];
const HANDLE_WORDS = ['look', 'view', 'style', 'frame', 'vibe', 'note'];
// Keep browser read-back compatible with the original profile schema. The
// server-only handle cooldown column is not rendered by the client, and an
// older deployed database must not turn a successful handle save into a
// generic profile-read failure merely because that optional column is absent.
const PROFILE_READ_COLUMNS = 'id,handle,display_name,role,bio,avatar_path';
const PROFILE_READ_COLUMNS_WITHOUT_BIO = 'id,handle,display_name,role,avatar_path';
export const PROFILE_BIO_MAX_LENGTH = 160;
const PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
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
  return LEGACY_DISPLAY_HANDLE_PATTERN.test(handle) && !handle.startsWith('member_') ? handle : null;
}

/** The client can submit a syntactically valid handle while availability is unknown; the RPC remains final authority. */
export function canSubmitHandle({ handle, saving = false, checking = false, available = null } = {}) {
  return !saving && !checking && available !== false && isConfiguredHandle(normalizeHandle(handle));
}

/** Public profile wording is plain text only and deliberately has no HTML path. */
export function normalizeProfileBio(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, PROFILE_BIO_MAX_LENGTH);
}

function profileAvatarExtension(file) {
  return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[file?.type] ?? null;
}

export function validateProfileAvatar(file) {
  if (!file) return null;
  if (!PROFILE_AVATAR_TYPES.has(file.type)) return 'JPG, PNG 또는 WebP 이미지만 사용할 수 있어요.';
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > PROFILE_AVATAR_MAX_BYTES) return '프로필 사진은 5MB 이하로 선택해 주세요.';
  return null;
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
    return `${prefix.slice(0, 4)}_${word.slice(0, 4)}_${String((offset % 90) + 10)}`;
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
  let { data, error } = await client.from('profiles').select(PROFILE_READ_COLUMNS).eq('id', identity.user.id).maybeSingle();
  if ((error?.code === '42703' || error?.code === 'PGRST204') && /\bbio\b/i.test(error.message ?? '')) {
    ({ data, error } = await client.from('profiles').select(PROFILE_READ_COLUMNS_WITHOUT_BIO).eq('id', identity.user.id).maybeSingle());
  }
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
  if (!HANDLE_PATTERN.test(handle) || handle.startsWith('member_')) return apiFailure(API_ERROR.VALIDATION_FAILED, '영문 소문자, 숫자, 밑줄로 3~12자 아이디를 입력해 주세요.');
  const identity = await requireUser(client);
  if (identity.error) return identity.error;
  const { data, error } = await client.rpc('set_my_public_handle', { input_handle: handle });
  if (error?.code === '23505') return apiFailure(API_ERROR.VALIDATION_FAILED, '이미 사용 중인 아이디예요. 다른 아이디를 선택해 주세요.');
  if (error?.code === '22023' && error?.message === HANDLE_CHANGE_COOLDOWN_REASON) return apiFailure(API_ERROR.RATE_LIMITED, '공개 아이디는 변경 후 1개월이 지나야 다시 변경할 수 있어요.', { reason: HANDLE_CHANGE_COOLDOWN_REASON });
  if (error?.code === '22023') return apiFailure(API_ERROR.VALIDATION_FAILED, '아이디는 영문 소문자·숫자·밑줄로 3~12자까지 입력해 주세요.');
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

/** Saves the current member's optional profile bio and selected avatar path. */
export async function updateMyProfilePresentation({ bio, avatarPath }, { client = supabase } = {}) {
  const identity = await requireUser(client);
  if (identity.error) return identity.error;
  const normalizedBio = normalizeProfileBio(bio);
  if (String(bio ?? '').trim().length > PROFILE_BIO_MAX_LENGTH) return apiFailure(API_ERROR.VALIDATION_FAILED, '소개는 160자 이내로 입력해 주세요.');
  const { data, error } = await client.rpc('set_my_profile_presentation', {
    input_bio: normalizedBio,
    input_avatar_path: avatarPath || null,
  });
  if (error?.code === '22023') return apiFailure(API_ERROR.VALIDATION_FAILED, '프로필 정보를 확인해 주세요.');
  if (error?.code === '42501') return apiFailure(API_ERROR.FORBIDDEN, '현재 계정에서는 프로필을 저장할 수 없어요. 다시 로그인해 주세요.');
  if (error) return apiFailure(API_ERROR.INTERNAL_ERROR, '프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
  return data?.id ? apiSuccess(data) : apiFailure(API_ERROR.INTERNAL_ERROR, '프로필 저장 결과를 확인하지 못했어요.');
}

/** Uploads only a validated image into the signed-in member's opaque folder. */
export async function uploadMyProfileAvatar(file, { client = supabase } = {}) {
  const validationError = validateProfileAvatar(file);
  if (validationError) return apiFailure(API_ERROR.VALIDATION_FAILED, validationError);
  const identity = await requireUser(client);
  if (identity.error) return identity.error;
  const extension = profileAvatarExtension(file);
  const token = globalThis.crypto?.randomUUID?.().replace(/-/g, '') ?? `${Date.now()}`;
  const path = `${identity.user.id}/${token}.${extension}`;
  const { error } = await client.storage.from('profile-assets').upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: false });
  if (error) return apiFailure(API_ERROR.INTERNAL_ERROR, '프로필 사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.');
  return apiSuccess({ path, url: client.storage.from('profile-assets').getPublicUrl(path).data.publicUrl });
}

export function getProfileAvatarUrl(path, { client = supabase } = {}) {
  if (!path || !client?.storage) return null;
  return client.storage.from('profile-assets').getPublicUrl(path).data.publicUrl;
}
