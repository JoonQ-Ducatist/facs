import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../../App.jsx', import.meta.url), 'utf8');
const api = await readFile(new URL('../../services/supabaseApi.js', import.meta.url), 'utf8');

test('desktop identity uses the signed-in profile instead of a fixed sample handle', () => {
  assert.match(app, /import \{[^}]*getPublicHandle[^}]*\} from '\.\/services\/profileService\.js'/);
  assert.match(app, /profileHandle = getPublicHandle\(profile\)/);
  assert.match(app, /profileAvatarUrl = getProfileAvatarUrl\(profile\?\.avatar_path\)/);
  assert.doesNotMatch(app, />my_look_daily</);
});

test('desktop account recommendations use unique authors and public profile avatars', () => {
  assert.match(app, /selectUniqueAccountRecommendations\(cards, currentUserId\)/);
  assert.match(app, /key=\{target\}/);
  assert.match(api, /profiles!posts_author_id_fkey\(handle,avatar_path,bio\)/);
  assert.match(api, /authorAvatarUrl:/);
});

test('desktop account recommendations show the member bio without generic filler copy', () => {
  assert.match(api, /authorBio: post\.profiles\?\.bio\?\.trim\(\) \|\| null/);
  assert.match(app, /item\.authorBio && <span[^>]*>\{item\.authorBio\}<\/span>/);
  assert.doesNotMatch(app, /평가받을 게시물을 올리고 있어요|Posting for feedback/);
});
