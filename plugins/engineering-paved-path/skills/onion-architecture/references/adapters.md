# Ports and adapters on Fastify

Reference for [SKILL.md](../SKILL.md): how the onion maps onto Fastify and DI.

## The core declares the port

The dependency inversion rule in an illustrative layout:

```
ports file                  interface GitHubClient { … }     ← the core declares
adapters/github/octokit.ts  class OctokitGitHubClient        ← infrastructure implements
adapters/mocks.ts           class MockGitHubClient           ← tests substitute
composition root            github(): Promise<GitHubClient>  ← composition wires
```

Signs of a well-formed port:

- named after a conversation (`GitHubClient.listPullRequests`), not after a
  technology;
- its signatures use domain types (`RepoRef`, `UnifiedDiff`), not SDK types
  (`Octokit.Response<…>`);
- a mock takes half an hour to write — if it does not, the port is too wide.

**SDK types do not cross the adapter boundary.** If `service.ts` mentions
`OpenAI.Chat.Completion` anywhere, swapping providers becomes a change to the
core — meaning the port is not doing its job.

## Fastify: a plugin is a unit of composition, not a layer

Fastify encapsulates: `register` creates a new scope, and changes made through
`decorate` are visible to descendants only, never to ancestors or siblings. That
is what produces the plugin DAG.

Practical consequences for architecture:

- **module = plugin** (`modules/<m>/routes.ts` default-exports a
  `FastifyPluginAsync`), registered in one place (a module registry);
- anything global (the DI container) is decorated **at the root**
  (`app.decorate('container', …)` at the app root) so every descendant sees it;
- `fastify-plugin` is a deliberate **break of encapsulation**. Use it only for
  infrastructure plugins (container, authentication), never to "reach into" a
  neighbouring module;
- hooks (`preHandler`) are cross-cutting concerns within a scope: tenancy,
  authorization, metrics. Domain logic does not belong in a hook.

## DI: hand-written container vs `@fastify/awilix`

A hand-written container is often enough: config, db,
lazily built adapters resolved through `SecretsProvider`, and
`ContainerOverrides` for tests. That is enough — Palermo explicitly noted that
an IoC container is not required for the onion.

When it is worth looking at
[`@fastify/awilix`](https://github.com/fastify/fastify-awilix):

| Signal | Why awilix helps |
|---|---|
| You need **request-scoped** dependencies (tenant, user, correlation id) | `diScope` is created per request on top of `diContainer` |
| You need ordered resource teardown | built-in `dispose` / `asyncDispose` |
| The container has grown into hundreds of lines of manual wiring | `asClass`/`asFunction` with automatic resolution |

Until those signals appear, the hand-written container is simpler and more
honest: the dependency graph is visible to the eye. **What is unacceptable
either way is passing the whole container into a service** (rule 8 in SKILL.md).

## Tenancy is part of the context, not a global

A shared request-context helper resolves tenant and user ids through an
authentication port. The service receives the resolved context as an
argument:

```ts
// routes.ts
const { workspaceId, userId } = await getContext(app.container, req);
return service.add(workspaceId, userId, req.body.url);
```

This keeps the scenario callable from a job or a CLI, where no `FastifyRequest`
exists.

## Errors

Domain errors (`AppError`, `NotFoundError`, `ValidationError`,
`ExternalServiceError`) are thrown by the core, and **one** error handler in
the app root maps them to HTTP. That is a boundary too: `service.ts` knows nothing
about status codes, and `routes.ts` does not translate errors by hand.

An adapter must translate foreign errors into ours: Octokit throws
`RequestError`, and what leaves the port must be an `ExternalServiceError` —
otherwise SDK types leak through exceptions, bypassing the signatures.

## Jobs and SSE are transport too

Job runners and SSE/stream endpoints are inbound/outbound adapters on equal
footing with HTTP. A job handler should be as thin as a route: take the payload,
call the scenario. If the clone logic lives inside the job handler, it is
unavailable from the API — and vice versa.
