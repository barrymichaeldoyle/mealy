# Mealy conventions

Read this before writing prose, UI copy, commits or code in this repo.
Applies to everyone working here, human or agent. Tool-specific files
(`CLAUDE.md` and friends) are symlinks to this one, so edit this file.

## Prose and UI copy

Applies to the README, `docs/`, commit messages, PR descriptions, code
comments and every string a user reads in the app.

**Punctuation**

- No em dashes (`—`). Use a comma, a colon, brackets, or split the
  sentence. If you reach for an em dash, the sentence usually wants to be
  two sentences.
- No en dashes in prose. Write "2 to 4 servings", not "2–4 servings".
  Numeric ranges in tables and specs may use a plain hyphen.
- No semicolons joining two independent clauses. Use a full stop.
- Straight quotes in code, curly quotes in rendered UI copy where the
  surrounding text already uses them. Do not mix within one string.

**Banned constructions**

These read as machine-written. Do not use them, including in commit
bodies:

- "It's not just X, it's Y" and every variant of the negation-then-pivot
  ("not only... but also", "this isn't about X, it's about Y").
- Rhetorical questions as section openers ("The result?", "Why does this
  matter?").
- Rule-of-three padding, where the third item exists for rhythm rather
  than meaning ("fast, reliable, and delightful").
- Filler intensifiers and marketing adjectives: seamless, robust,
  powerful, comprehensive, elegant, delightful, blazing, game-changing,
  best-in-class, cutting-edge, world-class.
- Verb inflation: leverage (use "use"), utilise (use "use"), facilitate,
  enable (when "let" works), elevate, unlock, streamline, delve, dive
  into, embark.
- Throat-clearing openers and closers: "In today's...", "Let's dive in",
  "It's worth noting that", "At the end of the day", "In conclusion",
  "I hope this helps".
- Transition chains: "Furthermore", "Moreover", "Additionally" stacked
  across consecutive paragraphs. One "also" is usually enough.
- Emoji as bullet markers or section decoration. The carrot in the app
  name is the only emoji in this project.
- Bold lead-ins on every bullet in a list. Use them only when the list is
  genuinely a set of defined terms.

**Style**

- Plain declaratives, active voice, present tense.
- Concrete over abstract. "Merges 250g + 8oz mince into ≈480g" beats
  "handles unit consolidation intelligently".
- Short sentences. If a sentence needs a comma-spliced clause to breathe,
  cut it in two.
- Say the limitation out loud. "Volume and mass are never converted into
  one another" is better than implying completeness.
- No hedging stacks ("might potentially", "could possibly help to").
- British English in prose and UI copy: millilitres, grams, colour,
  organise. Code identifiers stay US-standard where the ecosystem is
  (`normalize`, `color` in CSS/Tailwind).
- Wrap markdown at 80 columns, matching `printWidth` in `.oxfmtrc.json`.
  `docs/` is excluded from oxfmt, so wrap it by hand.

## Commit messages

- Subject in the imperative mood, no trailing full stop, under ~60 chars:
  "Target Cloudflare Workers instead of a generic Node host".
- Body wrapped at ~76 columns. Explain why, not what the diff already
  shows.
- Bullets for multi-part changes, each naming the file or area it touches.
- If an agent wrote the change, close with a `Co-Authored-By:` trailer
  naming it. Match the existing trailers in `git log`.
- Only commit when asked.

## Code

- oxfmt owns formatting: no semicolons, single quotes, 80 columns,
  trailing commas. Run `pnpm check` before calling work done.
- A pre-commit hook (`.githooks/pre-commit`) runs `pnpm precommit`: lint,
  format check, typecheck, knip and unit tests, about five seconds. It is
  wired up by `pnpm install` through the `prepare` script. The browser a11y
  suite is deliberately left out, since it needs a dev server. Use
  `git commit -n` to skip the hook, and say so in the message when you do.
- CI (`.github/workflows/ci.yml`) runs those same checks as separate steps,
  so a red run names the one that failed and one run reports every failure.
  Add a check to `precommit` and add it to the workflow too. The a11y suite
  runs in a second job, which needs the repository variable
  `VITE_CLERK_PUBLISHABLE_KEY` and skips itself when it is unset.
- Comments explain why. Delete a comment that restates the line below it.
- Data access lives behind the hooks in `src/hooks/`. Components do not
  call Convex directly.
- Pure logic (units, dates, validation) lives in `lib/` and gets tests.
  `convex/lib/units.ts` is the reference for how much coverage that means.
- `exactOptionalPropertyTypes` is on, and Convex spells optional fields as
  `x?: T` with no `undefined`. Pass form values through `defined()` from
  `convex/lib/optional.ts` so an empty field is absent rather than explicitly
  undefined, instead of widening the Convex types to accept it.
- `noUncheckedIndexedAccess` is on. Handle the `undefined` an index can
  return: narrow it, or reach for a helper that throws on a miss. Do not
  reach for `!`.
- Named exports everywhere. `import/no-default-export` is on. The only
  exemptions are files whose loader demands a default export: root
  `*.config.ts`, `convex/schema.ts`, `convex/auth.config.ts` and
  `convex/http.ts`. Add to the override in `.oxlintrc.json` only when a
  tool genuinely requires it.
- Braces on every `if`, `else`, `for` and `while` body, even a single
  statement. oxlint's `curly` rule enforces this, and `oxlint --fix`
  applies it.
- No `useMemo`, `useCallback` or `memo`. The React Compiler is on (see
  `vite.config.ts`) and memoises for us, so write the plain computation.
  oxlint blocks the imports.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
