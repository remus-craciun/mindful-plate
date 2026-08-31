// Shared config loading for the deploy scripts. Reads deploy/ansible/.env
// (same file the Ansible playbook uses — see deploy/ansible/.env.example);
// real environment variables already set take precedence over the file.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export const ENV_PATH = path.join(import.meta.dir, '..', 'ansible', '.env');

function parseEnvFile(filePath: string): Record<string, string> {
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

export const fileVars = parseEnvFile(ENV_PATH);

export function env(key: string, fallback = ''): string {
  return process.env[key] || fileVars[key] || fallback;
}

// Wraps a value in single quotes for safe interpolation into a shell
// command, escaping any embedded single quotes — secrets/URLs may contain
// characters that would otherwise break or inject into the command.
export function shq(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
