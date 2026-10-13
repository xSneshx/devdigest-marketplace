import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { run } from '../../../scripts/ci/check-namespacing.mjs';
import { cleanup, ctxFor, errorsOf, makeMarketplace } from '../core/helpers.mjs';

const roots = [];
async function build(consumerFiles) {
  const root = await makeMarketplace([
    { name: 'tools-plugin', files: { 'agents/scout.md': '---\nname: scout\n---\nbody\n', 'skills/mapping/SKILL.md': '---\nname: mapping\ndescription: x\n---\nbody\n' } },
    { name: 'consumer', files: consumerFiles },
  ]);
  roots.push(root);
  return root;
}
after(() => Promise.all(roots.map(cleanup)));

describe('check-namespacing', () => {
  it('accepts prefixed references, own components and plain prose', async () => {
    const root = await build({
      'agents/worker.md': [
        '---', 'name: worker', 'tools: Read, Agent(tools-plugin:scout), Agent(helper)', 'skills:', '  - tools-plugin:mapping', '  - local-skill', '---',
        'Use `tools-plugin:scout` and `/tools-plugin:mapping`. Say scout in prose. Own `worker` is fine.', '',
      ].join('\n'),
      'agents/helper.md': '---\nname: helper\n---\nbody\n',
    });
    assert.deepEqual(errorsOf(await run(ctxFor(root))), []);
  });

  it('flags a bare skills: item, Agent() item and backticked name that belong to another plugin', async () => {
    const root = await build({
      'agents/worker.md': [
        '---', 'name: worker', 'tools: Read, Agent(scout)', 'skills:', '  - mapping', '---',
        'Hand off to `scout`, then follow `/mapping`.', '',
      ].join('\n'),
    });
    const errors = errorsOf(await run(ctxFor(root)));
    const text = errors.join('\n');
    assert.match(text, /agents\/worker\.md:5: frontmatter skill "mapping" belongs to plugin "tools-plugin"; write "tools-plugin:mapping"/);
    assert.match(text, /agents\/worker\.md:3: Agent\(\) entry "scout" belongs to plugin "tools-plugin"/);
    assert.match(text, /agents\/worker\.md:7: backticked component "scout"/);
    assert.match(text, /agents\/worker\.md:7: backticked component "\/mapping"/);
  });

  it('ignores a name the plugin also owns', async () => {
    const root = await build({
      'agents/scout.md': '---\nname: scout\n---\nSee `scout`.\n',
    });
    assert.deepEqual(errorsOf(await run(ctxFor(root))), []);
  });
});
