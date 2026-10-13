# Module boundaries

A reference for [SKILL.md](../SKILL.md). Read it during review, during a
refactor, or when you want to enforce the rules mechanically.

## Public API and barrel files

A module (a feature, a design-system package) exposes itself through
`index.ts` — that is its contract. Anything not listed there is an
implementation detail.

Barrels have a price, though: a bundler cannot always shake out what is unused,
and the dev server, `tsc` and the test runner do not tree-shake at all — they
walk the whole graph. So:

- **Never write `export *`.** Named re-exports only: they make the contract
  visible and let tree-shaking work.
- **Inside a module**, import by relative path directly, not through the
  module's own `index.ts`. Otherwise you get cycles.
- **Heavy modules** (charts, editors, anything pulling a large dependency)
  should be imported by direct path through the alias:
  `<ui-package>/charts/LineChart`, not from the root barrel.
- For ordinary lightweight primitives, the root import is fine.

So the barrel stays the module's boundary without being the mandatory route for
every import.

---

## Anti-patterns

| Anti-pattern | Why it hurts | Instead |
|--------------|--------------|---------|
| A feature imports another feature | The modules fuse; neither can be deleted alone | Push the shared part down into `shared/` |
| Lifting into `shared/` "just in case" | An imagined contract with no consumers | Wait for a second real consumer |
| `utils/` as a dumping ground | The code cannot be found by domain | Name by domain, keep it in the feature |
| `export *` in a barrel | Breaks tree-shaking, breeds cycles | Named re-exports |
| A wrapper component "to separate logic" | An extra tree level with no benefit | A hook or a pure function |
| Server data copied into `useState` | The copy misses background refetches | Read from the query cache |
| A local copy of a server type | Two declarations drift apart silently | Shared contracts |
| A folder named after a technical role (`containers/`) | The structure describes the tool, not the product | A folder named after the domain |

---

## Enforcing boundaries mechanically

A convention nobody checks survives exactly until the first deadline. The
direction of dependencies is worth moving into a tool — then a violation shows
up immediately instead of in a review a month later.

| Tool | What it gives you | When to reach for it |
|------|-------------------|----------------------|
| `no-restricted-imports` (built into ESLint) | Bans specific paths; a few lines of config | The cheapest start; bulletproof-react ships a ready config |
| `eslint-plugin-boundaries` | Declares layers and allowed directions; highlights in the editor | Once there are more than two layers and the rules are richer than "don't import from here" |
| `dependency-cruiser` | Cycles, orphan modules, graph visualisation | In CI, as a complement: it catches what ESLint cannot see |

A sensible minimum is ESLint for instant feedback plus `dependency-cruiser` in
CI for cycles and dead modules.

A rule is only worth having if it distinguishes real violations from correct
code. A path-based ban that fires on valid imports trains everyone to add inline
disables, which is worse than having no rule — prefer leaving something to
review over a rule that cries wolf.
