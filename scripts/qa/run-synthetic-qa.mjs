import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REPORTS_DIR = path.join(ROOT, 'memory-bank/100-qa-bot-results');
const PERSONA_COUNT = 50;
const POST_COUNT = 12;
const PASSWORD = 'SyntheticQaOnly_2026!';
const assetPaths = [
  'assets/generated/selfies/selfie-01.jpg',
  'assets/generated/selfies/selfie-02.jpg',
  'assets/generated/perceived-age/age-pool-01.jpg',
];
const categories = [
  ['perceived_age', 'numeric_age'], ['outfit', 'binary'], ['profile', 'binary'],
  ['date', 'binary'], ['fitness', 'binary'], ['work', 'binary'],
];

function localStatus() {
  const raw = execFileSync('npx', ['supabase', 'status', '--output', 'json'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const status = JSON.parse(raw);
  if (!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(status.API_URL ?? '')) throw new Error('Synthetic QA refuses any non-local Supabase endpoint.');
  if (!status.ANON_KEY || !status.SERVICE_ROLE_KEY) throw new Error('Local Supabase credentials are unavailable. Start Docker first.');
  return status;
}

function makePersonas(runId) {
  return Array.from({ length: PERSONA_COUNT }, (_, index) => {
    const number = String(index + 1).padStart(3, '0');
    const locale = index < 50 ? 'ko' : 'en';
    const gender = index % 2 === 0 ? 'female' : 'male';
    const age = 20 + (index % 30);
    return {
      id: `qa_${runId}_${number}`,
      email: `qa_${runId}_${number}@synthetic.facs.test`,
      handle: `${locale === 'ko' ? 'seoul' : 'global'}_${gender === 'female' ? 'style' : 'look'}_${number}`,
      locale,
      gender,
      age,
      activity: ['quick_viewer', 'careful_rater', 'album_browser', 'saver', 'trend_scanner'][index % 5],
    };
  });
}

function clientFor(status) {
  return createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authenticate(status, persona) {
  const client = clientFor(status);
  const { data, error } = await client.auth.signInWithPassword({ email: persona.email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${persona.id}: ${error.message}`);
  if (!data.user?.id) throw new Error(`sign-in returned no user for ${persona.id}`);
  let profileError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    ({ error: profileError } = await client.from('profiles').update({ handle: persona.handle }).eq('id', data.user.id));
    if (!profileError) break;
    await new Promise((resolve) => setTimeout(resolve, 80 * (attempt + 1)));
  }
  if (profileError) throw new Error(`profile setup failed for ${persona.id}: ${profileError.message}`);
  return { client, userId: data.user.id };
}

async function mapWithConcurrency(items, limit, task) {
  const results = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index], index);
    }
  }));
  return results;
}

async function createPosts(clients) {
  const assets = await Promise.all(assetPaths.map(async (assetPath) => ({
    bytes: await readFile(path.join(ROOT, assetPath)),
    mimeType: 'image/jpeg',
  })));
  const posts = [];
  for (let index = 0; index < POST_COUNT; index += 1) {
    const client = clients[index];
    const [category, evaluation] = categories[index % categories.length];
    const mediaCount = 1 + (index % assets.length);
    const inputMedia = assets.slice(0, mediaCount).map((asset) => ({ type: 'image', mimeType: asset.mimeType, byteSize: asset.bytes.byteLength, durationMs: null }));
    const { data: prepared, error: prepareError } = await client.rpc('create_post_upload', {
      input_category: category,
      input_evaluation: evaluation,
      input_question: evaluation === 'numeric_age' ? 'How old do I look in this test photo?' : 'Does this look feel right for today?',
      input_age_min: evaluation === 'numeric_age' ? 20 : null,
      input_age_max: evaluation === 'numeric_age' ? 49 : null,
      input_media: inputMedia,
    });
    if (prepareError || !prepared?.length) throw new Error(`post preparation failed: ${prepareError?.message ?? 'no media path'}`);
    for (const target of prepared) {
      const asset = assets[target.media_position];
      const { error } = await client.storage.from('facs-media').upload(target.storage_path, asset.bytes, { contentType: asset.mimeType, upsert: false });
      if (error) throw new Error(`media upload failed: ${error.message}`);
    }
    const { data: post, error: publishError } = await client.rpc('publish_post_upload', { target_post_id: prepared[0].post_id });
    if (publishError || !post) throw new Error(`post publish failed: ${publishError?.message ?? 'no post'}`);
    posts.push({ id: post.id, evaluation, authorIndex: index });
  }
  return posts;
}

async function run() {
  const startedAt = new Date();
  const runId = process.env.FACS_QA_RUN_ID ?? startedAt.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const status = localStatus();
  const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const personas = makePersonas(runId);
  const report = { runId, startedAt: startedAt.toISOString(), environment: status.API_URL, counts: { personas: PERSONA_COUNT, posts: 0, votes: 0, scraps: 0, liveEvents: 0 }, failures: [] };

  await mapWithConcurrency(personas, 10, async (persona) => {
    const { error } = await admin.auth.admin.createUser({ email: persona.email, password: PASSWORD, email_confirm: true, user_metadata: { synthetic: true, locale: persona.locale, activity: persona.activity } });
    if (error) report.failures.push({ persona: persona.id, stage: 'create_user', message: error.message });
  });

  const authenticated = await mapWithConcurrency(personas, 10, async (persona) => {
    try { return await authenticate(status, persona); }
    catch (error) { report.failures.push({ persona: persona.id, stage: 'authenticate', message: error.message }); return null; }
  });
  const clients = authenticated.filter(Boolean);
  if (clients.length !== PERSONA_COUNT) throw new Error(`Only ${clients.length}/${PERSONA_COUNT} synthetic sessions are available.`);

  const posts = await createPosts(clients.map(({ client }) => client));
  report.counts.posts = posts.length;
  await mapWithConcurrency(clients, 10, async (session, index) => {
    const target = index < posts.length ? posts[index] : posts[index % posts.length];
    const value = target.evaluation === 'numeric_age' ? { perceived_age: 20 + (index % 30), choice: null } : { perceived_age: null, choice: index % 3 === 0 ? 'no' : 'yes' };
    const { error } = await session.client.from('votes').insert({ post_id: target.id, voter_id: session.userId, ...value });
    if (error) report.failures.push({ persona: personas[index].id, stage: 'vote', message: error.message }); else report.counts.votes += 1;
    if (index < 40) {
      const { error: scrapError } = await session.client.from('scraps').insert({ post_id: posts[(index + 1) % posts.length].id, user_id: session.userId });
      if (scrapError) report.failures.push({ persona: personas[index].id, stage: 'scrap', message: scrapError.message }); else report.counts.scraps += 1;
    }
  });
  const { count: liveEvents } = await admin.from('post_live_reaction_events').select('*', { count: 'exact', head: true }).in('post_id', posts.map((post) => post.id));
  report.counts.liveEvents = liveEvents ?? 0;
  report.finishedAt = new Date().toISOString();
  report.result = report.failures.length ? 'FAIL' : 'PASS';

  await mkdir(REPORTS_DIR, { recursive: true });
  const rows = [
    '# (50) QA bot 테스트 결과', '',
    `- 실행 ID: \`${report.runId}\``, `- 환경: \`${report.environment}\` (로컬 전용)`, `- 결과: **${report.result}**`,
    `- 시작: ${report.startedAt}`, `- 종료: ${report.finishedAt}`, '',
    '| 점검 항목 | 결과 |', '|---|---|',
    `| 테스트 사용자 | ${report.counts.personas}명 |`, `| 실제 로그인 세션 | ${clients.length}개 |`,
    `| 업로드·공개 게시물 | ${report.counts.posts}개 |`, `| 계정당 1회 평가 | ${report.counts.votes}건 |`, `| 스크랩 | ${report.counts.scraps}건 |`, `| 실시간 반응 이벤트 | ${report.counts.liveEvents}건 |`, `| 실패 | ${report.failures.length}건 |`, '',
    '## PM 검토', report.failures.length ? report.failures.map((failure) => `- ${failure.persona}: ${failure.stage} - ${failure.message}`).join('\n') : '- 서버 흐름 실패 없음. 다음 단계에서 로컬 라이브 피드의 시각적 반응을 점검한다.', '',
    '## 데이터 정리', '- 이 실행의 데이터는 로컬 Docker에만 존재하며, 사용자 시각 점검 완료 뒤 별도 승인으로 삭제한다.', '',
  ];
  await writeFile(path.join(REPORTS_DIR, `${report.runId}.md`), rows.join('\n'));
  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
