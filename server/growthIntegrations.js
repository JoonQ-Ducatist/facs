import {analyticsAccessToken}from'./googleAccess.js';
import {readSurveyEvents} from './participationSurvey.js';
export async function surveyOverview(service,env=process.env,fetcher=fetch) {
 return cached(service,'participation-survey-v1',async()=>readSurveyEvents(await analyticsAccessToken(env,fetcher),env.GA4_PROPERTY_ID||'557370310',fetcher),6*3600000);
}
const VIDEO_IDS=['vrn3p8Ek98Y','9zBftxM_T5c','Cd4Dm-01q7Q','a0zPqOo37PI','c9d_o9FVnwg'];
const CHANNEL='UC0pz3RcOkIPTij-ARaDbEsw';
const GA_OVERVIEW_EVENTS = [
 'authenticated_entry', 'signup_completed', 'first_vote', 'vote_completed', 'upload_completed',
 'rating_feed_viewed', 'rating_prompt_started', 'rating_vote_saved', 'rating_skipped',
 'rating_returned', 'rating_session_completed',
];
async function cached(service,key,load,ttlMs=24*3600000){
 if(!service)throw Error('UNAVAILABLE');
 const r=await service.from('growth_integration_cache').select('payload,expires_at').eq('cache_key',key).maybeSingle();
 if(!r.error&&r.data&&Date.parse(r.data.expires_at)>Date.now())return{...r.data.payload,cached:true};
 const payload=await load();const result=await service.from('growth_integration_cache').upsert({cache_key:key,payload,expires_at:new Date(Date.now()+ttlMs).toISOString(),updated_at:new Date().toISOString()});
 if(result.error)throw Error('UNAVAILABLE');return{...payload,cached:false};
}
export async function youtubeOverview(service,env=process.env,fetcher=fetch){
 if(!env.YOUTUBE_DATA_API_KEY)throw Error('UNAVAILABLE');
 return cached(service,'youtube-overview-v1',async()=>{
  const url=new URL('https://www.googleapis.com/youtube/v3/videos');url.search=new URLSearchParams({part:'snippet,statistics',id:VIDEO_IDS.join(','),key:env.YOUTUBE_DATA_API_KEY});
  const response=await fetcher(url,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('UNAVAILABLE');const data=await response.json();
  const videos=(data.items||[]).filter(v=>v.snippet?.channelId===CHANNEL).map(v=>({id:v.id,title:String(v.snippet.title||'').slice(0,150),views:Number(v.statistics?.viewCount||0),comments:Number(v.statistics?.commentCount||0),url:`https://www.youtube.com/shorts/${v.id}`})).sort((a,b)=>b.views-a.views);
  return{checkedAt:new Date().toISOString(),videos};
 });
}
export async function youtubeComments(env=process.env,fetcher=fetch){
 if(!env.YOUTUBE_DATA_API_KEY)throw Error('UNAVAILABLE');
 const url=new URL('https://www.googleapis.com/youtube/v3/commentThreads');url.search=new URLSearchParams({part:'snippet',allThreadsRelatedToChannelId:CHANNEL,maxResults:'10',order:'time',textFormat:'plainText',key:env.YOUTUBE_DATA_API_KEY});
 const response=await fetcher(url,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('UNAVAILABLE');const data=await response.json();
 // Public comments only, explicitly requested by an admin; never persist or auto-reply.
 return{checkedAt:new Date().toISOString(),comments:(data.items||[]).map(t=>{const c=t.snippet?.topLevelComment;return{id:c?.id,author:c?.snippet?.authorDisplayName,text:String(c?.snippet?.textDisplay||'').slice(0,1500),publishedAt:c?.snippet?.publishedAt,url:`https://www.youtube.com/watch?v=${t.snippet?.videoId}&lc=${c?.id}`};})};
}
export async function gaOverview(service,env=process.env,fetcher=fetch){
 return cached(service,'ga4-overview-v2',async()=>{
  const token=await analyticsAccessToken(env,fetcher),property=String(env.GA4_PROPERTY_ID||'557370310');if(!/^\d+$/.test(property))throw Error('UNAVAILABLE');
  const body = {
   dateRanges: [{startDate:'7daysAgo',endDate:'yesterday'}],
   dimensions: [{name:'eventName'}],
   metrics: [{name:'eventCount'},{name:'keyEvents'}],
   dimensionFilter: {filter:{fieldName:'eventName',inListFilter:{values:GA_OVERVIEW_EVENTS}}},
   limit: GA_OVERVIEW_EVENTS.length,
   returnPropertyQuota: true,
  };
  const response=await fetcher(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('UNAVAILABLE');const data=await response.json();return{checkedAt:new Date().toISOString(),period:'7 complete days',events:(data.rows||[]).map(r=>({name:r.dimensionValues[0].value,count:Number(r.metricValues[0].value),keyEvents:Number(r.metricValues[1].value)}))};
 });
}
