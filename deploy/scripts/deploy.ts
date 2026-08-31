#!/usr/bin/env bun
// SSH deploy/revert for Mindful Plate — a bun-native alternative to the
// Ansible playbook that does the exact same thing (same steps, same
// image-rotation behavior), for routine deploys without needing Ansible
// installed. Installs or removes nothing on the host; Docker and Postgres
// are assumed to already be set up there.
//
// Usage:
//   bun deploy/scripts/deploy.ts deploy   # git pull, build, rotate images, run
//   bun deploy/scripts/deploy.ts revert   # roll back to the "previous" image
//
// Config comes from deploy/ansible/.env (same file the Ansible playbook
// uses — see deploy/ansible/.env.example) — real environment variables
// already set take precedence over the file.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ENV_PATH = path.join(import.meta.dir, '..', 'ansible', '.env');
const IMAGE_NAME = 'mindful-plate';
const APP_DIR = 'mindful-plate'; // relative to the SSH user's home dir on the host

function loadEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const vars: Record<string, string> = {};
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

const fileVars = loadEnvFile(ENV_PATH);
function env(key: string, fallback = ''): string {
  return process.env[key] || fileVars[key] || fallback;
}

// Wraps a value in single quotes for safe interpolation into the remote
// shell script, escaping any embedded single quotes — secrets/URLs may
// contain characters that would otherwise break or inject into the script.
function shq(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

const HOST = env('HOST');
const SSH_USER = env('SSH_USER', 'deploy');
const SSH_KEY = env('SSH_KEY');
const GIT_REPO_URL = env('GIT_REPO_URL', 'https://github.com/remus-craciun/mindful-plate.git');
const GIT_BRANCH = env('GIT_BRANCH', 'main');
const DATABASE_URL = env('DATABASE_URL');
const JWT_SECRET = env('JWT_SECRET');
const GEMINI_API_KEY = env('GEMINI_API_KEY');

const action = process.argv[2];
if (action !== 'deploy' && action !== 'revert') {
  console.error('Usage: bun deploy/scripts/deploy.ts <deploy|revert>');
  process.exit(1);
}

const missing: string[] = [];
if (!HOST) missing.push('HOST');
if (!DATABASE_URL) missing.push('DATABASE_URL');
if (!JWT_SECRET || JWT_SECRET.length < 32) missing.push('JWT_SECRET (32+ characters)');
if (missing.length > 0) {
  console.error(`Missing required config: ${missing.join(', ')}`);
  console.error('Copy deploy/ansible/.env.example to deploy/ansible/.env and fill in real values.');
  process.exit(1);
}

// Same flags the Ansible playbook uses for `docker run`, parameterized by
// image tag so both deploy (":latest") and revert (":previous") share it.
function runContainerCmd(tag: string): string {
  return [
    'docker run -d',
    `--name ${IMAGE_NAME}`,
    '--restart unless-stopped',
    '--add-host=host.docker.internal:host-gateway',
    '-p 3000:3000',
    '-e NODE_ENV=production',
    '-e PORT=3000',
    '-e HOST=0.0.0.0',
    `-e DATABASE_URL=${shq(DATABASE_URL)}`,
    `-e JWT_SECRET=${shq(JWT_SECRET)}`,
    `-e GEMINI_API_KEY=${shq(GEMINI_API_KEY)}`,
    `${IMAGE_NAME}:${tag}`,
  ].join(' ');
}

const deployScript = `
set -e
if [ -d ${shq(APP_DIR)}/.git ]; then
  git -C ${shq(APP_DIR)} fetch origin ${shq(GIT_BRANCH)}
  git -C ${shq(APP_DIR)} reset --hard origin/${GIT_BRANCH}
else
  git clone --branch ${shq(GIT_BRANCH)} ${shq(GIT_REPO_URL)} ${shq(APP_DIR)}
fi
docker rmi ${IMAGE_NAME}:previous >/dev/null 2>&1 || true
docker tag ${IMAGE_NAME}:latest ${IMAGE_NAME}:previous >/dev/null 2>&1 || true
cd ${shq(APP_DIR)}
docker build -f apps/server/Dockerfile -t ${IMAGE_NAME}:latest .
docker rm -f ${IMAGE_NAME} >/dev/null 2>&1 || true
${runContainerCmd('latest')}
echo "Deployed ${IMAGE_NAME}:latest"
`;

const revertScript = `
set -e
if ! docker image inspect ${IMAGE_NAME}:previous >/dev/null 2>&1; then
  echo "No ${IMAGE_NAME}:previous image found on this host — nothing to revert to." >&2
  exit 1
fi
docker rm -f ${IMAGE_NAME} >/dev/null 2>&1 || true
${runContainerCmd('previous')}
echo "Reverted to ${IMAGE_NAME}:previous"
`;

const remoteScript = action === 'deploy' ? deployScript : revertScript;

const sshArgs = ['ssh', '-o', 'ConnectTimeout=10'];
if (SSH_KEY) sshArgs.push('-i', SSH_KEY);
sshArgs.push(`${SSH_USER}@${HOST}`, 'bash', '-s');

console.log(`Running "${action}" on ${SSH_USER}@${HOST}...`);

const proc = Bun.spawn(sshArgs, {
  stdin: 'pipe',
  stdout: 'inherit',
  stderr: 'inherit',
});
proc.stdin.write(remoteScript);
proc.stdin.end();

const exitCode = await proc.exited;
process.exit(exitCode);
