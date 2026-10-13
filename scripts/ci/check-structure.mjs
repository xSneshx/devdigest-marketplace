// AC-10 (README sections, CHANGELOG, COMPATIBILITY), AC-11 (forbidden files and a top-level
// bin/), AC-34 (each plugin has at least one eval case per class: positive, negative,
// workflow). A case counts for a class when the class word is a path segment under evals/ or
// appears in a file as `class|type|tag|tags|category: <class>` (JSON or YAML).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cliMain } from './lib/check.mjs';
import { exists, isDirectory, loadWorld, walk } from './lib/repo.mjs';

export const name = 'structure';

export const README_SECTIONS = ['Use case', 'Components', 'Requirements', 'Installation', 'Quick start', 'Verification', 'Support'];
export const EVAL_CLASSES = ['positive', 'negative', 'workflow'];
const FORBIDDEN_FILES = new Set(['CLAUDE.md', 'AGENTS.md', 'settings.json']);
const FORBIDDEN_DIRS = new Set(['node_modules', '.cache', '__pycache__', 'evals-out']);
const FORBIDDEN_TOP_DIRS = new Set(['bin', 'specs', 'plans']);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function evalClassesIn(relPath, text) {
  const found = new Set();
  for (const cls of EVAL_CLASSES) {
    const asSegment = new RegExp(`(^|[/._-])${cls}([/._-]|$)`, 'i');
    const asField = new RegExp(`["']?(class|type|tags?|category)["']?\\s*[:=]\\s*[\\[\\s]*["']?${cls}\\b`, 'i');
    if (asSegment.test(relPath) || asField.test(text)) found.add(cls);
  }
  return found;
}

export async function run(ctx) {
  const world = await loadWorld(ctx.root, { plugins: ctx.plugins });
  if (world.catalogError) return [world.catalogError];
  const errors = [];
  for (const plugin of world.plugins) {
    if (!plugin.wanted || plugin.dir === null || !(await isDirectory(plugin.dir))) continue;
    const label = plugin.name;
    const readme = path.join(plugin.dir, 'README.md');
    if (!(await exists(readme))) {
      errors.push(`${label}: README.md is missing`);
    } else {
      const headings = (await readFile(readme, 'utf8')).split(/\r?\n/).filter((l) => /^#{1,6}\s/.test(l));
      for (const section of README_SECTIONS) {
        const re = new RegExp(`^#{1,6}\\s+${escapeRe(section)}\\s*$`, 'i');
        if (!headings.some((h) => re.test(h))) errors.push(`${label}: README.md has no "${section}" section`);
      }
    }
    for (const file of ['CHANGELOG.md', 'COMPATIBILITY.md']) {
      if (!(await exists(path.join(plugin.dir, file)))) errors.push(`${label}: ${file} is missing`);
    }

    const { files, dirs } = await walk(plugin.dir);
    for (const file of files) {
      if (FORBIDDEN_FILES.has(path.posix.basename(file))) errors.push(`${label}: forbidden file ${file}`);
    }
    for (const dir of dirs) {
      if (!dir.includes('/') && FORBIDDEN_TOP_DIRS.has(dir)) errors.push(`${label}: forbidden top-level directory ${dir}/`);
      if (FORBIDDEN_DIRS.has(path.posix.basename(dir))) errors.push(`${label}: forbidden directory ${dir}/ (cached artifact)`);
    }

    const hasEvals = dirs.includes('evals');
    if (hasEvals || ctx.flags.requireEvals) {
      const covered = new Set();
      for (const file of files.filter((f) => f.startsWith('evals/'))) {
        let text = '';
        if (/\.(json|ya?ml|md|mjs|txt)$/i.test(file)) text = await readFile(path.join(plugin.dir, file), 'utf8');
        for (const cls of evalClassesIn(file.slice('evals/'.length), text)) covered.add(cls);
      }
      for (const cls of EVAL_CLASSES.filter((c) => !covered.has(c))) {
        errors.push(`${label}: no ${cls} eval case under evals/`);
      }
    }
  }
  return errors;
}

await cliMain(import.meta.url, { name, run });
