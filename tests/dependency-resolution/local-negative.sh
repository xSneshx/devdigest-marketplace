#!/usr/bin/env bash
# AC-73/AC-74 dependency-range test on CLI >= 2.1.296 (tag-resolved deps).
# Asserts: app-obj (^1.0.0) is enabled with dep resolved by tag (version 1.0.0*,
# folderVersion 2.0.0); app-obj-miss (^3.0.0, no tag) has an errorDetails item of type
# dependency-version-unsatisfied (the `enabled` flag is only the user setting). Records, without asserting, what the string-form apps got.
# Creates git commits and tags inside a mktemp -d repo: run by the orchestrator
# or CI only, never by an implementer. Needs the `claude` CLI, no model calls.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIX="$HERE/remote-fixture"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
MP="$WORK/testmp"
export GIT_AUTHOR_NAME=fixture GIT_AUTHOR_EMAIL=fixture@example.invalid
export GIT_COMMITTER_NAME=fixture GIT_COMMITTER_EMAIL=fixture@example.invalid

mkdir -p "$MP"
cp -R "$FIX/.claude-plugin" "$FIX/plugins" "$MP/"
git -C "$MP" init -q
# dep at 1.0.0 first, tagged
sed -i.bak 's/"version": "2.0.0"/"version": "1.0.0"/' "$MP/plugins/dep/.claude-plugin/plugin.json"
rm -f "$MP/plugins/dep/.claude-plugin/plugin.json.bak"
git -C "$MP" add -A && git -C "$MP" commit -q -m "dep 1.0.0"
git -C "$MP" tag dep--v1.0.0
# then dep 2.0.0 at HEAD, tagged
cp "$FIX/plugins/dep/.claude-plugin/plugin.json" "$MP/plugins/dep/.claude-plugin/plugin.json"
git -C "$MP" add -A && git -C "$MP" commit -q -m "dep 2.0.0"
git -C "$MP" tag dep--v2.0.0

run_case() { # $1 = app plugin; prints captured output to stdout
  local app="$1" cfg="$WORK/cfg-$1"
  mkdir -p "$cfg"
  {
    CLAUDE_CONFIG_DIR="$cfg" claude plugin marketplace add "$MP" 2>&1
    CLAUDE_CONFIG_DIR="$cfg" claude plugin install "$app@testmp" 2>&1
    echo "--- list"
    CLAUDE_CONFIG_DIR="$cfg" claude plugin list --json 2>&1
  }
}
# $1 = captured output, $2 = plugin id, $3 = field (enabled|version|folderVersion);
# prints the value, or "absent" when the plugin is not in the list.
field() {
  printf '%s\n' "$1" | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const i=s.indexOf("--- list");const m=s.slice(i).match(/(\[[\s\S]*\])\s*$/);
      if(!m){console.log("unparsable");return;}
      const p=JSON.parse(m[1]).find(x=>x.id===process.argv[1]);
      const v=p?p[process.argv[2]]:undefined;
      console.log(!p?"absent":Array.isArray(v)?JSON.stringify(v):v===undefined?"none":String(v));});' "$2" "$3"
}
# $1 = captured output, $2 = plugin id; prints the dependency-version-unsatisfied
# count among the entry errorDetails ("absent" when the plugin is not listed).
unsat() {
  printf '%s\n' "$1" | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const i=s.indexOf("--- list");const m=s.slice(i).match(/(\[[\s\S]*\])\s*$/);
      if(!m){console.log("unparsable");return;}
      const p=JSON.parse(m[1]).find(x=>x.id===process.argv[1]);
      if(!p){console.log("absent");return;}
      console.log((p.errorDetails||[]).filter(e=>e.type==="dependency-version-unsatisfied").length);});' "$2"
}
# first line of the output that mentions the dependency range, for the record
message() { printf '%s\n' "$1" | sed '/^--- list/,$d' | grep -Ei 'requires|satisf|no git tag|dep@testmp' | head -3 | tr '\n' ' ' | sed 's/"/\\"/g'; }
q() { printf '"%s"' "$1"; }
# JSON value: arrays pass through, anything else (none/absent) is quoted
jv() { case "$1" in \[*) printf '%s' "$1" ;; *) q "$1" ;; esac; }

OBJ="$(run_case app-obj)"
MISS="$(run_case app-obj-miss)"
STR="$(run_case app-str)"
STRMISS="$(run_case app-str-miss)"

obj_err="$(field "$OBJ" app-obj@testmp errorDetails)"
miss_unsat="$(unsat "$MISS" app-obj-miss@testmp)"
miss_errors="$(field "$MISS" app-obj-miss@testmp errors)"
str_err="$(field "$STR" app-str@testmp errors)"; str_det="$(field "$STR" app-str@testmp errorDetails)"
strmiss_err="$(field "$STRMISS" app-str-miss@testmp errors)"; strmiss_det="$(field "$STRMISS" app-str-miss@testmp errorDetails)"
obj_enabled="$(field "$OBJ" app-obj@testmp enabled)"
obj_dep_ver="$(field "$OBJ" dep@testmp version)"
obj_dep_folder="$(field "$OBJ" dep@testmp folderVersion)"
miss_enabled="$(field "$MISS" app-obj-miss@testmp enabled)"
miss_dep="$(field "$MISS" dep@testmp version)"
str_enabled="$(field "$STR" app-str@testmp enabled)"
str_dep_ver="$(field "$STR" dep@testmp version)"
str_dep_folder="$(field "$STR" dep@testmp folderVersion)"
strmiss_enabled="$(field "$STRMISS" app-str-miss@testmp enabled)"
strmiss_dep="$(field "$STRMISS" dep@testmp version)"

pos=false
{ [ "$obj_enabled" = true ] && [[ "$obj_dep_ver" == 1.0.0* ]] && [ "$obj_dep_folder" = 2.0.0 ] && [ "$obj_err" = none ]; } && pos=true
neg=false
case "$miss_unsat" in absent|unparsable|0) ;; *) neg=true ;; esac
strign=false
{ [ "$str_err" = none ] && [ "$str_det" = none ] && [ "$strmiss_err" = none ] && [ "$strmiss_det" = none ] \
  && [ "$strmiss_enabled" = true ] && [ "$strmiss_dep" = "$str_dep_folder" ]; } && strign=true
pass=false
{ $pos && $neg; } && pass=true

printf '{"test":"AC-73/AC-74 dependency ranges","cli":%s,' "$(q "$(claude --version 2>&1 | head -1)")"
printf '"positive":{"pass":%s,"appObjEnabled":%s,"depVersion":%s,"depFolderVersion":%s},' "$pos" "$(q "$obj_enabled")" "$(q "$obj_dep_ver")" "$(q "$obj_dep_folder")"
printf '"negativeAC74":{"pass":%s,"appObjMissEnabled":%s,"unsatisfiedErrorDetails":%s,"errors":%s,"depVersion":%s,"message":"%s"},' "$neg" "$(q "$miss_enabled")" "$(q "$miss_unsat")" "$(jv "$miss_errors")" "$(q "$miss_dep")" "$(message "$MISS")"
printf '"stringForm":{"appStrEnabled":%s,"errors":%s,"errorDetails":%s,"depVersion":%s,"depFolderVersion":%s,"message":"%s"},' "$(q "$str_enabled")" "$(jv "$str_err")" "$(jv "$str_det")" "$(q "$str_dep_ver")" "$(q "$str_dep_folder")" "$(message "$STR")"
printf '"stringFormMiss":{"appStrMissEnabled":%s,"errors":%s,"errorDetails":%s,"depVersion":%s,"message":"%s"},' "$(q "$strmiss_enabled")" "$(jv "$strmiss_err")" "$(jv "$strmiss_det")" "$(q "$strmiss_dep")" "$(message "$STRMISS")"
printf '"stringRangeIgnored":%s,"pass":%s}\n' "$strign" "$pass"
if ! $pass; then
  for n in OBJ MISS STR STRMISS; do echo "--- $n output" >&2; printf '%s\n' "${!n}" >&2; done
  exit 1
fi
