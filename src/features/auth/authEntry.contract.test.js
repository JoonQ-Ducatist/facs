import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const featureRoot = dirname(fileURLToPath(import.meta.url));

test('preview authentication resumes an existing session unless authPreview explicitly forces the splash', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /const previewMode = new URLSearchParams\(window\.location\.search\)\.has\('preview'\)/);
  assert.match(source, /const forceAuthPreview = authPreview/);
  assert.match(source, /forceAuthPreview \|\| previewMode \|\| !sharedPostId/);
  assert.match(source, /forceAuthPreview && !allowPreviewTransition/);
  assert.match(source, /const authTransitionPending = useRef\(false\)/);
  assert.match(source, /const authTransitionConsumed = useRef\(false\)/);
  assert.match(source, /allowPreviewTransition: event === 'SIGNED_IN' && authTransitionPending\.current/);
  assert.match(source, /allowPreviewTransition && !authTransitionConsumed\.current/);
  assert.match(source, /event\.key === 'facs_auth_completed_at'.*restoreOriginalTab\(true\)/s);
  assert.match(source, /event\.key\?\.startsWith\('sb-'\).*restoreOriginalTab\(\)/s);
  assert.match(source, /const onVisible = \(\) => \{ if \(document\.visibilityState === 'visible'\) void restoreOriginalTab\(\); \}/);
});

test('brand splash always precedes the resolved authentication or Feed destination', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /import BrandSplashView from '\.\/features\/auth\/BrandSplashView\.jsx'/);
  assert.match(source, /const \[brandSplashComplete, setBrandSplashComplete\] = useState\(false\)/);
  assert.match(source, /if \(!brandSplashComplete\) return <CanvasStage locale=\{locale\}><BrandSplashView/);
  assert.match(source, /if \(!authReady\) return <CanvasStage locale=\{locale\}><StatePanel/);
  assert.match(source, /if \(isGuest\) return <CanvasStage locale=\{locale\}><AuthEntryView/);
});

test('authentication loads real public posts before sign-in and keeps its own viewport scroll region', async () => {
  const appSource = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  const authSource = await readFile(resolve(featureRoot, 'AuthEntryView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(appSource, /if \(!authReady \|\| authUser\)[\s\S]*listSupabaseAuthFeaturedPhotos\(\{ limit: 5, candidatePoolSize: 20 \}\)/);
  assert.match(appSource, /<AuthEntryView cards=\{authFeaturedCards\}/);
  assert.match(authSource, /selectAuthFeaturedPosts\(sourceCards\)/);
  assert.match(authSource, /className="auth-entry-screen relative mx-auto max-w-none/);
  assert.match(authSource, /const sourceCards = Array\.isArray\(cards\) \? cards : EMPTY_AUTH_CARDS;/);
  assert.match(authSource, /popularCards\[activeIndex\] \?\? sourceCards\[0\] \?\? null/);
  assert.match(styles, /\.auth-entry-screen \{ min-height: 100dvh; overflow-x: hidden; overflow-y: auto; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch; \}/);
  assert.match(styles, /\.auth-entry-screen__content \{ min-height: 460px; \}/);
  assert.match(styles, /\.auth-entry-screen \{ width: 100%; height: 100dvh; min-height: 100dvh; margin: 0; box-shadow: none; overflow-y: auto; \}/);
});

test('successful OTP unlock always lands on Feed and clears shared-guest state', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /async function confirmEmailCode\(email, code, remember\) \{[\s\S]*?authTransitionPending\.current = true;/);
  assert.match(source, /if \(allowPreviewTransition && !authTransitionConsumed\.current\) \{[\s\S]*?setIsSharedGuest\(false\);\s*setActiveTab\('feed'\);\s*\}/);
  assert.match(source, /event\.key === 'facs_auth_completed_at'.*restoreOriginalTab\(true\)/s);
});

test('passive session restoration cannot consume the explicit Feed transition', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /allowPreviewTransition: event === 'SIGNED_IN' && authTransitionPending\.current/);
  assert.match(source, /authTransitionConsumed\.current = true;[\s\S]*authTransitionPending\.current = false;/);
  assert.match(source, /onVisible = \(\) => \{ if \(document\.visibilityState === 'visible'\) void restoreOriginalTab\(\); \}/);
});
