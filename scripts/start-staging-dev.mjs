import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

function readEnvironment(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
    const separator = line.indexOf('=');
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));
}

const local = readEnvironment('.env.local');
const fallback = readEnvironment('.env');
const remoteUrl = local.VITE_SUPABASE_URL;

if (!remoteUrl?.startsWith('https://')) throw new Error('Staging checks need an approved HTTPS staging Supabase URL in .env.local. Docker, local QA accounts, migrations, and seed data are unavailable.');
if (fallback.VITE_SUPABASE_URL && remoteUrl === fallback.VITE_SUPABASE_URL) throw new Error('Staging checks refuse the fallback production Supabase URL. Point .env.local at the approved staging project first.');

const child = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '4173', '--mode', 'staging'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_QA_LOCAL_BYPASS: 'false',
    VITE_APP_ORIGIN: 'http://127.0.0.1:4173',
    VITE_AUTH_REDIRECT_URL: 'http://127.0.0.1:4173/auth/callback',
  },
});
child.once('error', (error) => { throw error; });
child.once('exit', (code) => process.exit(code ?? 0));
