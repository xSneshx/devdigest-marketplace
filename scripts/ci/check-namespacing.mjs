// AC-15: inside a plugin, a reference to a component that belongs to ANOTHER plugin must carry
// the `<plugin>:` prefix. Three reference forms are checked in every markdown file of the plugin
// (no file is excluded):
//   - an item of the frontmatter `skills:` list,
//   - an `Agent(...)` list item,
//   - a backticked component name (a leading `/` is ignored, so `/run-plan` counts).
// A name the plugin also owns itself is never reported: the bare name then resolves locally.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cliMain } from './lib/check.mjs';
import { asList, parseFrontmatter } from './lib/frontmatter.mjs';
import { componentFiles, loadWorld, walk } from './lib/repo.mjs';

export const name = 'namespacing';

const BACKTICKED = /`([^`\n]+)`/g;
const AGENT_CALL = /Agent\(([^)\n]*)\)/g;

/** `{ agents, skills, commands }` name sets of one plugin, from its files on disk. */
async function ownComponents(plugin) {
  const names = new Set();
  for (const file of await componentFiles(plugin)) {
    const parts = file.rel.split('/');
    names.add(file.kind === 'skill' ? parts[1] : path.basename(file.rel, '.md'));
    const { data } = parseFrontmatter(await readFile(file.abs, 'utf8'));
    if (typeof data.name === 'string' && data.name !== '') names.add(data.name);
  }
  return names;
}

const bare = (token) => token.trim().replace(/^\//, '');

export async function run(ctx) {
  const world = await loadWorld(ctx.root, { plugins: ctx.plugins });
  if (world.catalogError) return [world.catalogError];
  const owned = new Map();
  for (const plugin of world.plugins) owned.set(plugin.name, await ownComponents(plugin));

  const errors = [];
  for (const plugin of world.plugins) {
    if (!plugin.wanted || plugin.dir === null) continue;
    const mine = owned.get(plugin.name);
    const foreign = new Map(); // bare component name -> owning plugin
    for (const [otherName, names] of owned) {
      if (otherName === plugin.name) continue;
      for (const n of names) if (!mine.has(n) && !foreign.has(n)) foreign.set(n, otherName);
    }
    if (foreign.size === 0) continue;

    const { files } = await walk(plugin.dir);
    for (const rel of files.filter((f) => f.endsWith('.md'))) {
      const text = await readFile(path.join(plugin.dir, rel), 'utf8');
      const report = (token, form, line) => {
        const owner = foreign.get(bare(token));
        if (owner !== undefined) {
          errors.push(`${plugin.name}: ${rel}:${line}: ${form} "${token.trim()}" belongs to plugin "${owner}"; write "${owner}:${bare(token)}"`);
        }
      };

      const fm = parseFrontmatter(text);
      if (fm.present) {
        const lines = text.split(/\r?\n/);
        const skillsAt = lines.findIndex((l) => /^skills:/.test(l));
        for (const entry of asList(fm.data.skills)) {
          if (entry.includes(':')) continue;
          const at = lines.findIndex((l, i) => i >= skillsAt && l.includes(entry));
          report(entry, 'frontmatter skill', at === -1 ? 1 : at + 1);
        }
      }
      text.split(/\r?\n/).forEach((line, i) => {
        for (const m of line.matchAll(AGENT_CALL)) {
          for (const item of m[1].split(',')) if (!item.includes(':')) report(item, 'Agent() entry', i + 1);
        }
        for (const m of line.matchAll(BACKTICKED)) {
          if (!m[1].includes(':') && !/\s/.test(m[1])) report(m[1], 'backticked component', i + 1);
        }
      });
    }
  }
  return errors;
}

await cliMain(import.meta.url, { name, run });
