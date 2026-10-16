#!/usr/bin/env bash
# G4 helper: builds the dependency-resolution marketplace as a git repo with
# tags dep--v1.0.0 and dep--v2.0.0 (HEAD at 2.0.0) in a fresh temp dir, prints
# its path. Commits and tags: run by the orchestrator, never by an implementer.
# Procedure for the rest: see remote-fixture/README.md.
set -eu
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIX="$HERE/remote-fixture"
OUT="${1:-$(mktemp -d)}"
export GIT_AUTHOR_NAME=fixture GIT_AUTHOR_EMAIL=fixture@example.invalid
export GIT_COMMITTER_NAME=fixture GIT_COMMITTER_EMAIL=fixture@example.invalid
mkdir -p "$OUT"
cp -R "$FIX/.claude-plugin" "$FIX/plugins" "$OUT/"
git -C "$OUT" init -q -b main
sed -i.bak 's/"version": "2.0.0"/"version": "1.0.0"/' "$OUT/plugins/dep/.claude-plugin/plugin.json"
rm -f "$OUT/plugins/dep/.claude-plugin/plugin.json.bak"
git -C "$OUT" add -A && git -C "$OUT" commit -q -m "dep 1.0.0"
git -C "$OUT" tag dep--v1.0.0
cp "$FIX/plugins/dep/.claude-plugin/plugin.json" "$OUT/plugins/dep/.claude-plugin/plugin.json"
git -C "$OUT" add -A && git -C "$OUT" commit -q -m "dep 2.0.0"
git -C "$OUT" tag dep--v2.0.0
echo "$OUT"
