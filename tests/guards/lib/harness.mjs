// Test harness shared by the guard test suites (code-agents, sdd-engineering, lib).
// Synthesizes PreToolUse hook input and runs a plugin's guard as a child process.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, realpathSync, rmSync, mkdirSync, writeFileSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const MP_ROOT = join(here, '..', '..', '..');
export const FIXTURES = join(here, '..', 'fixtures');
export const pluginDir = (name) => join(MP_ROOT, 'plugins', name);

const temps = [];
export function cleanup() {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
}

export function tempDir(prefix = 'guard-') {
  const d = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  temps.push(d);
  return d;
}

// A throwaway copy of a fixture project, so a test may add files to it.
export function fixtureProject(name) {
  const dest = join(tempDir(), name);
  cpSync(join(FIXTURES, name), dest, { recursive: true });
  return dest;
}

export function writeFiles(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
}

export { symlinkSync, existsSync };

export const hookInput = ({ agent, tool, tool_input = {}, cwd }) => ({
  hook_event_name: 'PreToolUse',
  ...(agent === undefined ? {} : { agent_type: agent }),
  tool_name: tool,
  tool_input,
  ...(cwd ? { cwd } : {}),
});

export const bash = (agent, command, cwd) => hookInput({ agent, tool: 'Bash', tool_input: { command }, cwd });
export const write = (agent, file_path, cwd, tool = 'Write') =>
  hookInput({ agent, tool, tool_input: { file_path, content: 'x' }, cwd });

// Run `hooks/guard.mjs` directly (or `run-guard.sh` with via: 'sh').
export function runGuard(plugin, input, { project, env = {}, via = 'node', path } = {}) {
  const stdin = typeof input === 'string' ? input : JSON.stringify(input);
  const cmdEnv = { ...process.env, ...env };
  delete cmdEnv.PLUGIN_GUARD_TEST_CRASH;
  Object.assign(cmdEnv, env);
  if (project) cmdEnv.CLAUDE_PROJECT_DIR = project;
  if (path !== undefined) cmdEnv.PATH = path;
  const dir = join(pluginDir(plugin), 'hooks');
  const [bin, file] = via === 'sh' ? ['/bin/sh', join(dir, 'run-guard.sh')] : [process.execPath, join(dir, 'guard.mjs')];
  const r = spawnSync(bin, [file], { input: stdin, env: cmdEnv, encoding: 'utf8', timeout: 20000 });
  return { code: r.status, stderr: r.stderr, stdout: r.stdout };
}
