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
  trailing commas. Run `pnpm check` (oxlint, oxfmt, tsc, vitest) before
  calling work done.
- Comments explain why. Delete a comment that restates the line below it.
- Data access lives behind the hooks in `src/hooks/`. Components do not
  call Convex directly.
- Pure logic (units, dates, validation) lives in `lib/` and gets tests.
  `convex/lib/units.ts` is the reference for how much coverage that means.
- No `useMemo`, `useCallback` or `memo`. The React Compiler is on (see
  `vite.config.ts`) and memoises for us, so write the plain computation.
  oxlint blocks the imports.
