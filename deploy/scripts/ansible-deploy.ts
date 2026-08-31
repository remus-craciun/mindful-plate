#!/usr/bin/env bun
// Thin wrapper around `ansible-playbook` for Mindful Plate deploys — loads
// deploy/ansible/.env (see deploy/ansible/.env.example) and forwards it as
// environment variables, so you don't have to manually `source` the file
// every time. Runs the exact same playbook as a raw ansible-playbook
// invocation would; this just saves the env-loading step.
//
// Usage:
//   bun run deploy:ansible               # normal deploy
//   bun run deploy:ansible -- --check     # dry run
//   bun run deploy:ansible -- --list-hosts
//
// Any extra arguments are forwarded to ansible-playbook as-is.

import path from 'node:path';
import { fileVars } from './env';

const REPO_ROOT = path.join(import.meta.dir, '..', '..');
const PLAYBOOK_ARGS = [
  '-i',
  'deploy/ansible/inventory.yml',
  'deploy/ansible/playbook.yml',
  ...process.argv.slice(2),
];

console.log(`Running: ansible-playbook ${PLAYBOOK_ARGS.join(' ')}`);

// Deliberately not "inherit" for stdout/stderr: Bun marks its own stdout fd
// non-blocking, which ansible refuses to run against ("Ansible requires
// blocking IO on stdin/stdout/stderr") when that fd is inherited directly.
// Piping and forwarding manually gives the child fresh, blocking pipe fds.
const proc = Bun.spawn(['ansible-playbook', ...PLAYBOOK_ARGS], {
  cwd: REPO_ROOT,
  env: { ...process.env, ...fileVars },
  stdin: 'inherit',
  stdout: 'pipe',
  stderr: 'pipe',
});

await Promise.all([
  (async () => {
    for await (const chunk of proc.stdout) process.stdout.write(chunk);
  })(),
  (async () => {
    for await (const chunk of proc.stderr) process.stderr.write(chunk);
  })(),
]);

const exitCode = await proc.exited;
process.exit(exitCode);
