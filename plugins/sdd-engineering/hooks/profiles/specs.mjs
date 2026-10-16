// Profile for sdd-engineering:spec-creator (AC-25). Writes exactly one Markdown
// file directly under a spec directory: `specs/`, `<dir>/specs/`, or the
// directories declared as `specDirs` in .claude/project-inputs.json (explicit
// input, authoritative when present: AC-70). Bash is the shared read/check
// whitelist.
import { existsSync, readFileSync } from 'node:fs';
import { basename, posix } from 'node:path';
import { matchesAny } from '../lib/project-inputs.mjs';
import { readOnlyBash } from './common.mjs';

// <dir>/specs/<name>.md with one optional leading directory that is not hidden
// and not a dependency folder.
const CONVENTIONAL = /^(?:(?!node_modules\/|\.)[^/]+\/)?specs\/[^/]+\.md$/;
// An approved or implemented spec is no longer the author's to edit.
const SPEC_LOCKED = /^\s*(#[^\n]*\|\s*)?\**status\**\s*:\s*\**\s*(approved|implemented)\b/im;

const norm = (d) => d.replace(/^\.\//, '').replace(/\/+$/, '');

export const specs = {
  files(ctx, rel, abs) {
    const declared = ctx.inputs.specDirs;
    const inSpecDir = declared.length
      ? rel.endsWith('.md') && declared.some((d) => posix.dirname(rel) === norm(d))
      : CONVENTIONAL.test(rel);
    if (!inSpecDir || basename(rel) === 'README.md') {
      const where = declared.length
        ? `the spec directories declared in ${ctx.inputs.file} (${declared.join(', ')}; explicit input)`
        : 'specs/ or <dir>/specs/';
      return `${rel} is not a spec file. spec-creator writes one Markdown file directly under ` +
        `${where}, never code, docs, plans, READMEs or config. Report what else needs ` +
        'changing instead.';
    }
    if (matchesAny(rel, ctx.inputs.protectedPaths, true)) {
      return `${rel} is a protected path declared in ${ctx.inputs.file} (explicit input).`;
    }
    if (!existsSync(abs)) return null;
    if (ctx.tool === 'Write') {
      return `${rel} already exists. Revise a spec in place with Edit; Write would replace ` +
        'it wholesale and drop content.';
    }
    if (SPEC_LOCKED.test(readFileSync(abs, 'utf8'))) {
      return `${rel} is approved or implemented and is no longer yours to edit. Write a new ` +
        'spec with a "Supersedes:" line, or return the change as a question.';
    }
    return null;
  },
  bash: readOnlyBash,
};
