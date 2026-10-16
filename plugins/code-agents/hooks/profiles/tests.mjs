// Profile for code-agents:test-writer (AC-68, AC-28). Writes only test files and
// test helpers; Bash is a default-deny read whitelist plus the project's own
// check commands (discovered per AC-69 or declared per AC-70).
import { basename } from 'node:path';
import { readOnlyBashVerdict } from '../lib/bash-parse.mjs';
import { matchesAny } from '../lib/project-inputs.mjs';
import { buildProjectMap, effectiveChecks, isTestFile, TEST_DIR_SEGMENTS } from '../lib/project-map.mjs';
import { isLockfile, protectedReason } from './common.mjs';

const MANIFEST = /^(package\.json|tsconfig([.-][\w.-]*)?\.json|jsconfig\.json|pyproject\.toml|setup\.(py|cfg)|requirements[\w.-]*\.txt|Pipfile|Cargo\.toml|go\.mod|Gemfile|composer\.json|pom\.xml|build\.gradle(\.kts)?|Makefile)$/;
const RUNNER_CONFIG = /^((vitest|vitest\.workspace|jest|playwright|cypress|karma|mocha|ava)\.config\.[\w.]+|\.mocharc(\.[\w.]+)?|jest\.setup\.[\w.]+|pytest\.ini|tox\.ini|setup[\w.-]*\.(ts|tsx|js|jsx|mjs|cjs|mts|cts))$/;
const NEVER_DIR = /(^|\/)(node_modules|\.claude)\//;

const underConventionalTestDir = (rel) => rel.split('/').slice(0, -1).some((s) => TEST_DIR_SEGMENTS.has(s));

export const tests = {
  files(ctx, rel) {
    const name = basename(rel);
    if (isLockfile(rel) || MANIFEST.test(name) || RUNNER_CONFIG.test(name) || NEVER_DIR.test(rel)) {
      return `${rel} is test infrastructure, a manifest, a lockfile or tool configuration. ` +
        'test-writer writes test files and test helpers only; report the needed change instead.';
    }
    const prot = protectedReason(ctx, rel);
    if (prot) return prot;

    const declared = ctx.inputs.testLocations;
    if (declared.length) {
      if (matchesAny(rel, declared)) return null;
      return `${rel} is outside the test locations declared in ${ctx.inputs.file} ` +
        `(${declared.join(', ')}; explicit input). Declared locations are authoritative.`;
    }
    if (isTestFile(rel) || underConventionalTestDir(rel)) return null;
    const discovered = buildProjectMap(ctx.root, { deadline: ctx.deadline }).testDirs;
    if (discovered.some((d) => rel === d || rel.startsWith(d + '/'))) return null;
    return `${rel} is not a test file or a helper in a test location. test-writer may write ` +
      '*.test.* / *.spec.* files and helpers under test/, tests/, __tests__/' +
      (discovered.length ? ` or the discovered test directories (${discovered.join(', ')})` : '') +
      '. If a test needs a production change, stop and report BLOCKED with the exact need.';
  },

  bash(ctx, cmd) {
    const { checks, explicit } = effectiveChecks(buildProjectMap(ctx.root, { deadline: ctx.deadline, scanTests: false }), ctx.inputs);
    return readOnlyBashVerdict(cmd, { root: ctx.root, checks, explicit });
  },
};
