# Marketplace catalog site

A static, read-only catalog of the plugins in this marketplace. A build-time indexer reads the
repository and writes one JSON index; a React single-page app renders it.

## 1. Requirements

Node 22 or newer.

## 2. Run locally

```sh
npm --prefix site ci
npm --prefix site run dev
```

The dev server listens on `http://127.0.0.1:5173/` and the port is strict: if it is taken, the
command fails instead of picking another one. The index is regenerated each time the dev server
starts (the `predev` step), so restart it to pick up catalog changes.

## 3. Build, preview, smoke

Run these from `site/` (or prefix with `npm --prefix site`):

- `npm run build` regenerates the index, then writes the static site to `site/dist`.
- `npm run preview` serves `site/dist` on port 4173 (strict).
- `npm run smoke` builds, then serves the build under a sub-path and checks that it loads, the way
  a Pages project site would host it.

## 4. Test, lint, typecheck, size, and the CI chain

- `npm test` runs the unit and component suites (Vitest).
- `npm run lint` runs ESLint with zero warnings allowed.
- `npm run typecheck` type-checks the app and the Node-side code (indexer, build plugin).
- `npm run size` checks the gzipped size of `dist` against a 1,000,000-byte budget (images
  excluded). Run `npm run build` first.
- `npm run ci` runs the same chain as the workflow: index, typecheck, lint, test, build, size.

## 5. How the index is generated

`npm run index` runs the indexer (`indexer/cli.ts`). It reads:

- the catalog and each plugin manifest,
- each plugin's components,
- each plugin's README, CHANGELOG and COMPATIBILITY files,
- release tags (the indexer asks git for tags; in CI the checkout is full-depth so they exist),
- the file names in the release-evidence directory.

The indexer is read-only: it never executes plugin code, hooks or scripts, and it never writes
outside its output file. Before writing, it scans the generated JSON for disallowed content and, on
a finding, fails and leaves no index behind. The output file, `public/site-index.json`, is
gitignored; it is always rebuilt, never committed.

## 6. Translations

Every user-facing string lives in `src/i18n/en.json` and is read through the `t` helper. The
no-literal-strings test (`src/i18n/no-literal-strings.test.ts`) fails when a component hard-codes
visible text, so add the string to `en.json` instead.

## 7. Content-scan rules for site contributors

The repository-wide content scan (`node scripts/ci/run-all.mjs --only content --worktree`) covers
every non-ignored file in `site/`, including this README, fixtures and test data. It rejects:

- credential-shaped values (cloud keys, API tokens, private-key blocks, long secret assignments),
- absolute paths into a user's home directory, on any operating system,
- the source-project tokens listed in `scripts/ci/denylist.txt`: internal product names, and the
  local ports of the application this marketplace was extracted from.

Write placeholders or relative paths in examples. The deny-list is the source of truth; read it
there rather than copying its entries into docs or fixtures.

## 8. The `site` workflow

`.github/workflows/site.yml` runs on pushes (all branches, and release tags), on pull requests, and
on manual dispatch, but only when `site/`, `plugins/`, `.claude-plugin/`, `docs/release-evidence/`
or the workflow file itself change. It has read-only repository permissions.

The `build` job installs from the lockfile, generates the index, then runs typecheck, lint, test,
build and the size budget, and uploads `site/dist` as the artifact `site-dist`.

It is a separate workflow from `validate`, with its own concurrency group, so a site failure or a
skipped deploy never changes the `validate` result.

## 9. Switching Pages deployment on

Deployment is off by default. To enable it:

1. In the repository, open Settings, then Pages, and set Source to "GitHub Actions".
2. Set the repository variable `SITE_PAGES_ENABLED` to `true`.

After that, a push or manual run on the default branch deploys `site/dist` through the `deploy`
job. Pull requests and other branches never deploy. To switch it off, delete the variable or set
it to any value other than `true`; the build still runs and the notice in the `pages-gate` step
says why the deploy was skipped.

## 10. Public exposure warning

**On a personal account, a Pages site published from this private repository is reachable by
anyone on the internet.** It exposes every indexed README and component body. Treat everything the indexer
reads as published the moment deployment is enabled, and keep `SITE_PAGES_ENABLED` unset until you
accept that. Only organization plans that offer access-controlled Pages restrict the site to
repository members; check your plan before relying on that.
