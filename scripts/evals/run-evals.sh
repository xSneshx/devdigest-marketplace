#!/usr/bin/env bash
# Wraps `claude plugin eval` (CLI 2.1.296 flags: --runs, --max-cost-usd, --json, --output-dir, --trust-plugin).
# Usage: run-evals.sh <plugin|all> [--runs 3] [--max-cost-usd <cap>] [--jobs n] [--include-expensive]
# Cases tagged `expensive` in their prompt.md are skipped unless --include-expensive is given.
# The remaining budget is passed as --max-cost-usd to every case invocation (the CLI enforces it per
# case); no case is started when less than $0.30 is left, which the summary reports as exit 2.
# Model-backed: costs money. Run only at gate G7. Never prints credentials.
#
# Tool grants: gated tools (Bash, Write, Edit, MultiEdit, NotebookEdit, WebFetch) are NOT
# allowed by listing them in a case's `allowed_tools`; the operator must pass --allow-tools.
# For each case this script reads its prompt.md, takes the gated
# tools named in `allowed_tools`, and passes exactly that set as `--allow-tools` (none if empty).
# The CLI runs against the `plugins/` directory (its containment root), so cases can load sibling
# dependency plugins; one invocation per case (`--case <exact name>`; case names are unique across
# plugins), per-case output under evals-out/<date>/<plugin|all>/<case>/. The summary maps cases to
# plugins via case.dir and exits 2 on zero cases, a case-count mismatch or rejected case files.
# Each case's `plugins:` frontmatter lists the plugin plus its dependency dirs, because the eval
# session loads only those plugins. Plugin agents are dispatched via `Agent` (read-only, no grant).
set -euo pipefail

usage() { echo "usage: run-evals.sh <plugin|all> [--runs N] [--max-cost-usd USD] [--ablation with-without|none] [--jobs N] [--include-expensive]" >&2; exit 64; }
[ $# -ge 1 ] || usage
target="$1"; shift
runs=3; cap=""; jobs=1; ablation="with-without"; include_expensive=0; MIN_CASE_USD=0.3
while [ $# -gt 0 ]; do
  case "$1" in
    --runs) runs="${2:?}"; shift 2 ;;
    --max-cost-usd) cap="${2:?}"; shift 2 ;;
    --ablation) ablation="${2:?}"; shift 2 ;;
    --jobs) jobs="${2:?}"; shift 2 ;;
    --include-expensive) include_expensive=1; shift ;;
    *) usage ;;
  esac
done
case "$ablation" in with-without|none) ;; *) echo "--ablation must be with-without|none" >&2; exit 64 ;; esac
case "$runs$jobs" in *[!0-9]*) echo "--runs/--jobs must be integers" >&2; exit 64 ;; esac
if [ -n "$cap" ]; then
  case "$cap" in ''|*[!0-9.]*) echo "--max-cost-usd must be a number" >&2; exit 64 ;; esac
else
  echo "run-evals: --max-cost-usd is required (hard cost cap)" >&2; exit 64
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
date_dir="$root/evals-out/$(date +%Y-%m-%d)"
label="$target"
out="$date_dir/$label"
mkdir -p "$out"

gated_union() { # print the gated tools of one prompt.md, space separated
  awk 'NR>1&&/^---$/{exit} /^allowed_tools:/' "$1" \
    | grep -o -E '\b(Bash|Write|Edit|MultiEdit|NotebookEdit|WebFetch)\b' | sort -u | tr '\n' ' ' || true
}

if [ "$target" = "all" ]; then
  plugins=()
  for d in "$root"/plugins/*/; do [ -d "${d}evals" ] && plugins+=("$(basename "$d")"); done
else
  plugins=("$target")
fi
[ "${#plugins[@]}" -gt 0 ] || { echo "run-evals: no plugin with an evals/ dir" >&2; exit 66; }

cases=()   # "<plugin>/<case>"
for p in "${plugins[@]}"; do
  [ -d "$root/plugins/$p/evals" ] || { echo "run-evals: unknown plugin $p (or no evals/)" >&2; exit 66; }
  for c in "$root/plugins/$p/evals"/*/prompt.md; do
    [ -f "$c" ] || continue
    if [ "$include_expensive" -eq 0 ] && awk 'NR>1&&/^---$/{exit} /^tags:.*expensive/{f=1} END{exit !f}' "$c"; then
      echo "run-evals: skipping expensive case $(basename "$(dirname "$c")") (use --include-expensive)" >&2; continue
    fi
    cases+=("$p/$(basename "$(dirname "$c")")")
  done
done
[ "${#cases[@]}" -gt 0 ] || { echo "run-evals: no eval cases found" >&2; exit 66; }
dups="$(printf '%s\n' "${cases[@]}" | sed 's#.*/##' | sort | uniq -d)"
[ -z "$dups" ] || { echo "run-evals: case names must be unique across plugins: $dups" >&2; exit 66; }

# The cap is a total: each case gets what is left; spend is read back from each report.
remaining="$cap"
reports=(); logs=()
for pc in "${cases[@]}"; do
  p="${pc%%/*}"; c="${pc##*/}"
  if node -e 'process.exit(Number(process.argv[1]) < Number(process.argv[2]) ? 0 : 1)' "$remaining" "$MIN_CASE_USD"; then
    echo "run-evals: budget left ($remaining USD) is below the $MIN_CASE_USD USD per-case minimum; not starting $pc or the cases after it" >&2
    break
  fi
  cdir="$out/$c"; mkdir -p "$cdir"
  # shellcheck disable=SC2207
  grants=($(gated_union "$root/plugins/$p/evals/$c/prompt.md"))
  allow=(); [ "${#grants[@]}" -gt 0 ] && allow=(--allow-tools "${grants[@]}")
  set +e
  # --case is matched against case names; the target stays before --allow-tools (a list option, kept last).
  claude plugin eval "$root/plugins" --case "$c" --runs "$runs" --max-cost-usd "$remaining" -j "$jobs" \
    --ablation "$ablation" --trust-plugin --no-publish --json "$cdir/report.json" --output-dir "$cdir" \
    --report "$cdir/report.html" "${allow[@]+"${allow[@]}"}" >"$cdir/stdout.log" 2>&1
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || echo "run-evals: $pc exited $rc" >&2
  if [ -f "$cdir/report.json" ]; then
    reports+=("$cdir/report.json")
    spent="$(node "$root/scripts/evals/summarize.mjs" "$cdir/report.json" --print-cost 2>/dev/null || echo 0)"
    remaining="$(node -e 'console.log(Math.max(0,Number(process.argv[1])-Number(process.argv[2])))' "$remaining" "$spent")"
  fi
  logs+=("$cdir/stdout.log")
  # Stop once the cap is exhausted instead of launching more runs.
  [ "$rc" -ne 2 ] || break
done

status=0
if [ "${#reports[@]}" -eq 0 ]; then
  echo "run-evals: no report was produced (all cases rejected or the CLI failed)" >&2
  exit 2
fi
node "$root/scripts/evals/summarize.mjs" "${reports[@]}" --cap "$cap" --plugin "$label" \
  --expect-cases "${#cases[@]}" --evidence "$out/evidence.md" --stdout "${logs[@]}" || status=$?
exit "$status"
