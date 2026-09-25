import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const QA_SWITCH_PATH = '/__facs-qa/session';
const QA_ACCOUNT_EMAILS = Object.freeze({
  uploader: 'qa.uploader@local.facts.test',
  evaluator: 'qa.evaluator@local.facts.test',
  safety: 'qa.safety@local.facts.test',
  moderator: 'qa.moderator@local.facts.test',
});

function localQaSessionPlugin({ supabaseUrl, publishableKey, password }) {
  return {
    name: 'facs-local-qa-session',
    configureServer(server) {
      server.middlewares.use(QA_SWITCH_PATH, async (request, response, next) => {
        if (request.method !== 'POST') return next();
        const host = request.headers.host?.split(':')[0];
        if (!['127.0.0.1', 'localhost'].includes(host)) {
          response.statusCode = 403;
          response.end(JSON.stringify({ code: 'LOCAL_QA_FORBIDDEN' }));
          return;
        }

        let body = '';
        for await (const chunk of request) body += chunk;
        let accountId;
        try { accountId = JSON.parse(body).accountId; } catch { accountId = null; }
        const email = QA_ACCOUNT_EMAILS[accountId];
        if (!email) {
          response.statusCode = 400;
          response.end(JSON.stringify({ code: 'LOCAL_QA_ACCOUNT_UNKNOWN' }));
          return;
        }
        if (!supabaseUrl || !publishableKey || !password) {
          response.statusCode = 503;
          response.end(JSON.stringify({ code: 'LOCAL_QA_NOT_CONFIGURED' }));
          return;
        }

        try {
          const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          if (!authResponse.ok) {
            response.statusCode = 401;
            response.end(JSON.stringify({ code: 'LOCAL_QA_SIGN_IN_FAILED' }));
            return;
          }
          const session = await authResponse.json();
          response.setHeader('Content-Type', 'application/json');
          response.setHeader('Cache-Control', 'no-store');
          response.end(JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }));
        } catch {
          response.statusCode = 502;
          response.end(JSON.stringify({ code: 'LOCAL_QA_SIGN_IN_FAILED' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  return {
    plugins: [react(), localQaSessionPlugin({
      supabaseUrl: env.VITE_SUPABASE_URL,
      publishableKey,
      // This unprefixed value stays in the Vite process. It is never bundled.
      password: env.FACS_QA_ACCOUNT_PASSWORD,
    })],
    // 로컬 개발은 루트 경로를, GitHub Pages는 현재 저장소 이름의 하위 경로를 사용한다.
    base: process.env.VITE_BASE_PATH ?? '/',
  };
});
