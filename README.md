# Mealy 🥕

A mobile-first cooking helper: store recipes, plan the week's dinners, and
generate one consolidated shopping list with merged quantities.

Built to `docs/MVP_Specification.md`.

## Stack

| Concern    | Choice                                    |
| ---------- | ----------------------------------------- |
| Framework  | TanStack Start (React, file-based routes) |
| Backend/DB | Convex                                    |
| Auth       | Clerk (via Convex auth integration)       |
| Styling    | Tailwind CSS v4                           |
| Linting    | oxlint                                    |
| Formatting | oxfmt (print width 80)                    |
| Tests      | Vitest                                    |
| Hosting    | Cloudflare Workers (Nitro preset)         |

## Getting started

```bash
pnpm install
```

### 1. Convex

```bash
npx convex dev
```

The first run logs you in, creates a deployment, writes `CONVEX_DEPLOYMENT`
and `VITE_CONVEX_URL` into `.env.local`, and regenerates `convex/_generated`.
Leave it running while you develop — it pushes schema and function changes.

### 2. Clerk

Create an application at [dashboard.clerk.com](https://dashboard.clerk.com)
with **Email** and **Google** enabled, then copy the keys into `.env.local`:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_…
CLERK_SECRET_KEY=sk_test_…
```

Or let the CLI do it: `clerk init --app <app-id>` writes both keys into
`.env.local` and adds `/sign-in` and `/sign-up` routes.

Convex then needs to know who issues the tokens. This requires a JWT
template named `convex` in Clerk (claims `{"aud": "convex"}`, matching
`applicationID` in `convex/auth.config.ts`) and the issuer domain set as a
Convex environment variable:

```bash
clerk api /jwt_templates -X POST -d '{"name":"convex","claims":{"aud":"convex"},"lifetime":3600}'
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
```

The issuer domain is the Frontend API URL shown in the Clerk dashboard.
Skip either step and sign-in works but every query returns empty, because
`ctx.auth.getUserIdentity()` stays null.

Without a publishable key the dev server falls back to Clerk's keyless mode,
which is fine for a first look but not for real accounts.

### 3. Run it

```bash
pnpm dev          # app on http://localhost:3000
pnpm dev:convex   # in a second terminal
```

## Commands

```bash
pnpm check          # lint + format check + typecheck + tests
pnpm test           # vitest
pnpm lint           # oxlint
pnpm format         # oxfmt, in place
pnpm typecheck      # tsc --noEmit
pnpm build          # production build into .output/
pnpm preview        # run the built worker locally
pnpm deploy         # build, then deploy to Cloudflare Workers
```

## Deployment (Cloudflare Workers)

The Nitro `cloudflare_module` preset is configured in `vite.config.ts`, so
`pnpm build` emits a Worker bundle plus a generated
`.output/server/wrangler.json` (compatibility date `2024-09-19`,
`nodejs_compat` on, static assets bound as `ASSETS`). Don't hand-edit that
file — it is regenerated every build. To add bindings, put them under
`cloudflare.wrangler` in the `nitro()` options, or commit your own
`wrangler.json` at the project root for Nitro to merge.

```bash
npx wrangler login
pnpm deploy
```

**Environment variables split two ways.** `VITE_`-prefixed values are
inlined at build time, so they must be present when `pnpm build` runs (in
CI, set them on the build step). `CLERK_SECRET_KEY` is read at request time
and must be a Worker secret:

```bash
npx wrangler secret put CLERK_SECRET_KEY
```

Convex needs no Worker configuration — the browser connects to it directly,
and nothing in this app queries Convex during SSR.

## Layout

```
convex/
  schema.ts          tables, indexes, shared validators
  recipes.ts         recipe CRUD
  plans.ts           weekly planned meals
  lists.ts           shopping lists + generation
  lib/units.ts       units, conversions, consolidation (pure, tested)
  lib/validation.ts  server-side input rules
  lib/auth.ts        identity + ownership guards
src/
  routes/            file-based routes; everything under _app needs auth
  components/        UI primitives and shared pieces
  hooks/             data access (Convex queries/mutations) behind hooks
  lib/               dates, class names, units re-export
```

## How consolidation works

`convex/lib/units.ts` is the heart of the app and is covered by
`convex/lib/__tests__/units.test.ts`.

- Canonical storage is metric: mass in **grams**, volume in **millilitres**.
- Ingredients merge when the normalized name **and** the unit family match.
  Volume and mass are never converted into one another, so `200g flour` and
  `1 cup flour` stay as two lines.
- Countable units (`item`, `tin`, `pack`) each form their own family and sum
  as whole units: `tin tomatoes x2`.
- Quantities scale by planned servings ÷ recipe servings.
- Displayed amounts are rounded into shopper-friendly bands (477g → 480g,
  ≥1000g → kg). When a value was rounded, or came through an approximate
  conversion (`oz`, `lb`, `fl oz`, `pint`, `cup`), it displays with a
  leading **≈** and the list screen explains what that means.

## Not in the MVP

Offline/PWA support is the first post-MVP milestone. Data access already
sits behind the hooks in `src/hooks/`, and list rendering is client-side, so
adding a service worker and a local queue does not require restructuring.
