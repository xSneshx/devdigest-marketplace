# Machine-checked boundaries

Reference for [SKILL.md](../SKILL.md). A convention nobody checks survives
exactly until the first deadline.

Use whatever import-boundary tooling the project already has (an import-graph
tool such as dependency-cruiser, or lint rules such as `no-restricted-imports`).
Add a tool only if none exists, and treat that as its own task. The sketch below
shows the shape of the rules for dependency-cruiser; adjust the path regexes to
the project's layout.

## Rule sketch

```js
/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'routes-no-sql',
      comment: 'Transport never touches persistence (rule 1)',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/routes\\.ts$' },
      to: { path: '^(node_modules/)?drizzle-orm|^src/db/' },
    },
    {
      name: 'service-no-http',
      comment: 'A scenario knows nothing about transport (rule 2)',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/(service|usecases)/?.*\\.ts$' },
      to: { path: '^(node_modules/)?fastify' },
    },
    {
      name: 'domain-is-pure',
      comment: 'The core knows nothing about infrastructure (rule 3)',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/domain/' },
      to: { path: '^src/(adapters|db|platform)/|^(node_modules/)?(fastify|drizzle-orm)' },
    },
    {
      name: 'no-cross-module',
      comment: 'A module does not import from another module (rule 4)',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/',
        pathNot: ['^src/modules/$1/', '^src/modules/_shared/'],
      },
    },
    {
      name: 'no-circular',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
  ],
};
```

How it works: such tools have no dedicated "layers" feature — boundaries are
expressed as `forbidden` rules with regexes in `from`/`to`. A group captured in
`from` is substituted into `to.pathNot` as `$1`, which is what forbids
cross-imports between sibling modules.

## Rollout order

1. Add the config with `warn` for rules currently violated and `error` for the
   rest.
2. Clean up the violating modules following [migration.md](migration.md).
3. Add the check to CI next to the type check.
4. Raise the remaining `warn` rules to `error`.

A rule introduced as `error` before the cleanup will be switched off by the
first red pipeline — and never switched back on.

## What this does not catch

An import graph sees coupling, not meaning. It will not notice an anemic domain,
a delegating use case, or a repository that re-creates the ORM. Those belong to
code review, not to a linter.
