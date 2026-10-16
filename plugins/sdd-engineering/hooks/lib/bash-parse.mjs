// Quote-aware Bash splitting and the default-deny read whitelist (AC-28).
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { existsSync, realpathSync } from 'node:fs';

// Split a command line into simple commands on ; & && | || and newlines that sit
// outside quotes. For each command keep the text with quotes removed (to match
// against a whitelist) and the text with quoted spans blanked (to find shell
// operators that would really run).
export function splitCommands(cmd) {
  const out = [];
  let plain = '';
  let bare = '';
  let quote = null;
  const push = () => {
    if (plain.trim()) out.push({ plain: plain.trim(), bare: bare.trim() });
    plain = '';
    bare = '';
  };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) {
      if (c === quote) { quote = null; continue; }
      if (c === '\\' && quote === '"' && i + 1 < cmd.length) { plain += cmd[++i]; bare += '_'; continue; }
      plain += c;
      bare += c === ' ' ? ' ' : '_';
      continue;
    }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '\\' && i + 1 < cmd.length) { plain += cmd[++i]; bare += '_'; continue; }
    if (c === ';' || c === '\n' || c === '|' || c === '&') {
      // keep fd duplications like 2>&1 / >&2 inside the current command
      if (c === '&' && /[<>]$/.test(bare)) { plain += c; bare += c; continue; }
      push();
      continue;
    }
    plain += c;
    bare += c;
  }
  if (quote) throw new Error('unbalanced quotes');
  push();
  return out;
}

// Redirections that cannot create or change a file.
const SAFE_REDIRECT = /\d?>&\d|\d?>\s*\/dev\/null/g;

// Remove leading env assignments (FOO=1 cmd) and harmless redirections.
export const stripEnv = (s) => s.replace(/^(\w+=\S*\s+)+/, '')
  .replace(/\s\d?>&\d|\s\d?>\s*\/dev\/null/g, '').trim();

// Env assignments that may precede a command in a read-only profile. Any other
// leading VAR=value is refused: NODE_OPTIONS, GIT_EXTERNAL_DIFF, LD_PRELOAD,
// PAGER, GIT_SSH_COMMAND, ... all make a whitelisted command run other code.
// Only display/locale/time-zone/CI-flag variables are harmless.
export const ENV_ALLOW = new Set(['CI', 'NO_COLOR', 'FORCE_COLOR', 'TZ', 'LANG', 'LC_ALL']);

export const leadingEnvNames = (s) => {
  const m = s.match(/^(?:\w+=\S*\s+)+/);
  return m ? m[0].trim().split(/\s+/).map((t) => t.split('=')[0]) : [];
};

const READ_CMD = /^(cat|head|tail|wc|ls|stat|file|diff|sort|grep|rg|jq|echo|printf|pwd|which|test|\[|true|basename|dirname|realpath)(\s|$)/;
const FIND_CMD = /^find(\s|$)/;
const GIT_READ = /^git(\s+-C\s+\S+)?\s+(diff|show|status|log|blame|ls-files|grep|merge-base|rev-parse|branch\s+--show-current)(\s|$)/;
const CD = /^cd(\s|$)/;
// `date` with only a +FORMAT argument reads the clock; any other argument could set it.
const DATE_READ = /^date(\s+\+\S+)?$/;

// Flags that turn a read or a check into a write (matched on the unquoted text,
// so a quoted search pattern such as grep "--fix" is not mistaken for a flag).
const WRITING_FLAGS = /(^|\s)(--fix|--write|--outputFile|--output|--coverage|--pre)(\s|=|$)/;
const FIND_WRITING = /(^|\s)(-delete|-exec|-execdir|-ok|-okdir|-fprint\w*|-fls)(\s|$)/;
const SORT_WRITING = /(^|\s)-o/;
const VITEST_WRITING = /(^|\s)(-u|--update)(\s|$)/;

export const READ_SET_TEXT = 'plain reads (cat, head, tail, wc, ls, stat, file, diff, sort, grep, rg, jq, ' +
  'echo, printf, pwd, which, test, find without -exec/-delete, `git diff|show|status|log|blame|ls-files|grep|' +
  'merge-base|rev-parse`, `date +FORMAT`)';

const describeChecks = (checks, explicit) => {
  const list = checks.flatMap((c) => [...c.bare, ...c.prefixed]);
  if (!list.length) {
    return 'the project defines no test/typecheck/lint/check script, so no check command is allowed';
  }
  const shown = list.slice(0, 24).map((c) => `\`${c}\``).join(', ');
  return `${explicit ? 'the check commands declared in .claude/project-inputs.json (explicit input)'
    : 'the check commands this project defines'}: ${shown}${list.length > 24 ? ', …' : ''}`;
};

// Does the (env-stripped) command run one of the project's check commands from
// shell directory `cwd` (project-relative, '' = root)?
const runsCheck = (c, cwd, checks) => checks.some((chk) => {
  const forms = cwd === chk.dir ? chk.bare : [];
  const pre = cwd === '' ? chk.prefixed : [];
  return [...forms, ...pre].some((f) => c === f || c.startsWith(f + ' '));
});

// Default-deny: returns null if every command is a plain read or a check the
// project defines, else a refusal message naming the allowed set.
export function readOnlyBashVerdict(cmd, opts) {
  const why = firstViolation(cmd, opts);
  if (!why) return null;
  return `${why}\nAllowed: ${READ_SET_TEXT}, and ${describeChecks(opts.checks, opts.explicit)}. ` +
    'Installs, dev servers, git writes and everything else are refused.';
}

function firstViolation(cmd, { root, checks }) {
  const commands = splitCommands(cmd);
  let cwd = '';
  for (const { plain, bare } of commands) {
    if (/\$\(|`/.test(bare) || /<\(|>\(/.test(bare)) {
      return `command substitution is not allowed: ${plain}`;
    }
    if (/<</.test(bare)) return `heredocs are not allowed: ${plain}`;
    if (/>/.test(bare.replace(SAFE_REDIRECT, ''))) {
      return `output redirection writes a file: ${plain}. Only 2>&1 and >/dev/null are allowed.`;
    }
    const badEnv = leadingEnvNames(plain).find((n) => !ENV_ALLOW.has(n));
    if (badEnv) {
      return `a leading environment assignment (${badEnv}=...) can change what a whitelisted command runs: ${plain}. ` +
        `Only ${[...ENV_ALLOW].join(', ')} may be set.`;
    }
    const c = stripEnv(plain);
    const flags = stripEnv(bare);
    if (WRITING_FLAGS.test(flags) ||
        (FIND_CMD.test(c) && FIND_WRITING.test(flags)) ||
        (/^sort(\s|$)/.test(c) && SORT_WRITING.test(flags)) ||
        (/\bvitest\b/.test(c) && VITEST_WRITING.test(flags))) {
      return `a flag in this command writes or executes: ${plain}`;
    }

    if (CD.test(c)) {
      const target = c.slice(2).trim();
      const abs = resolve(root, cwd, target || '.');
      const rel = relative(root, abs);
      if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
        return `cd leaves the project directory: ${plain}`;
      }
      cwd = rel.split(sep).join('/');
      continue;
    }
    if (READ_CMD.test(c) || FIND_CMD.test(c) || GIT_READ.test(c) || DATE_READ.test(c)) continue;
    if (runsCheck(c, cwd, checks)) continue;

    return `not on the read/check whitelist: ${plain}`;
  }
  return null;
}

// ---- cwd-aware path analysis (shared by the guard runner and the implementer) ----

// Simple commands with the effective directory (absolute) each one runs in,
// tracking `cd` across ; && || | and newlines. `cwd` is the project root until a
// `cd` changes it, and null when the target cannot be known (`cd $X`, `cd ~`, `cd -`).
export function segments(cmd, root) {
  let cwd = root;
  return splitCommands(cmd).map(({ plain, bare }) => {
    const seg = { plain, bare, cwd };
    const c = stripEnv(plain);
    if (CD.test(c)) {
      const target = c.slice(2).trim();
      if (cwd === null || /^[~$`-]/.test(target)) cwd = null;
      else cwd = resolve(cwd, target || root);
    }
    return seg;
  });
}

// Words of a simple command that may be paths: split on whitespace, drop leading
// redirection operators, and also look after `=` (`--out=path`).
export function pathWords(plain) {
  const out = [];
  for (const w of plain.split(/\s+/)) {
    const t = w.replace(/^\d*[<>]+&?/, '');
    if (!t || t.startsWith('-') && !t.includes('=')) continue;
    out.push(t);
    const eq = t.indexOf('=');
    if (eq > 0 && eq < t.length - 1) out.push(t.slice(eq + 1));
  }
  return out;
}

// Project-relative candidates for a word run from `cwd`: the lexical path and,
// when it exists, the symlink-resolved one. Words that leave the project give [].
export function pathCandidates(root, cwd, word, realRoot) {
  const abs = resolve(cwd ?? root, word);
  const rel = relative(root, abs);
  if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) return [];
  const out = [rel.split(sep).join('/')];
  try {
    if (existsSync(abs)) {
      const r = relative(realRoot, realpathSync(abs));
      if (!(r === '..' || r.startsWith('..' + sep) || isAbsolute(r))) {
        const posix = r.split(sep).join('/');
        if (posix !== out[0]) out.push(posix);
      }
    }
  } catch { /* unreadable: lexical match only */ }
  return out;
}

const PLAIN_READ = /^(cat|head|tail|less|grep|rg|wc|diff|file|stat|ls|find|sort|uniq|jq|git(\s+-C\s+\S+)?\s+(diff|show|status|log|blame|ls-files|grep|rev-parse))(\s|$)/;
const READ_WRITES = />|\s-(delete|exec|execdir|ok|okdir|fprint\w*|fls|o)(\s|=|$)/;
export const isPlainRead = (plain) => PLAIN_READ.test(stripEnv(plain)) && !READ_WRITES.test(plain);

// First command that is not a plain read and names a path for which
// `isTarget(projectRelativePath)` holds. Returns { plain, rel } or null.
// `isTarget(rel, plain)` also receives the command. `globTargets` are concrete
// paths a glob word could expand to (a glob that could match one is a naming).
export function nonReadNaming(cmd, root, isTarget, globTargets = []) {
  const realRoot = realpathSync(root);
  for (const seg of segments(cmd, root)) {
    if (isPlainRead(seg.plain)) continue;
    for (const w of pathWords(seg.plain)) {
      if (GLOB_CHARS.test(w)) {
        const abs = resolve(seg.cwd ?? root, w);
        const rel = relative(root, abs);
        if (!(rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel))) {
          const re = globRegex(rel.split(sep).join('/'));
          const t = globTargets.find((g) => re.test(g) && isTarget(g, seg.plain));
          if (t) return { plain: seg.plain, rel: t };
        }
      }
      for (const rel of pathCandidates(root, seg.cwd, w, realRoot)) {
        if (isTarget(rel, seg.plain)) return { plain: seg.plain, rel };
      }
    }
  }
  return null;
}

const GLOB_CHARS = /[*?[{]/;

// Shell glob -> RegExp over a project-relative path (case-insensitive). A
// component that starts with a glob character does not match a leading dot,
// like a shell without dotglob. Brace alternatives are expanded.
export function globRegex(rel) {
  const comp = (c) => {
    let out = /^[*?[]/.test(c) ? '(?!\\.)' : '';
    for (let i = 0; i < c.length; i++) {
      const ch = c[i];
      if (ch === '*') out += '[^/]*';
      else if (ch === '?') out += '[^/]';
      else if (ch === '[') {
        const end = c.indexOf(']', i + 2);
        if (end < 0) out += '\\[';
        else { out += '[' + c.slice(i + 1, end).replace(/^!/, '^').replace(/\\/g, '\\\\') + ']'; i = end; }
      } else if (ch === '{') {
        const end = c.indexOf('}', i);
        if (end < 0) out += '\\{';
        else { out += '(?:' + c.slice(i + 1, end).split(',').map((a) => a.replace(/[.+^$()|\\*?]/g, '\\$&')).join('|') + ')'; i = end; }
      } else out += ch.replace(/[.+^${}()|\\]/g, '\\$&');
    }
    return out;
  };
  return new RegExp(`^${rel.split('/').map(comp).join('/')}(/.*)?$`, 'i');
}

// Shell constructs that run a command list in a context `segments()` cannot follow:
// ( ) grouping, `sh|bash|zsh|dash|ksh -c`, and `eval`.
export const nestedShell = ({ plain, bare }) =>
  /[()]/.test(bare) ||
  /^(?:\w+=\S*\s+)*(?:(?:\S*\/)?(?:sh|bash|zsh|dash|ksh)\s+(?:\S+\s+)*?-\w*c\b|eval\b)/.test(plain);
