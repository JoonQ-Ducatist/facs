import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { shareResultData } from './shareResultData.js';

const shareCard = await readFile(new URL('./ShareResultCard.jsx', import.meta.url), 'utf8');
const feed = await readFile(new URL('./FeedView.jsx', import.meta.url), 'utf8');
const dialog = await readFile(new URL('../../components/ui/Dialog.jsx', import.meta.url), 'utf8');

test('share results distinguish zero, unavailable, pre-vote hidden and actual binary/age aggregates', () => {
  assert.deepEqual(shareResultData({yesVotes:0,noVotes:0},true),{status:'empty',total:0});
  assert.deepEqual(shareResultData({yesVotes:0,noVotes:0,participationCount:null},true),{status:'unavailable',total:null});
  assert.deepEqual(shareResultData({yesVotes:2,noVotes:1},false),{status:'hidden',total:3});
  assert.deepEqual(shareResultData({yesVotes:2,noVotes:1},true),{status:'ready',total:3,yesPercent:67,noPercent:33});
  assert.deepEqual(shareResultData({evaluationType:'NUMERIC_AGE',ageVoteCount:0,ageEstimate:0},true),{status:'empty',total:0});
  assert.deepEqual(shareResultData({evaluationType:'NUMERIC_AGE',ageVoteCount:2,ageEstimate:29.5},true),{status:'ready',total:2,averageAge:29.5});
  assert.deepEqual(shareResultData({evaluationType:'NUMERIC_AGE',ageVoteCount:2,ageEstimate:null},true),{status:'unavailable',total:2});
  assert.deepEqual(shareResultData({yesVotes:NaN,noVotes:1},true),{status:'unavailable',total:null});
});

test('share dialog escapes feed containment and retains the existing share flow and result permissions', () => {
  assert.match(dialog, /DialogPrimitive.Portal/);
  assert.match(shareCard, /<Dialog open onOpenChange/);
  assert.match(shareCard, /<DialogContent/);
  assert.match(shareCard, /onTouchMove=\{\(event\) => event.stopPropagation\(\)\}/);
  assert.match(shareCard, /result.status === 'empty'/);
  assert.match(shareCard, /result.status === 'hidden'/);
  assert.match(feed, /canViewResults=\{hasVoted \|\| isOwnPost\}/);
  assert.match(feed, /onShare=\{\(\) => onShare\(card\)\}/);
  assert.match(shareCard, /onClick=\{onShare\}/);
});
