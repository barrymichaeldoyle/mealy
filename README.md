# Mealy 🥕

A mobile-first cooking helper: store recipes, plan the week's dinners, and
generate one consolidated shopping list with merged quantities. Everything
belongs to a household, so the people you cook with see the same recipes,
plan and lists as you do.

Built to the specs in `docs/`: `MVP_Specification.md` for scope,
`DESIGN_Specification.md` for the visual language and
`LOGO_Specification.md` for the mark.

## Stack

| Concern    | Choice                                 |
| ---------- | -------------------------------------- |
| Framework  | TanStack Start (React 19, file routes) |
| Backend/DB | Convex                                 |
| Auth       | Clerk (via Convex auth integration)    |
| Styling    | Tailwind CSS v4                        |
| Fonts      | Inter and Fraunces (Fontsource)        |
| Linting    | oxlint                                 |
| Formatting | oxfmt (print width 80)                 |
| Tests      | Vitest (+ convex-test)                 |
| A11y       | oxlint jsx-a11y + Playwright Axe       |
| CI         | GitHub Actions, plus a pre-commit hook |
| Deployment | Cloudflare Workers Builds              |
| Hosting    | Cloudflare Workers (Nitro preset)      |
| Memoising  | React Compiler, no manual useMemo      |

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
Leave it running while you develop. It pushes schema and function changes.

Pick a cloud deployment, not a local one. A local deployment listens on
`127.0.0.1`, so you cannot open the app from your phone, and this is a
mobile-first app. To move an existing setup across:

```bash
npx convex dev --once --configure existing \
  --team <team> --project <project>
```

Environment variables belong to one deployment, so set
`CLERK_JWT_ISSUER_DOMAIN` again on the new one.

### 2. Clerk

Create an application at [dashboard.clerk.com](https://dashboard.clerk.com)
with **Email** and **Google** enabled, then copy the keys into `.env.local`:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_…
CLERK_SECRET_KEY=sk_test_…
```

Or let the CLI do it. Install it with `pnpm add -g clerk`, then
`clerk init --app <app-id>` writes both keys into `.env.local` and adds
`/sign-in` and `/sign-up` routes.

Convex then needs to know who issues the tokens. This requires a JWT
template named `convex` in Clerk, whose `aud` claim matches `applicationID`
in `convex/auth.config.ts`, and the issuer domain set as a Convex
environment variable:

```bash
clerk api /jwt_templates -X POST -d '{
  "name": "convex",
  "lifetime": 3600,
  "claims": {
    "aud": "convex",
    "name": "{{user.full_name}}",
    "nickname": "{{user.username}}",
    "email": "{{user.primary_email_address}}",
    "picture": "{{user.image_url}}"
  }
}'
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
```

The claims past `aud` are not decoration. Convex reads them into
`ctx.auth.getUserIdentity()`, and `convex/lib/auth.ts` names a new household
after `identity.name`. A template carrying only `aud` still signs everyone
in, but every household comes out called “Me’s kitchen” and every member
renders as “Me” on `/household`. You only notice once two people share a
kitchen.

The issuer domain is the Frontend API URL shown in the Clerk dashboard.
Skip either step and sign-in works but every query returns empty, because
`ctx.auth.getUserIdentity()` stays null.

To check the wiring rather than trust it, mint a token and call a mutation
that requires one. Signed out it must refuse:

```bash
curl -s $VITE_CONVEX_URL/api/mutation -H 'Content-Type: application/json' \
  -d '{"path":"households:ensureCurrent","args":{},"format":"json"}'
```

Without a publishable key the dev server falls back to Clerk's keyless mode,
which is fine for a first look but not for real accounts.

### 3. Run it

```bash
pnpm dev          # Convex plus the app on http://localhost:3000
```

`pnpm dev` runs `convex dev --start`, so the backend comes up first and the
Vite server starts once the first push succeeds. Both share the terminal and
stop together. To run one on its own, use `pnpm dev:convex` or `pnpm dev:web`.

## React Compiler

The compiler is enabled in `vite.config.ts` through
`@rolldown/plugin-babel` and `reactCompilerPreset`, so components do not
hand-memoise. `useMemo`, `useCallback` and `memo` are blocked by
`no-restricted-imports` in `.oxlintrc.json`. Write the plain computation
and let the compiler cache it.

## Commands

```bash
pnpm check           # lint + format + types + Knip + Vitest + Axe
pnpm precommit       # the same without Axe, what the hook runs
pnpm test            # vitest, both projects
pnpm test:watch      # vitest in watch mode
pnpm test:a11y       # Axe on public pages, desktop and mobile
pnpm lint            # oxlint
pnpm lint:fix        # oxlint --fix
pnpm knip            # unused files, exports and dependencies
pnpm format          # oxfmt, in place
pnpm format:check    # oxfmt, report only
pnpm typecheck       # tsc --noEmit
pnpm icons           # redraw public/ favicons from the mark
pnpm generate-routes # tsr generate, when the route tree drifts
pnpm build           # production build into .output/
pnpm preview         # wrangler dev against the build output
pnpm deploy          # build, then deploy to Cloudflare Workers
```

Install Chromium once before the first accessibility run:

```bash
pnpm exec playwright install chromium
```

The JSX accessibility rules fail lint for invalid ARIA, missing labels,
keyboard-inaccessible controls and related structural problems. Playwright
runs Axe against the rendered home and authentication pages at desktop and
mobile sizes. Automated checks catch common WCAG failures, but they do not
replace manual keyboard and screen-reader testing.

## Checks

`pnpm install` points `core.hooksPath` at `.githooks` through the `prepare`
script, so `.githooks/pre-commit` runs `pnpm precommit` before every commit:
lint, format check, types, Knip and the unit tests, about five seconds. The
browser suite is left out because it needs a dev server. Use `git commit -n`
to skip the hook, and say so in the message when you do.

`.github/workflows/ci.yml` runs those same checks as separate steps, so a red
run names the one that failed and one run reports every failure. The
accessibility suite is a second job. It needs the repository variable
`VITE_CLERK_PUBLISHABLE_KEY`, because the pages under test render Clerk's
hosted components, and it skips itself when that variable is unset. Add a
check to `pnpm precommit` and add it to the workflow too.

`AGENTS.md` holds the conventions for this repo: prose and UI copy, commit
messages, and the code rules the linter cannot express. `CLAUDE.md` is a
symlink to it. Read it before writing anything here.

## Deployment (Cloudflare Workers)

The Nitro `cloudflare_module` preset is configured in `vite.config.ts`, so
`pnpm build` emits a Worker bundle plus a generated
`.output/server/wrangler.json` (compatibility date `2024-09-19`,
`nodejs_compat` on, static assets bound as `ASSETS`). Don't hand-edit that
file. It is regenerated every build. To add bindings, put them under
`cloudflare.wrangler` in the `nitro()` options, or commit your own
`wrangler.json` at the project root for Nitro to merge.

The production Worker is named `mealy` and uses the custom domain
`mealy.barrymichaeldoyle.com`. See `docs/DEPLOYMENT.md` for the Clerk, Convex
and Cloudflare setup checklist and the first-release sequence.

**Environment variables split two ways.** `VITE_`-prefixed values are
inlined at build time, so they must be present when `pnpm build` runs (in
CI, set them on the build step). `CLERK_SECRET_KEY` is read at request time
and must be a Worker secret:

```bash
npx wrangler secret put CLERK_SECRET_KEY
```

Convex needs no Worker binding. The browser connects to it directly, and
nothing in this app queries Convex during SSR. `pnpm deploy` deploys the
production Convex functions and the Worker together.

Cloudflare Workers Builds deploys pushes to `main`. Its build command builds
with the URL supplied by the Convex deploy key and deploys Convex. Its deploy
command then publishes that same build to Cloudflare. See
`docs/DEPLOYMENT.md` for the required build configuration.

## Layout

```
convex/
  schema.ts          tables, indexes, shared validators
  households.ts      membership, invite links, joining and leaving
  recipes.ts         recipe CRUD
  plans.ts           weekly planned meals
  lists.ts           shopping lists + generation
  migrations.ts      one-off backfill for pre-household data
  lib/units.ts       units, conversions, consolidation (pure, tested)
  lib/validation.ts  server-side input rules
  lib/auth.ts        identity + household guards
  lib/dates.ts       short date names for generated lists
  lib/optional.ts    defined(), for exactOptionalPropertyTypes
  __tests__/         household join/leave paths, run against convex-test
src/
  routes/            file-based routes; everything under _app needs auth
    _app/            household, join, plan, recipes, lists
  components/        shared pieces, with the primitives in components/ui
  hooks/             data access (Convex queries/mutations) behind hooks
  integrations/      the Clerk and Convex providers
  lib/               dates, class names, logo geometry, units re-export
docs/                MVP, design and logo specs
scripts/             generate-icons.ts, run by pnpm icons
public/              the icons it writes
tests/a11y/          Playwright Axe specs
```

## Households

Every table is scoped by `householdId`, never by Clerk user id. Signing in
for the first time creates a household of one, so no query has to cope with
a user who owns nothing.

To share a kitchen, open `/household`, create an invite link, and send it.
The link works once, expires after a week, and creating a new one retires
the old. Whoever opens it while signed in picks what happens to the data
they already have: bring it into the household, or discard it and start
fresh. Bringing it across is offered only when their current household is
theirs alone, since data in a shared household is not one person's to take.

Leaving a household puts you back in one of your own. The recipes, plans
and lists stay behind with the people still there.

The join, leave and remove paths are covered by `convex/__tests__/`, which
runs the real Convex functions under `convex-test`. Those tests are a
separate vitest project (`--project convex`) because they need the
`edge-runtime` environment. `pnpm test` runs both projects.

If you have a deployment holding data written before households existed,
`convex/migrations.ts` backfills it. The steps are in the comment at the
top of that file.

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
  leading **≈**. The symbol stands on its own, there is no legend on the
  list screen.

## The mark

The basil-sprig checkmark is specified in `docs/LOGO_Specification.md` and
authored once, as path data in `src/lib/logo.ts`. `<Logo>` in
`src/components/ui/logo.tsx` draws it in the app, and
`scripts/generate-icons.ts` rasterises the same geometry through headless
Chromium into `public/`. Change the geometry, run `pnpm icons`, then commit
what lands in `public/`. The favicon drops the tip leaf, since it disappears
below 24px.

## Not in the MVP

Offline/PWA support is the first post-MVP milestone. The icons are already
there, `apple-touch-icon.png` and a maskable 512, but there is no web app
manifest and no service worker. Data access sits behind the hooks in
`src/hooks/` and list rendering is client-side, so adding them does not
require restructuring.
