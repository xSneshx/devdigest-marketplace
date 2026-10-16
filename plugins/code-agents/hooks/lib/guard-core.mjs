// Shared guard runner. A plugin's guard.mjs supplies the exact agent identifiers
// it guards (identifier -> profile name) and a loader for profile modules;
// everything else is decided here:
//   - no identifier, or one that is not an exact key of `guarded` -> allow, with
//     no side effects (AC-29, AC-30);
//   - a guarded identifier -> its profile decides; any evaluation failure
//     (crash, malformed input, exhausted time budget) refuses (AC-58);
//   - malformed input is matched against the guarded identifiers as raw text.
// Exit 2 blocks the tool call and feeds stderr back to the agent.
// Only hook-io is loaded up front: the rest loads for guarded calls, because
// every module costs start-up time on every tool call.
import { Refusal, readRaw, parseInput, projectDir, resolveInside, rawAgentMatch, stderrLine }
  from './hook-io.mjs';

const isInputsFile = (rel, inputsFile) => rel.toLowerCase() === inputsFile.toLowerCase();
const isGitInternal = (rel) => /^\.git(\/|$)/i.test(rel);

const FILE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

export async function runGuard({ name, guarded, loadProfile, budgetMs = 5000 }) {
  const ids = Object.keys(guarded);
  const started = Date.now();
  const raw = readRaw();
  let identity = null;

  const exit = (code) => process.exit(code);
  const refuse = (reason) => {
    stderrLine(`${name}: ${reason}`);
    exit(2);
  };
  // Evaluation failed: refuse if the call is (or may be) from a guarded agent.
  const failClosed = (why) => {
    const id = identity ?? rawAgentMatch(raw, ids);
    if (id) refuse(`Blocked: the guard could not verify this call (${why}). Guarded agent "${id}" ` +
      'is refused when its guard cannot evaluate; report this instead of retrying.');
    exit(0);
  };

  process.on('uncaughtException', (e) => failClosed(e?.message || 'uncaught exception'));
  process.on('unhandledRejection', (e) => failClosed(e?.message || 'unhandled rejection'));
  // Backstop for a stuck import or scan; the project scan also has its own deadline.
  setTimeout(() => failClosed('time budget exceeded'), budgetMs).unref();

  try {
    if (process.env.PLUGIN_GUARD_TEST_CRASH === '1') throw new Error('forced crash (test flag)');

    const input = parseInput(raw);
    if (!input) return failClosed('malformed hook input');

    const agent = input.agent_type;
    if (typeof agent !== 'string' || !Object.hasOwn(guarded, agent)) return exit(0);
    identity = agent;

    const tool = String(input.tool_name || '');
    if (!tool) return refuse('Blocked: no tool_name in the hook input.');
    const ti = input.tool_input && typeof input.tool_input === 'object' ? input.tool_input : {};
    const root = projectDir(input);

    const [{ loadInputs, INPUTS_FILE }, profile] = await Promise.all([
      import('./project-inputs.mjs'),
      loadProfile(guarded[agent]),
    ]);
    const ctx = { tool, input, root, agent, deadline: started + budgetMs - 500, inputs: loadInputs(root) };

    if (FILE_TOOLS.has(tool)) {
      const p = ti.file_path || ti.notebook_path;
      if (!p) return refuse('Blocked: no file path in the tool call.');
      const { abs, rel, real } = resolveInside(root, p);
      // Match the lexical path and the symlink-resolved one, case-insensitively.
      const paths = [...new Set([rel, real])];
      for (const r of paths) {
        if (isInputsFile(r, INPUTS_FILE)) {
          return refuse(`Blocked: ${rel} is guard configuration; agents do not edit it.`);
        }
        if (isGitInternal(r)) {
          return refuse(`Blocked: ${rel} is git internals; agents do not edit them.`);
        }
      }
      for (const r of paths) {
        const why = profile.files ? profile.files(ctx, r, abs) : null;
        if (why) return refuse(`Blocked: ${why}`);
      }
      return exit(0);
    }

    if (tool === 'Bash') {
      const command = String(ti.command || '');
      // Every guarded profile: a command that is not a plain read may not name the
      // guard configuration or git internals, whatever its cwd or spelling.
      const { nonReadNaming } = await import('./bash-parse.mjs');
      // `.claude` itself (rm -rf .claude) or a glob that could expand to the inputs
      // file counts as naming it; `git add .claude` only stages and is exempt.
      const named = nonReadNaming(command, root,
        (r, plain) => isInputsFile(r, INPUTS_FILE) || isGitInternal(r) ||
          (r.toLowerCase() === '.claude' && !/^git(\s+-C\s+\S+)?\s+add\b/.test(plain)),
        ['.claude', INPUTS_FILE, '.git']);
      if (named) {
        return refuse(`Blocked: this command names ${named.rel}, which is guard configuration or ` +
          `git internals, and is not a plain read:\n  ${named.plain}`);
      }
      const why = profile.bash ? profile.bash(ctx, command) : null;
      if (why) return refuse(`Blocked: ${why}`);
      return exit(0);
    }

    return exit(0);
  } catch (e) {
    if (e instanceof Refusal) return refuse(`Blocked: ${e.message}`);
    return failClosed(e?.message || 'unknown error');
  }
}
