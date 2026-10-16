#!/usr/bin/env bash
# Live probes for AC-31 (cross-plugin skill preload), AC-33/36 (plugin hook sees
# agent_type and can deny) and AC-66 (command/skill name collision).
# MAKES MODEL CALLS - run only at gate G2. Nothing is installed (--plugin-dir only).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAX_BUDGET="${PROBE_MAX_BUDGET_USD:-1}"

# Scratch project outside any repo, so no project hooks or settings load.
FIXTURE="$(mktemp -d)"
OUT="${PROBE_OUT:-$(mktemp -d)}"
mkdir -p "$OUT"
export PROBE_OUT="$OUT"

PLUGINS=(--plugin-dir "$HERE/probe-skills" --plugin-dir "$HERE/probe-agents")

cd "$FIXTURE"

# Call 1: delegate to the probe agent.
claude -p "Use the probe-agents:probe-writer agent. Ask it to (a) report whether the probe-skill sentinel is in its context, (b) create allowed.txt containing 'ok', (c) create forbidden.txt containing 'no'. Print its reply verbatim." \
  "${PLUGINS[@]}" \
  --debug --debug-file "$OUT/agent-debug.log" \
  --max-budget-usd "$MAX_BUDGET" \
  --permission-mode acceptEdits \
  >"$OUT/agent-reply.txt" 2>"$OUT/agent-stderr.txt" || echo "call 1 exited non-zero (see agent-stderr.txt)" >&2

# Call 2: invoke the colliding command/skill name.
claude -p "/probe-agents:collide" \
  "${PLUGINS[@]}" \
  --debug --debug-file "$OUT/collide-debug.log" \
  --max-budget-usd "$MAX_BUDGET" \
  >"$OUT/collide-reply.txt" 2>"$OUT/collide-stderr.txt" || echo "call 2 exited non-zero (see collide-stderr.txt)" >&2

node "$HERE/summarize.mjs" "$OUT" "$FIXTURE"
echo "artifacts: $OUT (fixture: $FIXTURE)" >&2
