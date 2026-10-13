// Bash policy shared by the sdd-engineering profiles: default-deny, plain reads
// plus the project's own check commands (discovered per AC-69 or declared per
// AC-70). Same whitelist for every profile (AC-28).
import { readOnlyBashVerdict } from '../lib/bash-parse.mjs';
import { buildProjectMap, effectiveChecks } from '../lib/project-map.mjs';

export function readOnlyBash(ctx, cmd) {
  const map = buildProjectMap(ctx.root, { deadline: ctx.deadline, scanTests: false });
  const { checks, explicit } = effectiveChecks(map, ctx.inputs);
  return readOnlyBashVerdict(cmd, { root: ctx.root, checks, explicit });
}
