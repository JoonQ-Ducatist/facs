#!/usr/bin/env node
/** Run report-only QA against an isolated copy of selected non-secret source files. */
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { values: v } = parseArgs({ options: {
  url: { type: 'string' }, task: { type: 'string' }, mode: { type: 'string', default: 'mock' },
  output: { type: 'string' }, 'brief-file': { type: 'string' },
  scope: { type: 'string', default: 'changed' }, 'prepare-only': { type: 'boolean' }, help: { type: 'boolean' },
} });
if (v.help) {
  console.log('node scripts/qa/antigravity.mjs --url URL --task FACS-ID --mode public|mock|staging [--scope changed|all] [--prepare-only] [--brief-file PATH] [--output NEW_DIRECTORY]');
  process.exit(0);
}
if (!v.url || !/^[A-Za-z0-9_-]+$/.test(v.task ?? '') || !['public', 'mock', 'staging'].includes(v.mode)) throw new Error('Supply a URL, alphanumeric task ID, and public/mock/staging mode.');
if (!['changed', 'all'].includes(v.scope)) throw new Error('Scope must be changed or all.');
if (v.mode === 'public' && v['brief-file']) throw new Error('Public mode does not accept local documents.');
const url = new URL(v.url);
if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use HTTP(S) without URL credentials.');
if (v.mode === 'mock' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Mock mode requires localhost.');
if (['token', 'access_token', 'refresh_token', 'code'].some(key => url.searchParams.has(key)) || url.hash.includes('token=')) throw new Error('Do not pass login tokens.');
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
const isSafeQaFile = (path) => /^(src\/.*\.(jsx?|css)|memory-bank\/.*\.md|index\.html|package\.json|vite\.config\.js)$/.test(path);
const lines = (value) => value ? value.split('\n').filter(Boolean) : [];
const changedFiles = () => {
  try {
    const mergeBase = git('merge-base', 'HEAD', 'origin/main');
    return lines(git('diff', '--name-only', `${mergeBase}..HEAD`));
  } catch { return []; }
};
const selected = () => {
  const tracked = git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean);
  const working = [...lines(git('diff', '--name-only')), ...lines(git('diff', '--name-only', '--cached'))];
  const candidates = v.scope === 'all' ? tracked : [...changedFiles(), ...working];
  const scoped = [...new Set(candidates)].filter(isSafeQaFile).sort();
  return scoped.length || v.scope === 'all' ? scoped : tracked.filter(isSafeQaFile).sort();
};
function capture() {
  if (v.mode === 'public') return { files: new Map(), hash: null, commit: null, dirty: null };
  const files = new Map(); const hash = createHash('sha256');
  for (const p of selected()) {
    try { const bytes = readFileSync(join(repo, p)); files.set(p, bytes); hash.update(p).update('\0').update(bytes).update('\0'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return { files, hash: hash.digest('hex'), commit: git('rev-parse', 'HEAD'), dirty: git('status', '--porcelain') };
}
const qaRoot = '/private/tmp/facs-qa';
mkdirSync(qaRoot, { recursive: true });
const output = v.output ? resolve(v.output) : mkdtempSync(join(qaRoot, 'run-'));
if (output === repo || output.startsWith(repo + '/')) throw new Error('Store reports outside the source repository.');
if (v.output) mkdirSync(output);
const workspace = join(output, 'workspace'); mkdirSync(workspace);
const baseline = capture();
for (const [p, bytes] of baseline.files) { mkdirSync(dirname(join(workspace, p)), { recursive: true }); writeFileSync(join(workspace, p), bytes); }
const save = (p, data) => writeFileSync(join(output, p), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
save('manifest.json', { taskId: v.task, url: url.href, mode: v.mode, scope: v.scope, createdAt: new Date().toISOString(), commit: baseline.commit, sourceHash: baseline.hash, dirty: baseline.dirty, copiedFiles: [...baseline.files.keys()], note: v.mode === 'public' ? 'Public browser only. No local source or contracts copied or read. No commit attestation.' : 'Changed-file source snapshot, not a production build. Preview/version equivalence must be independently checked.' });
const brief = v['brief-file'] ? readFileSync(resolve(v['brief-file']), 'utf8') : 'Review only the supplied changed files and the supplied URL. Check the primary changed user flow, one failure path, and the relevant responsive state. Record unavailable checks as UNTESTED; do not invent coverage.';
const prompt = v.mode === 'public'
  ? `You are FACS public browser QA. Task ${v.task}. Inspect only ${url.href}; do not read files, authenticate, send data, upload, vote, comment, or change remote state. Check first render, the visible primary navigation, and one language control at desktop 1440x900 and mobile 390x844. Use browser evidence only. List every inaccessible authenticated flow as UNTESTED. If navigation is blocked, return BLOCKED. Return concise Korean JSON only.`
  : `You are FACt.Smack report-only QA. Task ${v.task}. Review only the frozen changed-file snapshot in this workspace and the supplied URL ${url.href}. Do not read outside this workspace, call shell tools, edit files, authenticate, upload, or change remote data. Check one primary flow, one failure path, and the relevant viewport. If browser access fails, return CODE_REVIEW_ONLY and list it as UNTESTED. Return concise Korean JSON with evidence, file/line where applicable, and no prose outside the schema.\nScope: ${brief}`;
const strengthenedPrompt = `${prompt}\nRequired taskId: "${v.task}". Return the JSON now; do not delegate or wait.`;
save('prompt.txt', strengthenedPrompt);
const string = { type: 'string' };
const schema = { type: 'object', additionalProperties: false, properties: {
  taskId: string, verdict: { type: 'string', enum: ['PASS', 'FAIL', 'BLOCKED'] },
  validationMode: { type: 'string', enum: ['BROWSER_ONLY', 'BROWSER_AND_CODE', 'CODE_REVIEW_ONLY', 'BLOCKED'] },
  summary: string, browser: string,
  coverage: { type: 'array', items: string }, untested: { type: 'array', items: string },
  findings: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    kind: { type: 'string', enum: ['BUG', 'UX_SUGGESTION'] }, severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
    title: string, location: string, observation: string, expected: string, recommendation: string, metric: string, evidence: string, validationMode: string,
  }, required: ['kind', 'severity', 'title', 'location', 'observation', 'expected', 'recommendation', 'metric', 'evidence', 'validationMode'] } },
}, required: ['taskId', 'verdict', 'validationMode', 'summary', 'browser', 'coverage', 'untested', 'findings'] };
save('schema.json', schema);
console.log(`QA artifacts: ${output}`);
if (v['prepare-only']) { save('status.json', { status: 'PREPARED', executed: false }); process.exit(0); }
const isValidReport = (candidate) => candidate?.taskId === v.task
  && ['PASS', 'FAIL', 'BLOCKED'].includes(candidate?.verdict)
  && ['BROWSER_ONLY', 'BROWSER_AND_CODE', 'CODE_REVIEW_ONLY', 'BLOCKED'].includes(candidate?.validationMode)
  && Array.isArray(candidate?.findings) && Array.isArray(candidate?.coverage) && Array.isArray(candidate?.untested);
const parseAgentOutput = (stdout) => {
  try {
    const envelope = JSON.parse(stdout);
    const report = envelope.structured_output ?? (envelope.response ? JSON.parse(envelope.response) : null);
    return { envelope, report };
  } catch { return { envelope: null, report: null }; }
};
const runAgent = (args, timeoutMs) => new Promise((done) => {
  const startedAt = Date.now();
  const child = spawn(join(homedir(), '.local/bin/agy'), args, { cwd: workspace, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = ''; let stderr = ''; let timedOut = false; let killTimer;
  child.stdout.on('data', b => { stdout += b; }); child.stderr.on('data', b => { stderr += b; });
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); killTimer = setTimeout(() => child.kill('SIGKILL'), 5000); }, timeoutMs);
  child.on('error', error => { clearTimeout(timer); clearTimeout(killTimer); done({ stdout, stderr, timedOut, durationMs: Date.now() - startedAt, outcome: { code: null, error: error.message } }); });
  child.on('close', (code, signal) => { clearTimeout(timer); clearTimeout(killTimer); done({ stdout, stderr, timedOut, durationMs: Date.now() - startedAt, outcome: { code, signal } }); });
});
const baseArgs = ['--sandbox', '--mode', 'plan', '--model', 'gemini-3.8-flash-low', '--effort', 'low', '--disable-slash-commands', '--add-dir', workspace, '--print-timeout', '75s', '--output-format', 'json', '--json-schema', join(output, 'schema.json')];
const attempts = [await runAgent([...baseArgs, '-p', strengthenedPrompt], 85000)];
let { envelope, report } = parseAgentOutput(attempts[0].stdout);
const permissionBlocked = /tool required the "read_file" permission that headless mode cannot prompt for|auto-denied/i.test(attempts[0].stderr);
// One bounded turn keeps QA predictable. A malformed response is BLOCKED and fixed in
// the next scoped run; retries cannot repair permissions or a stalled agent.
const timedOut = attempts.some(attempt => attempt.timedOut);
const outcome = attempts.at(-1).outcome;
save('agent-output.json', attempts.map(({ stdout, stderr, timedOut: attemptTimedOut, durationMs, outcome: attemptOutcome }) => ({ stdout, stderr, timedOut: attemptTimedOut, durationMs, outcome: attemptOutcome })));
save('diagnostics.log', attempts.map(attempt => attempt.stderr).filter(Boolean).join('\n'));
const after = capture(); const changed = baseline.hash !== after.hash || baseline.commit !== after.commit;
const valid = isValidReport(report);
let status = timedOut || outcome.code !== 0 || envelope?.status !== 'SUCCESS' || !valid ? 'BLOCKED' : report.verdict;
if (status === 'PASS' && (!['BROWSER_ONLY', 'BROWSER_AND_CODE'].includes(report.validationMode) || !report.coverage.length || report.untested.length)) status = 'INCOMPLETE';
if (changed) status = 'STALE_SOURCE';
if (valid) save('report.json', report);
save('status.json', { status, executed: true, attempts: attempts.length, durationMs: attempts.reduce((sum, attempt) => sum + attempt.durationMs, 0), timeoutBudgetMs: 85000, model: 'gemini-3.8-flash-low', scope: v.scope, blockedReason: permissionBlocked ? 'Headless mode denied read_file; retry skipped because it cannot grant the missing permission.' : null, ...outcome, timedOut, sourceChanged: changed, agentStatus: envelope?.status ?? null, error: envelope?.error ?? null });
save('report.md', `# ${v.task}\n\nStatus: ${status}\n\nMode: ${v.mode}\n\nCommit: ${baseline.commit}\n\n${valid ? report.summary : 'No validated report. Read status.json; this run is not a pass.'}\n\nDetails: report.json. Evidence: workspace/.\n`);
console.log(`QA status: ${status}`); process.exitCode = status === 'PASS' ? 0 : status === 'FAIL' ? 1 : 2;
