import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { DEMO_POST_IDS, demoStarter, nextUnrated, participationCount, confirmedRating, retainedDays, weekParticipation, isRatingMember } from './ratingParticipation.js';
import { trackGa4Event } from '../../services/ga4.js';
const repo=new URL('../../../',import.meta.url).pathname;
const ids=[...DEMO_POST_IDS];

test('starter uses exact recorded binary demos and skips never count as votes',()=>{
 const cards=[{id:'stranger',author:'someone_demo1',evaluationType:'BINARY'},{id:ids[0],evaluationType:'NUMERIC_AGE'},{id:ids[1],evaluationType:'BINARY',authorId:'other'},{id:ids[2],evaluationType:'BINARY',authorId:'other'}];
 const voted=new Set([ids[1]]);
 assert.equal(demoStarter(cards,voted,'member').id,ids[2]);
 assert.equal(nextUnrated(cards,ids[0],voted,[ids[2]],'member'),undefined);
 assert.deepEqual([...voted],[ids[1]]);
 assert.equal(isRatingMember({id:'id',handle:'mia_demo1',role:'member'}),false);
 assert.equal(isRatingMember({id:'id',handle:'real_member',role:'member'}),true);
});

test('confirmed participation is deduplicated and days survive a missed day within bounded local history',()=>{
 const monday=new Date(2026,9,26,12),wednesday=new Date(2026,9,28,12);
 const first=confirmedRating({completed:[],days:[]},'post-a',monday);
 assert.equal(confirmedRating(first,'post-a',monday),first);
 const next=confirmedRating(first,'post-b',wednesday);
 assert.equal(weekParticipation(next.days,wednesday),2);
 assert.deepEqual(retainedDays(['bad','2025-01-01','2026-10-26','2099-12-31'],wednesday),['2026-10-26']);
});

test('rating telemetry sends event names only and never falls through to identity properties',()=>{
 const calls=[];const documentRef={head:{append(){}},querySelector:()=>({}),createElement:()=>({dataset:{}})};
 const windowRef={document:documentRef,location:{origin:'https://www.factsmack.com'},gtag:(...args)=>calls.push(args)};
 for(const event of ['rating_feed_viewed','rating_prompt_started','rating_vote_saved','rating_skipped','rating_returned','rating_session_completed'])assert.equal(trackGa4Event(event,{environment:{VITE_GA_MEASUREMENT_ID:'G-TEST123'},windowRef}),true);
 assert.deepEqual(calls.filter(c=>c[0]==='event').map(c=>c.length),[2,2,2,2,2,2]);
});

test('pre-vote counts include binary and age totals without opening results or inventing zero after a read failure',async()=>{
 assert.equal(participationCount({evaluationType:'BINARY',yesVotes:2,noVotes:3}),5);
 assert.equal(participationCount({evaluationType:'NUMERIC_AGE',ageVoteCount:7}),7);
 assert.equal(participationCount({evaluationType:'BINARY',yesVotes:0,noVotes:0,participationCount:null}),null);
 assert.equal(participationCount({evaluationType:'BINARY',yesVotes:0,noVotes:0,participationCount:0}),0);
 await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import FeedView from './src/features/feed/FeedView.jsx';module.exports=renderToStaticMarkup(<FeedView locale="en" categories={{Outfit:{label:'Outfit',color:'#735c00',icon:'checkroom'}}} cards={[{id:'${ids[0]}',author:'mia_demo1',authorId:'demo-owner',category:'Outfit',evaluationType:'BINARY',question:'Does this outfit work?',imageUrl:'data:image/png;base64,',yesVotes:2,noVotes:3,comments:[],commentsAllowed:false}]} activeCategory="ALL" votedIds={new Set()} currentUserId="real" onVote={()=>{}} />);`,resolveDir:repo,loader:'jsx'},loader:{'.png':'dataurl','.svg':'dataurl'},define:{'import.meta.env':'{}'},bundle:true,platform:'node',format:'cjs',jsx:'automatic',outfile:'/private/tmp/facs-rating-render.cjs',logLevel:'silent'});
 const html=createRequire(import.meta.url)('/private/tmp/facs-rating-render.cjs');
 assert.match(html,/5 people have rated this/);
 assert.match(html,/No right answer/);
 assert.doesNotMatch(html,/Average perceived age|APPROVAL|AI Demo|AI 데모/);
 assert.match(html,/Not sure · Next photo/);
});
