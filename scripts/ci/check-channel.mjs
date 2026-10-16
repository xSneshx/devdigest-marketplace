// AC-13: the catalog `name` must match the release channel the checked ref belongs to:
// `devdigest-marketplace` on `main`, `devdigest-marketplace-stable` on `stable`.
// The channel ref comes from `--channel`, else the pull request target, else the pushed ref
// (see lib/check.mjs). A ref that is not a channel ref is skipped with a logged reason.
import path from 'node:path';
import { cliMain } from './lib/check.mjs';
import { readJson } from './lib/repo.mjs';

export const name = 'channel';

export async function run(ctx) {
  const channels = ctx.config?.channels ?? {};
  const ref = ctx.channelRef ?? null;
  if (ref === null || ref === '') {
    return { errors: [], skipped: 'no channel ref (set --channel, GITHUB_BASE_REF or GITHUB_REF_NAME)' };
  }
  if (!Object.hasOwn(channels, ref)) {
    return { errors: [], skipped: `ref "${ref}" is not a channel ref (${Object.keys(channels).join(', ')})` };
  }
  const expected = channels[ref];
  const catalog = await readJson(path.join(ctx.root, '.claude-plugin', 'marketplace.json'));
  if (catalog.error) return [`.claude-plugin/marketplace.json: ${catalog.error}`];
  const actual = catalog.value?.name;
  if (actual !== expected) {
    return [`catalog name "${String(actual)}" on channel ref "${ref}"; expected "${expected}"`];
  }
  return [];
}

await cliMain(import.meta.url, { name, run });
