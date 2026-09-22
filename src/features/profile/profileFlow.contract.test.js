import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const featureRoot = dirname(fileURLToPath(import.meta.url));

test('profile exposes an explicit change flow for an existing public ID', async () => {
  const source = await readFile(resolve(featureRoot, 'ProfileView.jsx'), 'utf8');
  assert.match(source, /editingHandle/);
  assert.match(source, /function beginHandleEditFromTouch\(event\)/);
  assert.match(source, /onPointerUp=\{beginHandleEditFromTouch\}.*onClick=\{beginHandleEdit\}/s);
  assert.match(source, /min-h-9 shrink-0 rounded-md/);
  assert.match(source, /function beginHandleEdit\(event\)/);
  assert.match(source, /initialHandle=\{displayHandle \?\? ''\}/);
  assert.match(source, /onCancel=\{\(\) => setEditingHandle\(false\)\}/);
});

test('profile handle typography and uploaded-photo actions stay consistent across locale changes', async () => {
  const source = await readFile(resolve(featureRoot, 'ProfileView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  const appSource = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /data-no-translate className="font-headline text-sm font-bold text-white">\{locale === 'en' \? 'My uploaded photo insights' : '내가 업로드한 사진 분석'\}/);
  assert.match(source, /<button data-no-translate type="button" onClick=\{onUpload\}[^>]*>.*aria-hidden="true".*\{locale === 'en' \? 'New upload' : '새로 업로드'\}<\/button>/s);
  assert.match(styles, /\.profile-summary__handle\s*\{[^}]*font-family: 'Pretendard Variable', Pretendard, sans-serif !important;[^}]*font-size: 14px !important;/);
  assert.match(source, /function focusHandleInput\(\) \{[\s\S]*?inputRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /className="profile-handle-input min-w-0 flex-1/);
  assert.doesNotMatch(source, /onTouchStart=\{focusHandleInput\}/);
  assert.match(appSource, /const originalText = new Map\(\);[\s\S]*const originalAttributes = new Map\(\);/);
  assert.match(appSource, /originalText\.forEach\(\(original, node\) => \{\s*if \(node\.isConnected && node\.nodeValue === translatedText\.get\(node\)\) node\.nodeValue = original;/);
  assert.match(appSource, /originalAttributes\.forEach\(\(attributes, node\) => \{[\s\S]*if \(node\.getAttribute\(attribute\) === translated\) node\.setAttribute\(attribute, original\);/);
});

test('a server-rejected public-ID change remains actionable and surfaces its reason', async () => {
  const appSource = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  const profileSource = await readFile(resolve(featureRoot, 'ProfileView.jsx'), 'utf8');
  assert.match(appSource, /if \(!saved\.ok\) \{[\s\S]*?setToast\(saved\.message\);[\s\S]*?return saved;/);
  assert.match(profileSource, /autoFocus=\{isEditing\}/);
  assert.match(profileSource, /if \(!result\?\.ok\) setNotice\(result\?\.message/);
});

test('upload posting ID links to profile instead of showing a dead hint', async () => {
  const source = await readFile(resolve(featureRoot, '../upload/UploadView.jsx'), 'utf8');
  assert.match(source, /onOpenProfile/);
  assert.match(source, /onClick=\{onOpenProfile\}/);
  assert.match(source, /Change in Profile.*프로필에서 변경/);
});

test('the app wires the upload ID CTA to the profile tab', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /activeTab === 'upload'.*onOpenProfile=\{\(\) => setActiveTab\('profile'\)\}/s);
});

test('public ID input can focus on touch and keeps save errors in the profile form', async () => {
  const source = await readFile(resolve(featureRoot, 'ProfileView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(source, /const inputRef = useRef\(null\)/);
  assert.match(source, /ref=\{inputRef\}.*onPointerDown=\{focusHandleInput\} onClick=\{focusHandleInput\}/s);
  assert.match(source, /requestAnimationFrame\(\(\) => inputRef\.current\?\.focus\(\{ preventScroll: true \}\)\)/);
  assert.doesNotMatch(source, /onPointerDown=\{isolateTouch\} onPointerUp=\{isolateTouch\} onPointerCancel=\{isolateTouch\}/);
  assert.match(source, /catch \{\s*setNotice\(/s);
  assert.match(styles, /\.editorial-profile input \{ touch-action: manipulation; \}/);
});

test('saving the required public ID resumes the pending Upload flow only on success', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /const \[resumeUploadAfterHandle, setResumeUploadAfterHandle\] = useState\(false\)/);
  assert.match(source, /setResumeUploadAfterHandle\(true\);\s*setActiveTab\('profile'\)/s);
  assert.match(source, /if \(resumeUploadAfterHandle\) \{\s*setResumeUploadAfterHandle\(false\);\s*setActiveTab\('upload'\);/s);
  assert.match(source, /if \(!saved\.ok\) \{[\s\S]*?setToast\(saved\.message\);[\s\S]*?return saved;/);
});

test('profile orders own posts and exposes a keyboard-safe scrap open callback', async () => {
  const source = await readFile(resolve(featureRoot, 'ProfileView.jsx'), 'utf8');
  assert.match(source, /const profileLibrary = profileCards \?\? \(isAuthenticated \? \[\] : cards\);/);
  assert.match(source, /sortPostsNewestFirst\(profileLibrary\.filter\(\(card\) => card\.isMyUpload\)\)/);
  assert.match(source, /onOpenScrap/);
  assert.match(source, /event\.key !== 'Enter' && event\.key !== ' '/);
  assert.match(source, /event\.stopPropagation\(\); onRemove\(\)/);
  assert.match(source, /onKeyDown=\{\(event\) => event\.stopPropagation\(\)\}/);
});

test('the app hydrates private profile libraries and passes scrap open targets to Feed', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /listSupabaseMyPublishedProfileCards/);
  assert.match(source, /listSupabaseMyScrapFeedCards/);
  assert.match(source, /Promise\.all\(\[listSupabaseMyPublishedProfileCards\(\), listSupabaseMyScrapFeedCards\(\)\]\)/);
  assert.match(source, /profileCards=\{displayProfileCards\} scrapCards=\{displayScrapCards\}/);
  assert.match(source, /onOpenScrap=\{openScrapCard\}/);
  assert.match(source, /setCards\(\(items\) => items\.some\(\(item\) => item\.id === card\.id\)/);
});
