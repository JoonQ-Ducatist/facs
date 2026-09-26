import { API_ERROR, apiFailure, apiSuccess } from './mockApi.js';
import { formatRelativePublishedTime } from './relativeTime.js';
import { supabase } from './supabaseClient.js';

export const RIGHTS_CONSENT_DOCUMENT_VERSION = 'photo-rights-v1';

/** Returns whether the signed-in member must accept the current rights notice before an upload. */
export async function getMyRightsConsentStatus(client = supabase) {
  if (!client?.rpc) return apiFailure(API_ERROR.AUTH_REQUIRED, '인증 연결이 설정되지 않았어요.');
  const { data, error } = await client.rpc('get_my_rights_consent_status');
  if (error) return normalizeSupabaseError(error, '권리 확인 상태를 불러오지 못했어요.');
  const record = Array.isArray(data) ? data[0] : data;
  return apiSuccess({ required: !record, documentVersion: record?.document_version ?? null, consentedAt: record?.consented_at ?? null });
}

/** Converts PostgREST errors into the API contract without exposing database internals to the UI. */
export function normalizeSupabaseError(error, fallback = '요청을 처리하지 못했어요.') {
  if (!error) return null;
  if (error.code === '23505') return apiFailure(API_ERROR.ALREADY_VOTED, '이미 의견을 남긴 게시물이에요.');
  if (error.code === '22023' && error.message === 'rights consent required') return apiFailure(API_ERROR.VALIDATION_FAILED, '사진 권리 보유 동의가 필요해요.');
  if (error.code === '42501') return apiFailure(API_ERROR.FORBIDDEN, '이 작업을 수행할 권한이 없어요.');
  if (error.code === 'PGRST116') return apiFailure(API_ERROR.NOT_FOUND, '게시물을 찾을 수 없어요.');
  if (error.code === 'PGRST202' || error.code === '42883') return apiFailure(API_ERROR.INTERNAL_ERROR, '업로드 기능이 아직 활성화되지 않았어요. 잠시 후 다시 시도해 주세요.');
  return apiFailure(API_ERROR.INTERNAL_ERROR, fallback);
}

/** Preserves the actual selected format when a mobile file provider omits MIME metadata. */
export function resolveUploadMimeType(file, mediaType) {
  const supplied = String(file?.type ?? '').trim().toLowerCase();
  if (supplied) return supplied;
  const extension = String(file?.name ?? '').trim().toLowerCase().split('.').pop();
  const byExtension = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
    heic: 'image/heic', heif: 'image/heif', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', quicktime: 'video/quicktime',
  };
  return byExtension[extension] ?? (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
}

/** Returns an authenticated user without ever accepting a caller-supplied user id. */
async function requireUser(client = supabase) {
  if (!client) return { error: apiFailure(API_ERROR.AUTH_REQUIRED, '인증 연결이 설정되지 않았어요.') };
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { error: apiFailure(API_ERROR.AUTH_REQUIRED, '로그인 후 이용할 수 있어요.') };
  return { user: data.user };
}

/** Fetches aggregate-only Result data. Raw vote rows are never selected by the browser. */
export async function getSupabaseAggregate(postId, client = supabase) {
  if (!client) return apiFailure(API_ERROR.AUTH_REQUIRED, '인증 연결이 설정되지 않았어요.');
  const { data, error } = await client.rpc('get_post_aggregate', { target_post_id: postId });
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

/** Retrieves aggregate-only results for one feed page with a single RPC call. */
export async function getSupabaseFeedAggregates(postIds, client = supabase) {
  const ids = [...new Set((postIds ?? []).filter(Boolean))];
  if (!ids.length || !client) return apiSuccess(new Map());
  const { data, error } = await client.rpc('get_published_post_aggregates', { target_post_ids: ids });
  if (error) return normalizeSupabaseError(error, '피드 결과를 불러오지 못했어요.');
  return apiSuccess(new Map((data ?? []).map((aggregate) => [aggregate.post_id, {
    yesCount: Number(aggregate.yes_count ?? 0),
    noCount: Number(aggregate.no_count ?? 0),
    averageAge: aggregate.average_age === null ? null : Number(aggregate.average_age),
    totalVotes: Number(aggregate.total_votes ?? 0),
    sampleStatus: aggregate.sample_status,
  }])));
}

/**
 * Reads only the current member's completed post IDs for the feed page. The
 * browser never receives another member's vote, identity, or vote value.
 */
export async function getSupabaseMyVotedPostIds(postIds, client = supabase) {
  const ids = [...new Set((postIds ?? []).filter(Boolean))];
  if (!ids.length || !client) return apiSuccess(new Set());
  const { data, error } = await client.rpc('get_my_voted_post_ids', { target_post_ids: ids });
  if (error) return normalizeSupabaseError(error, '내 평가 상태를 불러오지 못했어요.');
  return apiSuccess(new Set((data ?? []).map((vote) => vote.post_id).filter(Boolean)));
}

/**
 * Requests the server-side exposure Boost for the signed-in member's post.
 * Payment capture is intentionally not part of this call; the migration only
 * validates the one-hour/zero-rating eligibility boundary and creates the
 * exposure request consumed by the personalized feed RPC.
 */
export async function requestSupabasePostBoost(postId, client = supabase) {
  const identity = await requireUser(client);
  if (identity.error) return identity.error;
  if (!postId) return apiFailure(API_ERROR.VALIDATION_FAILED, 'Boost할 게시물을 찾을 수 없어요.');
  let { data, error } = await client.rpc('request_post_boost', { target_post_id: postId });
  // A newly deployed Supabase function can briefly be absent from PostgREST's
  // schema cache even though the database function is ready. That response
  // cannot have created a Boost, so one short retry is safe.
  if (error?.code === 'PGRST202') {
    await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
    ({ data, error } = await client.rpc('request_post_boost', { target_post_id: postId }));
  }
  if (error) {
    if (error.code === '23505') return apiFailure(API_ERROR.ALREADY_VOTED, '이 게시물은 이미 Boost가 요청됐어요.');
    if (error.code === '22023') return apiFailure(API_ERROR.VALIDATION_FAILED, '현재는 이 게시물을 Boost할 수 없어요.');
    if (error.code === '42501') return apiFailure(API_ERROR.FORBIDDEN, '이 게시물을 Boost할 권한이 없어요.');
    if (error.code === 'PGRST202' || error.code === '42883') return apiFailure(API_ERROR.INTERNAL_ERROR, 'Boost 기능을 준비하고 있어요. 잠시 후 다시 시도해 주세요.');
    return apiFailure(API_ERROR.INTERNAL_ERROR, 'Boost 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  const request = Array.isArray(data) ? data[0] : data;
  return request ? apiSuccess(request) : apiFailure(API_ERROR.INTERNAL_ERROR, 'Boost 요청 결과를 확인하지 못했어요.');
}

/** Reads only the current member's server-validated Boost candidates. */
export async function listSupabaseBoostCandidates({ limit = 20, client = supabase } = {}) {
  const identity = await requireUser(client);
  if (identity.error) return identity.error;
  const pageSize = Math.min(Math.max(limit, 1), 50);
  let { data, error } = await client.rpc('get_my_boost_candidates', { page_size: pageSize });
  // Keep reload recovery consistent with the request path. PostgREST can
  // briefly miss a just-deployed RPC from its schema cache; an empty list
  // would otherwise incorrectly remove a valid Boost CTA after refresh.
  if (error?.code === 'PGRST202') {
    await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
    ({ data, error } = await client.rpc('get_my_boost_candidates', { page_size: pageSize }));
  }
  // Do not turn a temporary RPC failure into an empty successful response.
  // The caller retains its still-valid local recovery state until the server
  // can answer authoritatively on the next refresh.
  if (error) return apiFailure(API_ERROR.INTERNAL_ERROR, 'Boost 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
  return apiSuccess((data ?? []).filter((candidate) => candidate?.post_id).map((candidate) => ({
    postId: candidate.post_id,
    category: fromDatabaseCategory(candidate.category),
    publishedAt: candidate.published_at,
    otherVoteCount: Number(candidate.other_vote_count ?? 0),
    targetVotes: Number(candidate.target_votes ?? 100),
  })), { source: 'supabase' });
}

/** Writes a single immutable vote, then returns the server aggregate. */
export async function submitSupabaseVote({ postId, evaluationType, value, client = supabase }) {
  const identity = await requireUser(client);
  if (identity.error) return identity.error;
  const isAge = evaluationType === 'NUMERIC_AGE';
  if (isAge && (!Number.isInteger(value) || value < 18 || value > 99)) return apiFailure(API_ERROR.VALIDATION_FAILED, '예상 나이를 확인해 주세요.', { value: 'invalid_age_vote' });
  if (!isAge && value !== 'yes' && value !== 'no') return apiFailure(API_ERROR.VALIDATION_FAILED, 'YES 또는 NO를 선택해 주세요.', { value: 'invalid_vote' });
  const { error } = await client.from('votes').insert({
    post_id: postId,
    voter_id: identity.user.id,
    choice: isAge ? null : value,
    perceived_age: isAge ? value : null,
  });
  if (error) return normalizeSupabaseError(error, '의견을 저장하지 못했어요.');
  const aggregate = await getSupabaseAggregate(postId, client);
  // The immutable vote is already stored at this point. A temporary aggregate
  // read failure must not make the UI offer a duplicate submission.
  if (aggregate.error) return apiSuccess({ vote: { postId, value }, aggregate: null, aggregatePending: true });
  return apiSuccess({ vote: { postId, value }, aggregate: aggregate.data, aggregatePending: false });
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
export async function createSupabasePublishedPost({ category, evaluationType, question, visibility = 'public', ageMin = null, ageMax = null, media, rightsConsent, client = supabase }) {
  const identity = await requireUser(client);
  if (identity.error) return identity.error;
  const submitsCurrentRightsConsent = rightsConsent?.confirmed === true && rightsConsent.documentVersion === RIGHTS_CONSENT_DOCUMENT_VERSION;
  if (rightsConsent && !submitsCurrentRightsConsent) {
    return apiFailure(API_ERROR.VALIDATION_FAILED, '사진 권리 보유 동의가 필요해요.');
  }
  if (!Array.isArray(media) || !media.length) return apiFailure(API_ERROR.VALIDATION_FAILED, '사진 또는 동영상을 선택해 주세요.');
  const inputMedia = media.map((item) => ({
    type: item.type,
    mimeType: resolveUploadMimeType(item.file, item.type),
    byteSize: item.file?.size,
    durationMs: item.type === 'video' ? Math.round(item.duration * 1000) : null,
  }));
  const { data: prepared, error: prepareError } = await client.rpc('create_post_upload_with_visibility', {
    input_category: toDatabaseCategory(category),
    input_evaluation: evaluationType === 'NUMERIC_AGE' ? 'numeric_age' : 'binary',
    input_question: question,
    input_age_min: evaluationType === 'NUMERIC_AGE' ? ageMin : null,
    input_age_max: evaluationType === 'NUMERIC_AGE' ? ageMax : null,
    input_media: inputMedia,
    input_visibility: visibility,
    input_rights_confirmed: submitsCurrentRightsConsent,
    input_rights_document_version: submitsCurrentRightsConsent ? rightsConsent.documentVersion : null,
  });
  if (prepareError || !prepared?.length) return normalizeSupabaseError(prepareError, '업로드를 준비하지 못했어요.');

  const uploads = [...prepared].sort((a, b) => a.media_position - b.media_position);
  for (const [index, target] of uploads.entries()) {
    const source = media[index]?.file;
    if (!source) return apiFailure(API_ERROR.VALIDATION_FAILED, '선택한 파일 정보를 찾지 못했어요.');
    const { error } = await client.storage.from('facs-media').upload(target.storage_path, source, {
      contentType: resolveUploadMimeType(source, media[index]?.type),
      upsert: false,
    });
    if (error) return normalizeSupabaseError(error, '사진을 안전하게 저장하지 못했어요.');
  }

  const { data: post, error: publishError } = await client.rpc('publish_post_upload', { target_post_id: uploads[0].post_id });
  if (publishError || !post) return normalizeSupabaseError(publishError, '게시물을 공개하지 못했어요.');
  const urlResults = await Promise.all(uploads.map(async (target) => {
    const { data, error } = await client.storage.from('facs-media').createSignedUrl(target.storage_path, 60 * 60);
    return error ? null : { id: target.asset_id, url: data.signedUrl, storagePath: target.storage_path, type: media[target.media_position]?.type };
  }));
  if (urlResults.some((item) => !item)) return apiFailure(API_ERROR.INTERNAL_ERROR, '업로드는 완료됐지만 사진 주소를 만들지 못했어요.');
  return apiSuccess({ post, media: urlResults });
}

/** Hides only the signed-in member's post while retaining its protected records. */
export async function hideMySupabasePost(postId) {
  const identity = await requireUser();
  if (identity.error) return identity.error;
  const { data, error } = await supabase.rpc('hide_my_post', { target_post_id: postId });
  if (error || !data) return normalizeSupabaseError(error, '게시물을 숨기지 못했어요. 잠시 후 다시 시도해 주세요.');
  return apiSuccess({ id: postId });
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

/** Maps persisted category values back to the product's presentation category IDs. */
export function fromDatabaseCategory(category) {
  return {
    perceived_age: 'PerceivedAge',
    outfit: 'Outfit',
    profile: 'SocialProfile',
    date: 'Date',
    fitness: 'Fitness',
    work: 'Work',
  }[category] ?? category;
}

/**
 * Reads only published post data, public handles, and media that RLS has made
 * visible. Signed URLs stay short-lived and are recreated whenever the feed
 * is refreshed.
 */
export async function listSupabasePublishedFeedCards({ limit = 20, client = supabase } = {}) {
  if (!client) return apiSuccess([], { source: 'unavailable' });
  if (typeof client.rpc !== 'function') return apiSuccess([], { source: 'degraded' });
  const pageSize = Math.min(Math.max(limit, 1), 50);
  const { data: orderedPosts, error: orderError } = await client.rpc('get_personalized_feed_post_ids', { page_size: pageSize, category_filter: null });
  if (orderError) return feedReadFailure('feed-order');
  return listSupabaseCardsInServerOrder(orderedPosts, { client, source: 'supabase' });
}

function feedReadFailure(source) {
  const result = apiFailure(API_ERROR.INTERNAL_ERROR, '피드를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
  return { ...result, meta: { ...result.meta, source } };
}

/**
 * Reads the anonymous login hero's intentionally small public-photo contract.
 * This must never reuse the signed-in member's personalized feed RPC.
 */
export async function listSupabaseAuthFeaturedPhotos({ limit = 5, candidatePoolSize = 20, client = supabase } = {}) {
  if (!client) return apiSuccess([], { source: 'unavailable' });
  if (typeof client.rpc !== 'function' || !client.storage?.from) return apiSuccess([], { source: 'degraded' });
  const pageSize = Math.min(Math.max(limit, 1), 10);
  const poolSize = Math.min(Math.max(candidatePoolSize, pageSize), 30);
  const { data, error } = await client.rpc('get_auth_featured_public_photos', {
    page_size: pageSize,
    candidate_pool_size: poolSize,
  });
  if (error) return apiSuccess([], { source: 'degraded' });

  const featured = await Promise.all((data ?? []).map(async (item) => {
    if (!item?.post_id || !item?.storage_path) return null;
    const { data: signed, error: signedError } = await client.storage
      .from('facs-media')
      .createSignedUrl(item.storage_path, 60 * 10);
    if (signedError || !signed?.signedUrl) return null;
    return {
      id: item.post_id,
      imageUrl: signed.signedUrl,
      participationCount: Number(item.participation_count ?? 0),
    };
  }));
  return apiSuccess(featured.filter(Boolean), { source: 'supabase-auth-featured' });
}

/** Converts an already-authorized ordered ID RPC response into protected Feed cards. */
async function listSupabaseCardsInServerOrder(orderedPosts, { client, source = 'supabase', isMyUpload = false } = {}) {
  const postIds = (orderedPosts ?? []).map((item) => item.post_id).filter(Boolean);
  if (!postIds.length) return apiSuccess([], { source });
  const { data, error } = await client
    .from('posts')
    .select('id,author_id,category,evaluation,question,age_min,age_max,published_at,profiles!posts_author_id_fkey(handle),post_media(position,media_assets(id,storage_path,media_type))')
    .eq('status', 'published')
    .in('id', postIds);
  if (error) return feedReadFailure('feed-posts');

  const aggregateResult = await getSupabaseFeedAggregates((data ?? []).map((post) => post.id), client);
  // A temporary aggregate failure must not hide otherwise readable feed cards.
  const aggregates = aggregateResult.error ? new Map() : aggregateResult.data;

  const orderById = new Map(postIds.map((id, index) => [id, index]));
  const sourceById = new Map((orderedPosts ?? []).map((item) => [item.post_id, item.source]));
  const orderedData = [...(data ?? [])].sort((left, right) => (orderById.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (orderById.get(right.id) ?? Number.MAX_SAFE_INTEGER));
  const cards = await Promise.all(orderedData.map(async (post) => {
    const assets = (post.post_media ?? [])
      .sort((left, right) => left.position - right.position)
      .map((link) => link.media_assets)
      .filter(Boolean);
    if (!assets.length) return null;
    const signedMedia = await Promise.all(assets.map(async (asset) => {
      const { data: signed, error: signedError } = await client.storage.from('facs-media').createSignedUrl(asset.storage_path, 60 * 60);
      return signedError || !signed?.signedUrl
        ? { failed: true }
        : { id: asset.id, type: asset.media_type, url: signed.signedUrl, storagePath: asset.storage_path, objectPosition: 'center 20%' };
    }));
    if (signedMedia.some((item) => item?.failed)) return { failed: true };
    const media = signedMedia;
    const evaluationType = post.evaluation === 'numeric_age' ? 'NUMERIC_AGE' : 'BINARY';
    const aggregate = aggregates.get(post.id);
    return {
      id: post.id,
      authorId: post.author_id,
      author: post.profiles?.handle ?? 'member',
      category: fromDatabaseCategory(post.category),
      evaluationType,
      question: post.question,
      subtext: evaluationType === 'NUMERIC_AGE' ? '참여자의 주관적인 평가를 모으고 있어요.' : '실시간 평가를 수집 중입니다',
      imageUrl: media[0].url,
      mediaType: media[0].type,
      media,
      objectPosition: 'center 20%',
      yesVotes: aggregate?.yesCount ?? 0,
      noVotes: aggregate?.noCount ?? 0,
      ageMin: post.age_min,
      ageMax: post.age_max,
      ageEstimate: aggregate?.averageAge ?? 0,
      ageVoteCount: aggregate?.totalVotes ?? 0,
      timestamp: formatRelativePublishedTime(post.published_at) ?? '방금 전',
      publishedAt: post.published_at,
      feedSource: sourceById.get(post.id) ?? 'discovery',
      isMyUpload,
      commentsAllowed: true,
      comments: [],
    };
  }));
  if (cards.some((card) => card?.failed)) return feedReadFailure('feed-media');
  return apiSuccess(cards.filter(Boolean), { source });
}

/** Reads every server-authorized profile post in stable newest-first order, independent of the Feed page limit. */
export async function listSupabaseMyPublishedProfileCards({ limit = 100, client = supabase } = {}) {
  const identity = await requireUser(client);
  if (identity.error) return identity.error;
  const pageSize = Math.min(Math.max(limit, 1), 100);
  const { data, error } = await client.rpc('get_my_published_profile_post_ids', { page_size: pageSize });
  if (!error) return listSupabaseCardsInServerOrder(data, { client, source: 'supabase-profile', isMyUpload: true });

  // Keep the profile library usable while the owner-scoped RPC migration is
  // rolling out. RLS plus the explicit author filter preserve the same scope.
  const { data: ownedPosts, error: fallbackError } = await client
    .from('posts')
    .select('id,published_at')
    .eq('author_id', identity.user.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(pageSize);
  if (fallbackError) return apiFailure(API_ERROR.INTERNAL_ERROR, '내 업로드를 불러오지 못했어요.');
  return listSupabaseCardsInServerOrder((ownedPosts ?? []).map((post) => ({ post_id: post.id, published_at: post.published_at })), { client, source: 'supabase-profile-fallback', isMyUpload: true });
}

/** Reads the current member's still-accessible Scraps in saved-time order for a Feed-detail popup. */
export async function listSupabaseMyScrapFeedCards({ limit = 100, client = supabase } = {}) {
  const identity = await requireUser(client);
  if (identity.error) return identity.error;
  const pageSize = Math.min(Math.max(limit, 1), 100);
  const { data, error } = await client.rpc('get_my_scrap_post_ids', { page_size: pageSize });
  if (error) return apiFailure(API_ERROR.INTERNAL_ERROR, '스크랩을 불러오지 못했어요.');
  const cards = await listSupabaseCardsInServerOrder(data, { client, source: 'supabase-scraps' });
  if (cards.error) return cards;
  const savedAtById = new Map((data ?? []).map((item) => [item.post_id, item.saved_at]));
  return apiSuccess(cards.data.map((card) => ({ ...card, savedAt: savedAtById.get(card.id) ?? null })), cards.meta);
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
  if (typeof client.rpc !== 'function') return apiSuccess([], { source: 'degraded', nextCursor: null });
  const pageSize = Math.min(Math.max(limit, 1), 50);
  const { data: orderedPosts, error: orderError } = await client.rpc('get_personalized_feed_post_ids', { page_size: pageSize, category_filter: category ?? null });
  if (orderError) return apiSuccess([], { source: 'degraded', nextCursor: null });
  const postIds = (orderedPosts ?? []).map((item) => item.post_id).filter(Boolean);
  if (!postIds.length) return apiSuccess([], { source: 'supabase', nextCursor: null });
  let query = client
    .from('posts')
    .select('id,author_id,category,evaluation,question,age_min,age_max,published_at')
    .eq('status', 'published')
    .in('id', postIds);
  const { data, error } = await query;
  if (error) return apiSuccess([], { source: 'degraded', nextCursor: null });
  const orderById = new Map(postIds.map((id, index) => [id, index]));
  return apiSuccess([...(data ?? [])]
    .sort((left, right) => (orderById.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (orderById.get(right.id) ?? Number.MAX_SAFE_INTEGER))
    .map(mapSupabaseFeedPost), { source: 'supabase', nextCursor: null });
}
