import { API_ERROR, apiFailure, apiSuccess } from './mockApi.js';
import { supabase } from './supabaseClient.js';

/** Converts PostgREST errors into the API contract without exposing database internals to the UI. */
export function normalizeSupabaseError(error, fallback = '요청을 처리하지 못했어요.') {
  if (!error) return null;
  if (error.code === '23505') return apiFailure(API_ERROR.ALREADY_VOTED, '이미 의견을 남긴 게시물이에요.');
  if (error.code === '42501') return apiFailure(API_ERROR.FORBIDDEN, '이 작업을 수행할 권한이 없어요.');
  if (error.code === 'PGRST116') return apiFailure(API_ERROR.NOT_FOUND, '게시물을 찾을 수 없어요.');
  return apiFailure(API_ERROR.INTERNAL_ERROR, fallback);
}

/** Returns an authenticated user without ever accepting a caller-supplied user id. */
async function requireUser() {
  if (!supabase) return { error: apiFailure(API_ERROR.AUTH_REQUIRED, '인증 연결이 설정되지 않았어요.') };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: apiFailure(API_ERROR.AUTH_REQUIRED, '로그인 후 이용할 수 있어요.') };
  return { user: data.user };
}

/** Fetches aggregate-only Result data. Raw vote rows are never selected by the browser. */
export async function getSupabaseAggregate(postId) {
  if (!supabase) return apiFailure(API_ERROR.AUTH_REQUIRED, '인증 연결이 설정되지 않았어요.');
  const { data, error } = await supabase.rpc('get_post_aggregate', { target_post_id: postId });
  if (error) return normalizeSupabaseError(error, '결과를 불러오지 못했어요.');
  const aggregate = Array.isArray(data) ? data[0] : data;
  if (!aggregate) return apiFailure(API_ERROR.NOT_FOUND, '게시물을 찾을 수 없어요.');
  const totalVotes = Number(aggregate.total_votes ?? 0);
  return apiSuccess({
    evaluationType: aggregate.evaluation === 'numeric_age' ? 'NUMERIC_AGE' : 'BINARY',
    yesCount: Number(aggregate.yes_count ?? 0),
    noCount: Number(aggregate.no_count ?? 0),
    averageAge: aggregate.average_age === null ? null : Number(aggregate.average_age),
    totalVotes,
    approvalRate: totalVotes ? Math.round((Number(aggregate.yes_count ?? 0) / totalVotes) * 100) : 0,
    sampleStatus: aggregate.sample_status,
  });
}

/** Writes a single immutable vote, then returns the server aggregate. */
export async function submitSupabaseVote({ postId, evaluationType, value }) {
  const identity = await requireUser();
  if (identity.error) return identity.error;
  const isAge = evaluationType === 'NUMERIC_AGE';
  if (isAge && (!Number.isInteger(value) || value < 18 || value > 99)) return apiFailure(API_ERROR.VALIDATION_FAILED, '예상 나이를 확인해 주세요.', { value: 'invalid_age_vote' });
  if (!isAge && value !== 'yes' && value !== 'no') return apiFailure(API_ERROR.VALIDATION_FAILED, 'YES 또는 NO를 선택해 주세요.', { value: 'invalid_vote' });
  const { error } = await supabase.from('votes').insert({
    post_id: postId,
    voter_id: identity.user.id,
    choice: isAge ? null : value,
    perceived_age: isAge ? value : null,
  });
  if (error) return normalizeSupabaseError(error, '의견을 저장하지 못했어요.');
  const aggregate = await getSupabaseAggregate(postId);
  if (aggregate.error) return aggregate;
  return apiSuccess({ vote: { postId, value }, aggregate: aggregate.data });
}

/** Creates a draft post. Publishing, review, and storage attachment remain separate server steps. */
export async function createSupabaseDraft({ category, evaluationType, question, visibility = 'public', commentsAllowed = true, ageMin = null, ageMax = null }) {
  const identity = await requireUser();
  if (identity.error) return identity.error;
  const { data, error } = await supabase.from('posts').insert({
    author_id: identity.user.id,
    category,
    evaluation: evaluationType === 'NUMERIC_AGE' ? 'numeric_age' : 'binary',
    question,
    visibility,
    comments_allowed: commentsAllowed,
    age_min: ageMin,
    age_max: ageMax,
    status: 'draft',
  }).select().single();
  if (error) return normalizeSupabaseError(error, '게시물 초안을 만들지 못했어요.');
  return apiSuccess(data);
}

/**
 * Uploads selected media through a server-created private path, then publishes
 * the post only after every object is present in Storage. The browser never
 * chooses an account-identifying storage path or writes a ready asset state.
 */
export async function createSupabasePublishedPost({ category, evaluationType, question, ageMin = null, ageMax = null, media }) {
  const identity = await requireUser();
  if (identity.error) return identity.error;
  if (!Array.isArray(media) || !media.length) return apiFailure(API_ERROR.VALIDATION_FAILED, '사진 또는 동영상을 선택해 주세요.');
  const inputMedia = media.map((item) => ({
    type: item.type,
    mimeType: item.file?.type,
    byteSize: item.file?.size,
    durationMs: item.type === 'video' ? Math.round(item.duration * 1000) : null,
  }));
  const { data: prepared, error: prepareError } = await supabase.rpc('create_post_upload', {
    input_category: toDatabaseCategory(category),
    input_evaluation: evaluationType === 'NUMERIC_AGE' ? 'numeric_age' : 'binary',
    input_question: question,
    input_age_min: evaluationType === 'NUMERIC_AGE' ? ageMin : null,
    input_age_max: evaluationType === 'NUMERIC_AGE' ? ageMax : null,
    input_media: inputMedia,
  });
  if (prepareError || !prepared?.length) return normalizeSupabaseError(prepareError, '업로드를 준비하지 못했어요.');

  const uploads = [...prepared].sort((a, b) => a.media_position - b.media_position);
  for (const [index, target] of uploads.entries()) {
    const source = media[index]?.file;
    if (!source) return apiFailure(API_ERROR.VALIDATION_FAILED, '선택한 파일 정보를 찾지 못했어요.');
    const { error } = await supabase.storage.from('facs-media').upload(target.storage_path, source, {
      contentType: source.type,
      upsert: false,
    });
    if (error) return normalizeSupabaseError(error, '사진을 안전하게 저장하지 못했어요.');
  }

  const { data: post, error: publishError } = await supabase.rpc('publish_post_upload', { target_post_id: uploads[0].post_id });
  if (publishError || !post) return normalizeSupabaseError(publishError, '게시물을 공개하지 못했어요.');
  const urlResults = await Promise.all(uploads.map(async (target) => {
    const { data, error } = await supabase.storage.from('facs-media').createSignedUrl(target.storage_path, 60 * 60);
    return error ? null : { id: target.asset_id, url: data.signedUrl, storagePath: target.storage_path, type: media[target.media_position]?.type };
  }));
  if (urlResults.some((item) => !item)) return apiFailure(API_ERROR.INTERNAL_ERROR, '업로드는 완료됐지만 사진 주소를 만들지 못했어요.');
  return apiSuccess({ post, media: urlResults });
}

/** Maps UI category IDs to the database enum-compatible category values. */
export function toDatabaseCategory(category) {
  return {
    PerceivedAge: 'perceived_age',
    Outfit: 'outfit',
    SocialProfile: 'profile',
    Date: 'date',
    Fitness: 'fitness',
    Work: 'work',
  }[category] ?? category;
}

/** Maps the reduced deployed post schema without requiring profile, media, or vote-row reads. */
export function mapSupabaseFeedPost(post) {
  return {
    id: post.id,
    authorId: post.author_id,
    category: post.category,
    evaluationType: post.evaluation === 'numeric_age' ? 'NUMERIC_AGE' : 'BINARY',
    question: post.question,
    ageMin: post.age_min,
    ageMax: post.age_max,
    publishedAt: post.published_at,
  };
}

/**
 * Prepares the future server feed while keeping today's mock feed untouched.
 * Empty and unavailable states deliberately return an empty successful page.
 */
export async function listSupabasePublishedPosts({ category, limit = 20, client = supabase } = {}) {
  if (!client) return apiSuccess([], { source: 'unavailable', nextCursor: null });
  const pageSize = Math.min(Math.max(limit, 1), 50);
  let query = client
    .from('posts')
    .select('id,author_id,category,evaluation,question,age_min,age_max,published_at')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('published_at', { ascending: false })
    .limit(pageSize);
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) return apiSuccess([], { source: 'degraded', nextCursor: null });
  return apiSuccess((data ?? []).map(mapSupabaseFeedPost), { source: 'supabase', nextCursor: null });
}
