# Next.js App Router: placement architecture

An addition to [SKILL.md](../SKILL.md) for code in a Next.js App Router app. This covers
**placement and boundaries only**. RSC mechanics, caching, metadata and routing
belong to the `next-best-practices` skill — do not restate them here.

---

## Two seams that plain React does not have

The App Router adds two seams. Both are architectural: they decide **where code
lives**, not merely how it executes.

1. **server / client** — `'use client'` splits the module graph in two. Code
   crosses the boundary through imports; data crosses through serialized props.
2. **static / dynamic** — the boundary runs **through the component**, not the
   route. One screen can have a static shell plus dynamic parts that stream in
   separately.

So the usual question "which feature owns this" gains two more: "which
environment does it run in" and "is it part of the shell or a dynamic region".

---

## Data access: the external HTTP API case

Next.js documents three mutually exclusive approaches and recommends **not
mixing** them, so that both a developer and an auditor know what to expect from
the code.

| Approach | When | When it fits |
|----------|------|-----------|
| External HTTP APIs | A separate backend with its own security practices | the case when the app only calls a separate backend |
| Data Access Layer | Next itself reaches the database or secrets | when Next reads the database or secrets itself |
| Component-level | Prototypes | no |

Determine from the consumer project's own docs which case applies. If the app
has no `route.ts`, no `'use server'`, no `server-only` and no database access,
and only a typed client talking to a separate backend, then:

- **All requests go through the project's typed API client.** Do not introduce a raw `fetch`
  inside a feature: the base URL, headers and error handling would spread across
  the codebase.
- Treat the backend as untrusted relative to the browser (Zero Trust):
  authorization is enforced by the backend, not by the UI. Hiding a button is not a
  security boundary.
- Response contracts live in the shared contracts package and are never redeclared in a
  feature.

**When a DAL becomes necessary:** as soon as Next itself reads a secret, touches
the database or holds a session. At that point a `server-only` module appears
that performs authorization checks and returns minimal DTOs, while
`'use server'` actions stay thin and delegate to it. Until then, do not imitate
a DAL with empty layers.

---

## Where to put `'use client'`

The directive marks the **entry into a client subtree**. Everything imported
beyond it lands in the client bundle, which makes the directive's location an
architectural decision rather than a detail.

- Put it on the smallest interactive component, not on the layout around it.
  `'use client'` on a `<Layout>` because of one click handler drags all the
  static markup into the client.
- Do not repeat the directive on every file in the subtree — the entry is enough.
- A shared component that needs the directive in only one place should **not** be
  marked. Create a client wrapper next to the usage instead, so the shared
  module stays usable on the server too.
- Context providers are client components taking `children`, mounted **as deep
  as possible**. `ThemeProvider` wraps `{children}`, not `<html>` — otherwise the
  whole page becomes client-rendered.

**A server component inside a client component.** A client component cannot
import a server component, but it can receive one as `children` or any other
prop — the server component then renders on the server and the client component
only ever sees the output. This is the main tool for keeping the boundary
narrow: a modal can be a client component while its contents stay server-side.

**A trap:** compound components (`Menu.Item`) break across the boundary — a
server component receives a reference instead of a function. If a component may
cross the seam, export its parts as named exports rather than static properties.

---

## Where things live in the route tree

`app/` is the composition layer. Keep `page.tsx` thin: it gathers data and
assembles components; it does not hold the screen's logic.

| What | Where |
|------|-------|
| Component for one route | `app/<route>/_components/` |
| Shared across several routes | `components/` or a feature |
| Grouping routes without changing the URL | `app/(group)/` |
| Backend client, shared hooks | `lib/` (or the project's equivalent) |

The underscore in `_components` opts the folder out of routing. Files in `app/`
do not become routes without a `page`/`route` file anyway, so the `_` is not
there for safety — it is there so a reader sees immediately that this is not a
route.

---

## Route Handlers and Server Actions

Both are **public entry points**, not internal functions. Treat them accordingly.

- **Do not call your own Route Handlers from server components.** During
  prerendering there is no server yet, so the build fails; at runtime it is a
  pointless extra HTTP hop. A server component goes straight to the source.
- Add a Route Handler when an **external** consumer needs the endpoint: a
  webhook, a callback, RSS, a proxy.
- **Server Actions are for mutations, not reads.** The client dispatches them
  one at a time, sequentially. For reads, use a server component or a client-side
  query cache.
- Re-check permissions inside the action. The fact that the form was rendered
  only for an authorized user guarantees nothing: the action is reachable by a
  direct POST.
- Accept **a reference and a change** (`itemId`, the new value) and re-read the
  rest from a trusted source using the session. A validation schema checks the
  shape of the input, not whether the object belongs to this user.

---

## Authorization: not in the layout

Checking the session in `layout.tsx` looks natural and **does not work**. A
layout does not re-render on navigation because of partial rendering, and it does
not decide whether the rest of the route renders — the router renders the
segments. A layout that hides its children does not stop them from running, and
they still reach the response. `return null` in a layout is not a guard either.

Check close to the data: in the component that displays it, or on the backend.

---

## static / dynamic and Suspense

Because the boundary runs through the component, you do not need to move a
dynamic region into its own route or fetch it from the client. Instead:

- **Push dynamic access down.** A top-level `await` in a layout delays the first
  chunk of the response for the entire segment.
- If only part of the shell needs dynamic data, extract that part into its own
  server component and wrap it in `<Suspense>` so the rest streams sooner.

This is a decision about **the shape of the tree**, not about performance: it
determines which components exist at all.

---

## Physical boundaries instead of conventions

In Next some boundaries can be made to break the build rather than rely on
agreement:

- `import 'server-only'` makes a module unusable on the client; importing it
  from client code is a build error.
- `import 'client-only'` is the mirror image, for code touching `window`.

Once server code with secrets appears, mark it immediately: the convention "we
all remember this file is server-side" does not survive a refactor.

Separately: only environment variables prefixed `NEXT_PUBLIC_` reach the client.
A variable such as an API base URL is public **on purpose**; nothing but
non-secret values may carry that prefix.

---

## Version notes

These rules are built on the Next.js 16.x documentation. One naming change worth
knowing: `middleware.ts` is now called `proxy.ts`, still one per project. Older
majors use the previous name — check `package.json` before creating the file.
