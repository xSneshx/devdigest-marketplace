# Persistence: Drizzle under the onion

Reference for [SKILL.md](../SKILL.md): what a repository does, what crosses its
boundary, and where the transaction boundary sits.

## The repository is the only place with `db/schema`

```ts
// modules/repos/repository.ts — infrastructure
type RepoRow = typeof t.repos.$inferSelect;          // ✓ local type, never exported

export class RepoRepository implements RepoStore {   // ✓ implements a port
  constructor(private db: Db) {}
  async findById(workspaceId: string, id: string): Promise<Repo | undefined> {
    const [row] = await this.db.select().from(t.repos)
      .where(and(eq(t.repos.workspaceId, workspaceId), eq(t.repos.id, id)));
    return row && toRepo(row);                        // ✓ mapping at the boundary
  }
}
```

Three things matter here:

1. **`RepoRow` does not leave.** The row type is an implementation detail of the
   table.
2. **Mapping happens in the repository**, not in the service: the service must
   not know that a column called `full_name` exists.
3. **Every query is scoped by `workspaceId`.** Tenancy is a data-level
   invariant; in the repository it is guaranteed structurally, in a service it
   gets forgotten.

Modern ORMs like Drizzle are typed query builders, not entity mappers. So the
repository here is not "a wrapper over the ORM for its own sake" — it is **the
place where the language of tables ends and the language of the domain begins**.

## The application layer declares the repository interface

```ts
// modules/repos/ports.ts — core
export interface RepoStore {
  findById(workspaceId: string, id: string): Promise<Repo | undefined>;
  findByFullName(workspaceId: string, fullName: string): Promise<Repo | undefined>;
  save(repo: NewRepo): Promise<Repo>;
}
```

The service depends on `RepoStore`, the container supplies `RepoRepository`, the
test supplies a stub. Exactly the construction that already works for
`GitHubClient`.

**Keep the interface narrow.** Every new method is a new obligation for every
implementation and every mock. If the interface drifts toward
`findActiveByIdWithProduct…`, you are writing a worse copy of Drizzle — the very
criticism that makes people call repositories useless.

## When a repository is NOT needed

A repository earns its place when it guards an aggregate boundary or hides
genuinely complex persistence. For thin CRUD (settings, preferences) it is
more honest to keep `routes.ts → repository.ts` with no port and no domain — or
even to call Drizzle directly inside the repository without an interface until a
test stub is actually needed.

One explicitly allowed exception: **read models** — lists, dashboards, reports.
There a projection built with `select` over the needed columns beats loading an
aggregate and mapping it. The only requirement is that read models never mutate:
writes go through the domain path.

## Transactions

The transaction boundary is the **use case**, because it is the thing that knows
"all or nothing".

```ts
// application
await this.tx.run(async (tx) => {
  const review = await this.reviews.create(input, tx);
  await this.runs.create({ reviewId: review.id }, tx);
});

// infrastructure — the repository takes an optional transaction
async create(input: NewReview, tx?: DbExecutor): Promise<Review> {
  const exec = tx ?? this.db;
  const [row] = await exec.insert(t.reviews).values(toRow(input)).returning();
  return toReview(row);
}
```

- Drizzle provides a callback API, `db.transaction(async (tx) => …)`, nested
  transactions via savepoints, and an explicit `tx.rollback()`.
- The `tx` type is abstracted in the application layer (`DbExecutor` /
  `ITransaction`) — otherwise `PgTransaction<…>` drags Drizzle into the core.
- Never open a transaction inside a repository: two repositories in one scenario
  would then never be atomic.

## Migrations

`drizzle-kit generate` plus `src/db/migrate.ts` are infrastructure. Domain code
knows nothing about migrations. A schema change that does not change the domain
(a renamed column, an index) must stop at `repository.ts` and `mapper.ts`; if it
reached the service, a boundary was already broken earlier.

## Tests

- `repository.ts` — integration, `*.it.test.ts` plus Testcontainers, real schema.
- `service.ts` — an in-memory `RepoStore` stub, no database.

If testing a scenario requires Postgres, the scenario is coupled to persistence.
That is a diagnosis of the architecture, not an inconvenience of the test.
