// Path facts shared by the code-agents profiles.
import { basename } from 'node:path';
import { matchesAny } from '../lib/project-inputs.mjs';

export const LOCKFILES = new Set([
  'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'npm-shrinkwrap.json', 'bun.lock', 'bun.lockb',
  'Cargo.lock', 'poetry.lock', 'Pipfile.lock', 'composer.lock', 'Gemfile.lock', 'go.sum', 'uv.lock',
]);

const LOCKFILES_LOWER = new Set([...LOCKFILES].map((f) => f.toLowerCase()));

// Case-insensitive: `Package-Lock.json` is the same file on a case-insensitive FS.
export const isLockfile = (rel) => LOCKFILES_LOWER.has(basename(rel).toLowerCase());

// Reason when `rel` is covered by a declared protected path, else null. The
// message states that the rule is an explicit input (AC-70).
export function protectedReason(ctx, rel) {
  const hit = matchesAny(rel, ctx.inputs.protectedPaths, true);
  return hit
    ? `${rel} is a protected path declared in ${ctx.inputs.file} ("${hit}", explicit input). ` +
      'Do not edit it; report the needed change instead.'
    : null;
}
