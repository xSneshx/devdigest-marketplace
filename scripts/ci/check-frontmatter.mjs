// AC-24 (agents carry no hooks, permissionMode or mcpServers: plugin agents ignore them),
// AC-65 (the retro skill and command are manual-only and nothing invokes them automatically),
// and a YAML sanity pass: an invalid description truncates a skill silently.
import { readFile } from 'node:fs/promises';
import { cliMain } from './lib/check.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { componentFiles, loadWorld } from './lib/repo.mjs';

export const name = 'frontmatter';

const FORBIDDEN_AGENT_KEYS = ['hooks', 'permissionMode', 'mcpServers'];
const RETRO_COMPONENTS = [
  { kind: 'skill', rel: 'skills/workflow-retro/SKILL.md' },
  { kind: 'command', rel: 'commands/sdd-retro.md' },
];
const RETRO_NAME = /(\/sdd-retro|workflow-retro|sdd-retro)/;
const AUTO_VERB = /\b(invoke|invokes|run|runs|call|calls|launch|launches|trigger|triggers|dispatch|dispatches|start|starts|load|loads|use|uses|then)\b/i;
const NEGATION = /\b(not|never|no|without|manual|manually|only when|unless|don't|do not|must not)\b/i;

export async function run(ctx) {
  const world = await loadWorld(ctx.root, { plugins: ctx.plugins });
  if (world.catalogError) return [world.catalogError];
  const errors = [];
  const all = [];
  for (const plugin of world.plugins) {
    if (plugin.wanted) for (const file of await componentFiles(plugin)) all.push({ plugin, file });
  }
  for (const { plugin, file } of all) {
    const where = `${plugin.name}: ${file.rel}`;
    const text = await readFile(file.abs, 'utf8');
    const { present, data, errors: parseErrors } = parseFrontmatter(text);
    for (const message of parseErrors) errors.push(`${where}: ${message}`);
    if (!present && file.kind !== 'command') errors.push(`${where}: missing frontmatter`);
    if (file.kind === 'agent') {
      for (const key of FORBIDDEN_AGENT_KEYS) {
        if (key in data) errors.push(`${where}: agent frontmatter must not set "${key}" (plugin agents ignore it)`);
      }
    }
    const retro = RETRO_COMPONENTS.find((c) => c.kind === file.kind && c.rel === file.rel);
    if (retro && String(data['disable-model-invocation']).toLowerCase() !== 'true') {
      errors.push(`${where}: must set "disable-model-invocation: true" (manual-only)`);
    }
    const isRetroFile = retro !== undefined;
    if (!isRetroFile) {
      text.split(/\r?\n/).forEach((line, index) => {
        if (RETRO_NAME.test(line) && AUTO_VERB.test(line) && !NEGATION.test(line)) {
          errors.push(`${where}:${index + 1}: appears to invoke the manual-only retro automatically: ${line.trim().slice(0, 80)}`);
        }
      });
    }
  }
  return errors;
}

await cliMain(import.meta.url, { name, run });
