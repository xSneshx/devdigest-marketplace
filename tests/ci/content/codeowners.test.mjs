import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { run } from '../../../scripts/ci/check-codeowners.mjs';
import { cleanup, ctxFor, errorsOf, makeMarketplace } from '../core/helpers.mjs';

const roots = [];
const GOOD = [
  '* @owner',
  '/plugins/alpha/ @owner',
  '/plugins/beta/ @owner',
  '/plugins/*/hooks/ @owner',
  '/scripts/ @owner',
  '/.github/ @owner',
  '',
].join('\n');

async function build(codeowners, extraFiles = {}) {
  const root = await makeMarketplace([
    { name: 'alpha', files: { 'hooks/guard.mjs': '// guard\n' } },
    { name: 'beta' },
  ]);
  roots.push(root);
  const files = { 'scripts/ci/check-x.mjs': '// ci\n', '.github/run.sh': '# ci\n', ...extraFiles };
  for (const [rel, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await writeFile(path.join(root, rel), content);
  }
  if (codeowners !== null) await writeFile(path.join(root, 'CODEOWNERS'), codeowners);
  return root;
}
after(() => Promise.all(roots.map(cleanup)));

describe('check-codeowners', () => {
  it('accepts a default rule, one line per plugin and covered scripts', async () => {
    assert.deepEqual(errorsOf(await run(ctxFor(await build(GOOD)))), []);
  });

  it('fails a missing CODEOWNERS file and a missing default rule', async () => {
    assert.match(errorsOf(await run(ctxFor(await build(null))))[0], /CODEOWNERS not found/);
    const noDefault = GOOD.replace('* @owner\n', '');
    assert.match(errorsOf(await run(ctxFor(await build(noDefault)))).join('\n'), /no default "\*" rule/);
  });

  it('fails a plugin without a line and a plugin with two lines', async () => {
    const missing = GOOD.replace('/plugins/beta/ @owner\n', '');
    assert.match(errorsOf(await run(ctxFor(await build(missing)))).join('\n'), /no "\/plugins\/beta\/" line for plugin "beta"/);
    const twice = `${GOOD}/plugins/alpha @owner\n`;
    assert.match(errorsOf(await run(ctxFor(await build(twice)))).join('\n'), /plugin "alpha" has 2 lines/);
  });

  it('fails an executable script that only the catch-all rule matches', async () => {
    const noScripts = GOOD.replace('/scripts/ @owner\n', '');
    const errors = errorsOf(await run(ctxFor(await build(noScripts))));
    assert.deepEqual(errors, ['scripts/ci/check-x.mjs: executable script not covered by a CODEOWNERS rule']);
    const noGithub = GOOD.replace('/.github/ @owner\n', '');
    assert.deepEqual(errorsOf(await run(ctxFor(await build(noGithub)))), ['.github/run.sh: executable script not covered by a CODEOWNERS rule']);
  });

  it('covers a skill script through a plugin line and flags a rule without an owner', async () => {
    const root = await build(GOOD, { 'plugins/beta/skills/s/scripts/run.py': '# py\n' });
    assert.deepEqual(errorsOf(await run(ctxFor(root))), []);
    const ownerless = await build(`${GOOD}/docs/\n`);
    assert.match(errorsOf(await run(ctxFor(ownerless))).join('\n'), /CODEOWNERS:7: rule "\/docs\/" has no owner/);
  });
});
