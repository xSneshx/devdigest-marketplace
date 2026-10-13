#!/usr/bin/env bash
# Wraps `claude plugin eval` (CLI 2.1.296 flags: --runs, --max-cost-usd, --json, --output-dir, --trust-plugin).
# Usage: run-evals.sh <plugin|all> [--runs 3] [--max-cost-usd <cap>] [--jobs n]
# Model-backed: costs money. Run only at gate G7. Never prints credentials.
set -euo pipefail

usage() { echo "usage: run-evals.sh <plugin|all> [--runs N] [--max-cost-usd USD] [--jobs N]" >&2; exit 64; }
[ $# -ge 1 ] || usage
target="$1"; shift
runs=3; cap=""; jobs=1
while [ $# -gt 0 ]; do
  case "$1" in
    --runs) runs="${2:?}"; shift 2 ;;
    --max-cost-usd) cap="${2:?}"; shift 2 ;;
    --jobs) jobs="${2:?}"; shift 2 ;;
    *) usage ;;
  esac
done
case "$runs$jobs" in *[!0-9]*) echo "--runs/--jobs must be integers" >&2; exit 64 ;; esac
if [ -n "$cap" ]; then
  case "$cap" in ''|*[!0-9.]*) echo "--max-cost-usd must be a number" >&2; exit 64 ;; esac
else
  echo "run-evals: --max-cost-usd is required (hard cost cap)" >&2; exit 64
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
date_dir="$root/evals-out/$(date +%Y-%m-%d)"
mkdir -p "$date_dir"

if [ "$target" = "all" ]; then
  plugins=()
  for d in "$root"/plugins/*/; do
    [ -d "${d}evals" ] && plugins+=("$(basename "$d")")
  done
else
  plugins=("$target")
fi
[ "${#plugins[@]}" -gt 0 ] || { echo "run-evals: no plugin with an evals/ dir" >&2; exit 66; }

# The cap is a total: split what is left across plugins; track spend from each report.
remaining="$cap"
status=0
for p in "${plugins[@]}"; do
  pdir="$root/plugins/$p"
  [ -d "$pdir" ] || { echo "run-evals: unknown plugin $p" >&2; exit 66; }
  out="$date_dir/$p"; mkdir -p "$out"
  set +e
  claude plugin eval "$pdir" --runs "$runs" --max-cost-usd "$remaining" -j "$jobs" \
    --trust-plugin --no-publish --json "$out/report.json" --output-dir "$out" \
    --report "$out/report.html" >"$out/stdout.log" 2>&1
  rc=$?
  set -e
  node "$root/scripts/evals/summarize.mjs" "$out/report.json" --cap "$remaining" --exit-code "$rc" \
    --plugin "$p" --evidence "$out/evidence.md" || status=1
  spent="$(node -e 'try{const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const s=require(process.argv[2]+"/scripts/evals/summarize.mjs");console.log(s.totalCost(r))}catch{console.log(0)}' "$out/report.json" "$root" 2>/dev/null || echo 0)"
  remaining="$(node -e 'console.log(Math.max(0,Number(process.argv[1])-Number(process.argv[2])))' "$remaining" "$spent")"
done
exit "$status"
