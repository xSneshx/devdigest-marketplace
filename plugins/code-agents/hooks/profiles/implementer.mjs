// Profile for code-agents:implementer (AC-27). Parallel implementers share one
// working tree, so a git command that records, publishes, rewrites or discards
// work is refused mechanically. Package-manager commands stay allowed: they are
// how lockfiles are meant to change.
import { realpathSync } from 'node:fs';
import { segments, pathWords, pathCandidates, nestedShell, stripEnv } from '../lib/bash-parse.mjs';
import { LOCKFILES, isLockfile, protectedReason } from './common.mjs';

// git [global options] <subcommand>: `-C dir` / `-c key=val` must not hide it.
const GIT_BLOCKED = /\bgit(?:\s+(?:-[Cc]\s+\S+|--?[\w-]+(?:=\S+)?))*\s+(commit|push|reset|restore|checkout|switch|stash|clean|rebase|merge|cherry-pick|revert|am|tag|branch\s+-[dDmM]|worktree\s+remove|update-ref)\b/;
const GH_BLOCKED = /\bgh\s+(pr\s+(create|merge|close|reopen|edit|review|comment|ready)|release\s+create|repo\s+(create|delete|edit))\b/;
const READ_ONLY = /^(cat|head|tail|less|grep|rg|wc|diff|file|stat|ls|find|sort|uniq|jq|git\s+(diff|show|status|log|blame|ls-files|grep))\b/;
const WRITES = />|\s-(delete|exec|execdir|fprint\w*)\b/;

// Package managers and build/test runners: their arguments are subcommands, not
// paths, so they stay allowed even when the shell directory is unknown.
const PM = /^(npm|pnpm|yarn|npx|bun|bunx|node|cargo|go|make|pytest|poetry|pip|pip3|uv|composer|bundle|dotnet|mvn|gradle)(\s|$)/;

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LOCKFILE_TEXT = new RegExp(`(^|[\\s/'"=])(${[...LOCKFILES].map(escape).join('|')})(?=$|[\\s'";|&)])`, 'i');

export const implementer = {
  files(ctx, rel) {
    if (isLockfile(rel)) {
      return `${rel} is a lockfile. Change the manifest and run the package manager's own install; never hand-edit a lockfile.`;
    }
    return protectedReason(ctx, rel);
  },

  bash(ctx, cmd) {
    const literals = ctx.inputs.protectedPaths.map((p) => ({
      p, text: p.replace(/^\.\//, '').replace(/\/+$/, '').split('*')[0].toLowerCase(),
    })).filter((x) => x.text);
    const realRoot = realpathSync(ctx.root);
    // `cd` is tracked across segments, so `cd src && sed -i x generated/v.ts` is
    // judged on the path it really touches (src/generated/v.ts).
    for (const seg of segments(cmd, ctx.root)) {
      const { plain, cwd } = seg;
      const git = plain.match(GIT_BLOCKED);
      if (git) {
        return `\`git ${git[1]}\` is not allowed for the implementer. It never commits, publishes or ` +
          'rewrites history and must not discard work: parallel implementers share this working ' +
          'tree. Leave the changes uncommitted and list them in your report.';
      }
      if (GH_BLOCKED.test(plain)) {
        return 'the implementer does not open, change or merge PRs. Report the next step instead.';
      }
      // A read-only prefix is not enough: `find … -delete` and `cat … > f` write.
      const reads = READ_ONLY.test(plain) && !WRITES.test(plain);
      if (reads) continue;
      // Not a plain read from here on. A subshell or nested shell hides `cd`.
      if (nestedShell(seg)) {
        return `this command uses a subshell, \`sh|bash|zsh -c\` or \`eval\` and is not a plain read:\n  ${plain}\n` +
          'The guard cannot follow the directory changes inside it. Run the commands directly, ' +
          'without grouping or a nested shell.';
      }
      // After a `cd` to a target the guard cannot determine, a relative path is unknowable.
      if (cwd === null && !PM.test(stripEnv(plain)) && pathWords(stripEnv(plain)).length > 1) {
        return `the working directory could not be determined (an earlier cd used a variable, ~, - or ` +
          `a substitution), so the paths in this command cannot be checked:\n  ${plain}\n` +
          'Use a literal directory in cd, or run the command from the project root.';
      }
      if (LOCKFILE_TEXT.test(plain)) {
        return `this command names a lockfile and is not a plain read:\n  ${plain}\n` +
          "Change the manifest and run the package manager's own install instead.";
      }
      for (const w of pathWords(plain)) {
        for (const rel of pathCandidates(ctx.root, cwd, w, realRoot)) {
          if (isLockfile(rel)) {
            return `this command names a lockfile (${rel}) and is not a plain read:\n  ${plain}\n` +
              "Change the manifest and run the package manager's own install instead.";
          }
          const prot = protectedReason(ctx, rel);
          if (prot) return `${prot}\n  The command is not a plain read:\n  ${plain}`;
        }
      }
      const low = plain.toLowerCase();
      const hit = literals.find((x) => low.includes(x.text));
      if (hit) {
        return `this command names the protected path "${hit.p}" (declared in ${ctx.inputs.file}, ` +
          `explicit input) and is not a plain read:\n  ${plain}`;
      }
    }
    return null;
  },
};
