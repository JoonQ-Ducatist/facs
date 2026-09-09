import { existsSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { delimiter, join } from 'node:path';

const dockerDesktopBin = '/Applications/Docker.app/Contents/Resources/bin';
const dockerBin = existsSync(join(dockerDesktopBin, 'docker')) ? join(dockerDesktopBin, 'docker') : 'docker';
const environment = { ...process.env, PATH: `${dockerDesktopBin}${delimiter}${process.env.PATH ?? ''}` };

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', env: environment, ...options });
}

function localAuthEnvironmentIsReady() {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return false;
  const content = readFileSync(path, 'utf8');
  return content.includes('VITE_SUPABASE_URL=http://127.0.0.1:54321')
    && content.includes('VITE_AUTH_REDIRECT_URL=http://127.0.0.1:5173/auth/callback');
}

async function waitForDocker() {
  if (run(dockerBin, ['version']).status === 0) return;

  if (process.platform !== 'darwin' || !existsSync('/Applications/Docker.app')) {
    throw new Error('Docker Desktop must be installed and running before local authentication testing.');
  }

  run('open', ['-gja', 'Docker']);
  for (let attempt = 0; attempt < 45; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (run(dockerBin, ['version']).status === 0) return;
  }
  throw new Error('Docker Desktop did not become ready. Open Docker Desktop and wait for Engine running.');
}

function start(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env: environment });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`)));
  });
}

async function main() {
  if (!localAuthEnvironmentIsReady()) {
    throw new Error('Missing local auth configuration. Create .env.local from supabase/auth-environments.md before running dev:local.');
  }

  await waitForDocker();
  await start('npx', ['supabase', 'start', '--ignore-health-check']);
  console.log('Local Supabase and Mailpit are ready. Starting FACS at http://127.0.0.1:5173');

  const vite = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1'], { stdio: 'inherit', env: environment });
  const stop = () => vite.kill('SIGINT');
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  vite.once('error', (error) => { throw error; });
  vite.once('exit', (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error(`Local authentication server was not started: ${error.message}`);
  process.exit(1);
});
