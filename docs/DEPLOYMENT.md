# Production deployment

Mealy runs on a Cloudflare Worker at
`https://mealy.barrymichaeldoyle.com`. Its data and server functions run on
the Convex project's default production deployment. Clerk uses a separate
production instance.

## One-time setup

### Clerk

Activate the Clerk production instance and set its domain to
`mealy.barrymichaeldoyle.com`. Restrict its subdomain allowlist to
`mealy.barrymichaeldoyle.com`, then configure the production Google OAuth
credentials.

Pull the production keys into the ignored production environment file:

```bash
clerk env pull --instance prod
```

The file must contain a `pk_live_` publishable key. Keep the development
`pk_test_` and `sk_test_` keys in `.env.local`.

Create the `convex` JWT template in the Clerk production instance. Use the
claims documented in the Clerk section of the README. Copy its issuer domain
from Clerk's Frontend API setting.

### Convex

Set the production Clerk issuer on the default production deployment. The
command prompts for the value, which keeps it out of shell history:

```bash
npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN
```

Confirm the variable name without printing its value:

```bash
npx convex env list --prod --names-only
```

### Cloudflare

Log in to the Cloudflare account that owns `barrymichaeldoyle.com`:

```bash
npx wrangler whoami
```

Set the Clerk production secret on the Worker. Wrangler can create the Worker
record before any application code is published:

```bash
npx wrangler secret put CLERK_SECRET_KEY --name mealy
```

The Worker configuration marks this secret as required, so a release fails
before upload if it is missing. It also declares
`mealy.barrymichaeldoyle.com` as a custom domain. Cloudflare creates its DNS
record and certificate when Wrangler deploys it. Do not add a competing DNS
record for that hostname.

## Release

### Automated releases

Cloudflare Workers Builds owns production releases. Connect the `mealy`
Worker to the GitHub repository and set `main` as its production branch. Use
these commands under **Settings > Build**:

| Setting        | Value                    |
| -------------- | ------------------------ |
| Build command  | `pnpm deploy:build`       |
| Deploy command | `pnpm deploy:cloudflare`  |
| Root directory | `/`                       |

Add these production build variables and secrets in the same section:

| Name                         | Kind     | Value                            |
| ---------------------------- | -------- | -------------------------------- |
| `CONVEX_DEPLOY_KEY`          | Secret   | `admired-rabbit-570` deploy key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Variable | Clerk production `pk_live_` key |
| `PNPM_VERSION`               | Variable | `11`                             |

Keep non-production branch builds disabled. A production Convex deploy key
must never run for a preview branch.

Workers Builds runs the build command before its deploy command. The first
command runs the same lint, format, type, Knip and unit-test checks as the
pre-commit hook. It then asks Convex for the production URL, builds the Worker
against that URL and deploys the Convex schema and functions. Cloudflare
publishes that exact build only after the checks and Convex succeed.

The two providers cannot commit atomically. If Convex succeeds and Cloudflare
fails, the previous frontend remains live against the new backend. Keep
backend changes compatible with the currently deployed frontend, then retry
the failed Cloudflare build. A frontend is never published after a failed
Convex deployment.

### Manual release

Load the Clerk production keys, run the full check suite, then deploy:

```bash
pnpm check
pnpm deploy
```

The manual command follows the same ordered release path as CI. It does not
copy development data into production.

Later releases only need `pnpm deploy` unless the Clerk secret changes.

## Smoke test

Check these paths on a phone-sized viewport and a desktop browser:

- `/` loads over HTTPS.
- `/sign-up` creates a production Clerk user.
- A signed-in user can create a recipe and see it after a reload.
- `/household` creates an invite URL on the production hostname.
- The invite opens in a separate account and joins the same household.

Keep the development and production accounts visibly different while testing.
Production starts with an empty Convex database.
