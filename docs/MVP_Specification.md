# Mealy MVP Specification

A mobile-first cooking helper app: store recipes, plan weekly dinners, and
generate consolidated shopping lists.

---

## 1. Overview

**Elevator pitch:** Mealy lets users save their recipes, schedule
dinners onto a weekly plan, and auto-generate a smart shopping list with
merged ingredient quantities (e.g. "tin tomatoes x2", "500g mince" instead
of duplicates).

**Sharing:** Cooking is a household activity, so a household, not a user,
owns the data. Everyone in a household sees the same recipes, plan and
lists, in real time. A new user starts in a household of one and grows it by
sending an invite link.

**Primary platform:** Mobile web (majority of users are on phones). Desktop
should work but mobile is the design priority.

**Locale:** Primary audience is South African, so metric-first. Imperial
units are accepted as input and converted (see §3.5).

---

## 2. Tech Stack & Tooling

| Concern      | Choice                                            |
| ------------ | ------------------------------------------------- |
| Framework    | TanStack Start (React, file-based routes)         |
| Backend / DB | Convex (queries, mutations, schema)               |
| Auth         | Clerk (integrated with Convex auth)               |
| Styling      | Tailwind CSS                                      |
| Linting      | oxlint (NOT eslint)                               |
| Formatting   | oxfmt (NOT prettier)                              |
| Fonts        | Fraunces + Inter, self-hosted via Fontsource      |
| Deployment   | Any Node/edge-friendly host (e.g. Netlify/Vercel) |

Conventions:

- TypeScript everywhere, strict mode.
- Convex functions in `convex/`, one file per domain (recipes, plans, lists).
- Use Clerk's Convex integration (`ctx.auth.getUserIdentity()`). Clerk
  identifies the person, the `householdMembers` table says which household
  they are in, and all data is scoped per household.
- Print width 80.

---

## 3. Core Features (MVP Scope)

### 3.1 Auth & households

- Sign up / sign in via Clerk (email + Google at minimum).
- All app routes behind auth except a simple landing page.
- Every signed-in user belongs to exactly one household, created for them
  on first sign-in. There is no state where a signed-in user has nowhere
  to write.
- A household member creates an invite link and sends it however they like.
  The link is single use, expires after 7 days, and creating a new one
  retires the old one. Only one link is live at a time.
- Opening the link while signed in shows whose household it is and asks
  what to do with the data you already have: bring it across, or start
  fresh and discard it. Bringing it across is the default, and is only
  offered when your current household is yours alone.
- Members can rename the household and leave it. The owner can remove
  other members. Leaving puts you back in a household of your own and the
  data stays behind with the people still in it.

### 3.2 Recipes (CRUD)

- Create, view, edit, delete recipes.
- Recipe fields:
  - `title` (required)
  - `description` (optional, short)
  - `servings` (number, default 2)
  - `prepTimeMinutes`, `cookTimeMinutes` (optional)
  - `tags` (string array, freeform, e.g. "pasta", "chicken", "veggie")
  - `ingredients[]`:
    - `name` (required, e.g. "tin tomatoes")
    - `quantity` (number, optional, since some items are "to taste")
    - `unit` (see §3.5 for supported units)
    - `note` (optional, e.g. "finely chopped")
  - `steps[]` (ordered strings)
- No images in MVP.
- Recipe list view: searchable by title, filterable by tag.
- Recipe detail view: ingredients + steps, readable while cooking
  (large text, generous spacing on mobile).

### 3.3 Meal Plan (weekly dinner schedule)

- **Dinner-first:** the weekly view is 7 days, each day showing its dinner.
  This is the core, polished experience. On mobile it is a vertical list
  of 7 day rows with a left day rail, not a grid (see the design spec
  §5).
- **Slot extensibility (cheap, non-invasive):** the data model includes a
  `slot` field (`"breakfast" | "lunch" | "dinner"`), defaulting to
  `"dinner"`. The MVP UI only surfaces dinner; adding other slots later is
  a UI-only change. Do not build breakfast/lunch UI now.
- Assign a recipe to a day; allow multiple recipes per day (e.g. main +
  side).
- Allow adjusting servings per planned meal (defaults to recipe servings).
- Navigate between weeks (previous/next).
- Remove/swap a planned meal.
- Data keyed by ISO date (`YYYY-MM-DD`) + slot.

### 3.4 Shopping Lists

- **Generate from meal plan:** select a date range (default: current week)
  → creates a shopping list from all planned meals in range.
- **Generate from recipes directly:** pick one or more recipes → list.
- **Quantity consolidation (key feature):**
  - Merge ingredients by normalized name (case-insensitive, trimmed) AND
    compatible unit family.
  - Same family: convert to canonical metric unit, sum, display in the
    most readable unit → `mince: 500g` (from 2 × 250g; 1500g → 1.5kg).
  - Countable units (`item`, `tin`, `pack`): sum count → `tin tomatoes x2`.
  - Incompatible families for the same name (e.g. "flour 200g" +
    "flour 1 cup"): keep as separate line items. Do NOT guess
    volume↔mass conversions.
  - Scale quantities by planned servings ÷ recipe servings.
- A ticked item records who ticked it (`checkedBy`, a Clerk subject),
  resolved to a name by `lists.get`. Shown only to the other people in the
  household, and only when there is more than one member: two people in
  one shop need to know who has the milk, and nobody needs telling what
  they ticked themselves.
- List item fields: `name`, `quantity`, `unit`, `checked` (boolean),
  `manuallyAdded` (boolean), `approximate` (boolean, see §3.5 rounding).
- Users can:
  - Tick items off (checked items move to bottom / greyed strikethrough).
  - Add manual items ("dish soap") not tied to any recipe.
  - Edit quantity/name of any item, delete items.
- Multiple lists supported; list has a `name` (default: "Week of {date}")
  and `createdAt`.
- Checked state persists (Convex mutation per toggle; optimistic UI).

### 3.5 Units & Conversions (metric-first)

- **Canonical storage is metric:** mass in grams, volume in millilitres.
  Store the user's entered unit alongside for faithful display in recipes.
- **Supported input units:**
  - Mass: `g`, `kg`, `oz`, `lb`
  - Volume: `ml`, `l`, `tsp`, `tbsp`, `cup`, `fl oz`, `pint`
  - Count: `item`, `tin`, `pack`, `none` ("to taste")
- **Which of them the picker offers** is per household, stored as
  `households.unitSystems`. A South African kitchen never reaches for
  ounces or pints, and offering them on every ingredient row is clutter.
  - `metric` contributes `g`, `kg`, `ml`, `l`. `imperial` contributes
    `oz`, `lb`, `fl oz`, `pint`.
  - `tsp`, `tbsp` and `cup` belong to both: a metric kitchen still
    measures baking powder in teaspoons.
  - Counts and "to taste" belong to neither and are always offered.
  - The field is absent until someone answers, which is what puts the
    setup screen in front of new and existing households alike.
  - Changing it changes nothing already saved. A recipe written in ounces
    still says ounces, and the picker keeps offering a unit that recipe
    already uses so editing a row cannot silently change what it says.
- **Conversion table (fixed constants, no external service):**
  - `1 kg = 1000 g`, `1 oz = 28.35 g`, `1 lb = 453.6 g`
  - `1 l = 1000 ml`, `1 tsp = 5 ml`, `1 tbsp = 15 ml`,
    `1 cup = 250 ml` (metric cup, an acceptable approximation for US 240ml
    cups; do not build regional cup handling), `1 fl oz = 29.57 ml`,
    `1 pint = 473 ml` (US)
  - Implement as a single pure, well-tested utility module shared by
    recipe display and list consolidation.
- **Display rules:**
  - Recipes: show units as entered (respect the author's recipe), with a
    stepper for the number you are cooking for. Quantities scale by
    servings ÷ recipe servings, and a link from the plan carries its
    planned servings so a meal planned for six opens on six.
  - Litres are written with the cursive ℓ (`mℓ`, `ℓ`), which is how South
    Africa writes them. Display only: the stored unit is still `l`, so an
    export reads as the SI symbol.
  - Spoons and cups are restated in the household's own units underneath,
    since "2 cups" says nothing about how much to buy. So is an imported
    ounce in a metric kitchen.
  - Shopping lists: always display metric, rounded to sensible values
    (e.g. 477g → 480g; ≥1000g → kg with 1 decimal; ≥1000ml → l).
  - **Rounding transparency:** when a displayed quantity was rounded or
    involved an approximate conversion, prefix it with "≈"
    (e.g. "mince: ≈480g"). Exact sums (250g + 250g = 500g) show no "≈".
    The symbol carries the meaning by itself. No legend on the list.
  - Never convert volume↔mass (density-dependent). Treat them as
    incompatible families.
- `tsp`/`tbsp` etc. remain valid in recipes but consolidate via ml.

---

## 4. Data Model (Convex Schema Sketch)

```ts
// convex/schema.ts (sketch, agents may refine)
households: {
  name: string,
  createdAt: number,
}

householdMembers: {
  householdId: Id<"households">,
  userId: string,            // Clerk subject
  name: string,              // display name, captured on join
  role: "owner" | "member",
  joinedAt: number,
}

householdInvites: {
  householdId: Id<"households">,
  token: string,
  createdBy: string,
  createdAt: number,
  expiresAt: number,
  acceptedBy?: string,       // set once, the link is single use
  acceptedAt?: number,
}

recipes: {
  householdId: Id<"households">,
  title: string,
  description?: string,
  servings: number,
  prepTimeMinutes?: number,
  cookTimeMinutes?: number,
  tags: string[],
  ingredients: {
    name: string,
    quantity?: number,
    unit: Unit,              // as entered by user
    note?: string,
  }[],
  steps: string[],
}

plannedMeals: {
  householdId: Id<"households">,
  date: string,              // "YYYY-MM-DD"
  slot: "breakfast" | "lunch" | "dinner",  // MVP UI: dinner only
  recipeId: Id<"recipes">,
  servings: number,
}

shoppingLists: {
  householdId: Id<"households">,
  name: string,
  createdAt: number,
}

shoppingListItems: {
  householdId: Id<"households">,
  listId: Id<"shoppingLists">,
  name: string,
  quantity?: number,         // canonical metric where applicable
  unit: Unit,
  checked: boolean,
  manuallyAdded: boolean,
  approximate: boolean,      // true if rounded/converted → display "≈"
  sourceRecipeIds: Id<"recipes">[],  // for traceability
}
```

Indexes: by `householdId` on all data tables; `plannedMeals` by
`(householdId, date)`; `shoppingListItems` by `listId`;
`householdMembers` by `userId` and by `householdId`;
`householdInvites` by `token` and by `householdId`.

---

## 5. Routes / Screens

| Route               | Screen                                             |
| ------------------- | -------------------------------------------------- |
| `/`                 | Landing (marketing-lite) → sign in                 |
| `/recipes`          | Recipe list (search, tag filter, FAB add)          |
| `/recipes/new`      | Create recipe form                                 |
| `/recipes/:id`      | Recipe detail (cook mode friendly)                 |
| `/recipes/:id/edit` | Edit recipe                                        |
| `/plan`             | Weekly dinner plan (default: current week)         |
| `/lists`            | Shopping lists index                               |
| `/lists/:id`        | Shopping list detail (check-off UI)                |
| `/household`        | Members, invite link, rename, leave                |
| `/join/:token`      | Accept an invite, choose what happens to your data |

**Mobile navigation:** bottom tab bar with 3 tabs (Recipes, Plan, Lists)
plus a household link and the profile/avatar (Clerk) in the top bar. On
desktop, tabs can become a sidebar or top nav.

---

## 6. UX / Design

The [design specification](./DESIGN_Specification.md) is the authority on
look and feel. It carries the full token set, type scale and component
rules. This section is the summary.

**Vibe:** warm, edible, unfussy. A paper notebook that happens to be an
app, not a SaaS dashboard.

- **Palette:** paper neutrals, one green, one tomato accent.
  - Surfaces: warm cream paper tones (`--paper-50` background,
    `--paper-100` cards).
  - Text: warm near-black ink (`--ink-900`, `--ink-600`, `--ink-400`).
  - Primary: basil green (`--basil-700`) for primary actions and "done"
    states only.
  - Accent: tomato (`--tomato-600`) for the single loud CTA per screen
    (e.g. "Generate list") and for destructive actions.
  - Tags and badges are quiet bordered chips, not coloured pills.
- Tokens live in `@theme` or the Tailwind config. No raw hex in
  components.
- Depth comes from a 1px border plus a tone shift, not shadows. Radius is
  10px on cards and inputs, 8px on buttons, full on the FAB and
  checkboxes. Shadows are reserved for things that float: the FAB, bottom
  sheets, the sticky bottom bar.
- Typography: Fraunces for headings and recipe titles, Inter for UI and
  body, tabular-nums for quantities.
- Touch targets at least 44px, list rows at least 52px.
- Checked shopping items: strikethrough + tint + slide to a collapsed
  "Done" section at the bottom.
- Empty states: an icon, one line, one sentence, one button. Calm and
  specific copy ("Nothing planned this week"), no exclamation marks, at
  most one emoji anywhere.
- Loading via skeletons, not spinners, where practical.
- Motion is restrained: 150ms to 250ms, ease-out, and honour
  `prefers-reduced-motion`.
- Respect safe areas (notches) on mobile; sticky bottom nav.
- **Dark mode is out of MVP scope.** The tokens are structured so it
  becomes a swap later, but do not half-implement it now. A half-themed
  app is worse than a light-only one.

Accessibility: semantic HTML, labels on all form inputs, sufficient color
contrast (don't rely on green alone for state), keyboard navigable.

---

## 7. Non-Functional Requirements

- Optimistic updates for check-offs and plan changes (Convex handles
  reactivity; UI should feel instant).
- All Convex functions resolve the caller's household from the verified
  Clerk identity and check every document against it. Never trust a
  client-passed user or household id.
- Input validation on both client and Convex mutations.
- Unit conversion utility must have thorough unit tests (merging,
  rounding, "≈" flagging, incompatible families).
- Household joining, leaving and member removal must have tests. They move
  and delete data, so a regression there is not recoverable from the UI.
- Works well on 360px-wide viewports.
- Offline support is NOT in MVP, but it is the first post-MVP milestone
  (see §8). Avoid architectural decisions that would block a PWA
  (e.g. keep list rendering logic client-side and data access behind
  clean hooks).

---

## 8. Post-MVP Roadmap

**Milestone 1 (done): PWA / offline shopping lists**

- Installable PWA (manifest, icons, service worker).
- Shopping list view works offline: cached list data, check-offs queued
  locally and synced when back online.
- Your own recipes are cached the same way and readable with no
  connection, because a kitchen is a room with thick walls. Read only:
  writing a recipe needs the server, so nothing is queued.
- HTML is never cached, because pages are server rendered with the
  signed-in user's Clerk state and a cached copy would outlive the
  session on a shared phone. The `/offline` route carries the saved copy
  instead, and reads the requested URL to decide what to hand back: that
  recipe, the book, or that list. A phone that locks in a shop and drops
  the tab still comes back to the list.
- Signing out clears both caches. They have to outlive the session to be
  worth having, but not the person, on a shared family phone.
- Rationale: shopping happens in stores with bad signal, and this is
  the gap users will notice most.

**Milestone 2: sharing between households**

- Link two households so each can read the other's recipes, without
  sharing a plan or a shopping list.
- Copy a recipe you can read into your own book, with a line saying
  where it came from.
- A public explore feed for households that want their recipes read by
  anyone.
- The [sharing specification](./SHARING_Specification.md) is the
  authority on it: schema additions, the read rule, and the phasing.

**Later / Nice-to-Have:**

1. **Recipe import from the web:** search/import recipes from external
   sources (e.g. parsing schema.org/Recipe JSON-LD from a pasted URL is a
   good first step; full search integration later). Design the recipe
   model so imported recipes fit cleanly.
2. **Balanced meal plan suggestions:** suggest weekly plans that vary
   cuisine/protein/carb base (e.g. avoid 4 pasta dinners in a row). Tags
   on recipes are the foundation for this, so keep tags flexible.
3. **Breakfast/lunch slots in the UI** (data model already supports them).
4. Recipe images (Convex file storage).
5. Pantry tracking (subtract what you already have).
6. User-configurable unit preference (imperial display mode).
7. Dark mode, by swapping the token values the MVP already ships.

---

## 9. Acceptance Criteria (MVP Done When…)

- [ ] User can sign up/in with Clerk and only sees their household's data.
- [ ] A new user lands in a household of one without doing anything.
- [ ] User can send an invite link, and the person who opens it joins the
      household and sees the same recipes, plan and lists.
- [ ] Joining asks what happens to the data you already have, and bringing
      it across is the default.
- [ ] User can create, edit, delete, search recipes with ingredients,
      quantities, units (metric + imperial), and steps.
- [ ] User can assign recipes to days on a weekly dinner plan and navigate
      weeks.
- [ ] User can generate a shopping list from the current week's plan.
- [ ] Generated list merges duplicates: 2 × "250g mince" → "mince: 500g";
      2 × "tin tomatoes" → "tin tomatoes x2".
- [ ] Imperial inputs consolidate correctly into metric on lists
      (e.g. 250g + 8oz mince → "≈480g").
- [ ] Rounded/converted quantities display "≈"; exact sums do not.
- [ ] Volume↔mass never auto-converted; incompatible units stay as
      separate lines.
- [ ] User can check off, add, edit, and remove list items; checked state
      persists across reloads.
- [ ] Fully usable on a 360px-wide phone with bottom tab navigation.
- [ ] The paper/basil/tomato theme from the design spec is applied
      consistently, with every colour coming from a token rather than a
      raw hex value.
- [ ] Codebase lints clean with oxlint and is formatted with oxfmt.
