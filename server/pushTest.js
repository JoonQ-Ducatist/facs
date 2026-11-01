import webpush from 'web-push';
import { endpointHash, HOME, json, validPushSubscription } from './growthCore.js';

/** Operator-only diagnostic: no post, vote or first-rating notice is created. */
export async function sendOwnPushTest({ ctx, endpoint, locale, env = process.env, now = Date.now(), dispatch = webpush.sendNotification.bind(webpush), configure = webpush.setVapidDetails.bind(webpush) }) {
  const role = await ctx.member.from('profiles').select('role').eq('id', ctx.user.id).single();
  if (role.error || role.data?.role !== 'admin') throw Error('FORBIDDEN');
  if (typeof endpoint !== 'string' || endpoint.length > 4096) throw Error('INPUT');
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) throw Error('UNAVAILABLE');
  const own = await ctx.service.from('push_subscriptions').select('subscription').eq('member_id', ctx.user.id).eq('endpoint_hash', endpointHash(endpoint)).maybeSingle();
  if (own.error) throw Error('UNAVAILABLE');
  if (!own.data || !validPushSubscription(own.data.subscription)) throw Error('INPUT');
  // Existing budget table; at most one diagnostic per operator per KST calendar day.
  const day = new Date(now + 9 * 3600000).toISOString().slice(0, 10);
  const budget = await ctx.service.from('growth_request_budgets').insert({ day, scope: `push-test:${ctx.user.id}`, requests: 1 });
  if (budget.error?.code === '23505') return json({ ok: false, code: 'RATE_LIMITED' }, 429);
  if (budget.error) throw Error('UNAVAILABLE');
  configure('mailto:teamfactsmack@gmail.com', env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  const ko = locale === 'ko';
  await dispatch(own.data.subscription, JSON.stringify({ type: 'notification-test', body: ko ? '테스트 알림 — 실제 평가가 아닙니다.' : 'Test notification — this is not a rating.', url: `${HOME}/${ko ? 'ko/' : ''}?notification_test=1`, tag: 'facs-notification-test' }), { TTL: 300, timeout: 5000 });
  return json({ ok: true, accepted: true }, 202);
}
