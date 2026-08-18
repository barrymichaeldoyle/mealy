# Mealy Plan — MVP Specification

A mobile-first cooking helper app: store recipes, plan weekly dinners, and
generate consolidated shopping lists.

---

## 1. Overview

**Elevator pitch:** Mealy Plan lets users save their recipes, schedule
dinners onto a weekly plan, and auto-generate a smart shopping list with
merged ingredient quantities (e.g. "tin tomatoes x2", "500g mince" instead
of duplicates).

**Primary platform:** Mobile web (majority of users are on phones). Desktop
should work but mobile is the design priority.

**Locale:** Primary audience is South African — metric-first. Imperial
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
| Deployment   | Any Node/edge-friendly host (e.g. Netlify/Vercel) |

Conventions:

- TypeScript everywhere, strict mode.
- Convex functions in `convex/`, one file per domain (recipes, plans, lists).
- Use Clerk's Convex integration (`ctx.auth.getUserIdentity()`) — all data is
  scoped per user.
- Print width 80.

---

## 3. Core Features (MVP Scope)

### 3.1 Auth

- Sign up / sign in via Clerk (email + Google at minimum).
- All app routes behind auth except a simple landing page.

### 3.2 Recipes (CRUD)

- Create, view, edit, delete recipes.
- Recipe fields:
  - `title` (required)
  - `description` (optional, short)
  - `servings` (number, default 2)
  - `prepTimeMinutes`, `cookTimeMinutes` (optional)
  - `tags` (string array, freeform — e.g. "pasta", "chicken", "veggie")
  - `ingredients[]`:
    - `name` (required, e.g. "tin tomatoes")
    - `quantity` (number, optional — some items are "to taste")
    - `unit` (see §3.5 for supported units)
    - `note` (optional, e.g. "finely chopped")
  - `steps[]` (ordered strings)
- No images in MVP.
- Recipe list view: searchable by title, filterable by tag.
- Recipe detail view: ingredients + steps, readable while cooking
  (large text, generous spacing on mobile).

### 3.3 Meal Plan (weekly dinner schedule)

- **Dinner-first:** the weekly view is 7 days, each day showing its dinner.
  This is the core, polished experience.
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
    most readable unit → `mince — 500g` (from 2 × 250g; 1500g → 1.5kg).
  - Countable units (`item`, `tin`, `pack`): sum count → `tin tomatoes x2`.
  - Incompatible families for the same name (e.g. "flour 200g" +
    "flour 1 cup"): keep as separate line items — do NOT guess
    volume↔mass conversions.
  - Scale quantities by planned servings ÷ recipe servings.
- List item fields: `name`, `quantity`, `unit`, `checked` (boolean),
  `manuallyAdded` (boolean), `approximate` (boolean — see §3.5 rounding).
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
- **Conversion table (fixed constants, no external service):**
  - `1 kg = 1000 g`, `1 oz = 28.35 g`, `1 lb = 453.6 g`
  - `1 l = 1000 ml`, `1 tsp = 5 ml`, `1 tbsp = 15 ml`,
    `1 cup = 250 ml` (metric cup — acceptable approximation for US 240ml
    cups; do not build regional cup handling), `1 fl oz = 29.57 ml`,
    `1 pint = 473 ml` (US)
  - Implement as a single pure, well-tested utility module shared by
    recipe display and list consolidation.
- **Display rules:**
  - Recipes: show units as entered (respect the author's recipe).
  - Shopping lists: always display metric, rounded to sensible values
    (e.g. 477g → 480g; ≥1000g → kg with 1 decimal; ≥1000ml → l).
  - **Rounding transparency:** when a displayed quantity was rounded or
    involved an approximate conversion, prefix it with "≈"
    (e.g. "mince — ≈480g"). Exact sums (250g + 250g = 500g) show no "≈".
    A small one-line note on the list screen explains it, e.g.
    "≈ means quantities are rounded for convenience."
  - Never convert volume↔mass (density-dependent) — treat as
    incompatible families.
- `tsp`/`tbsp` etc. remain valid in recipes but consolidate via ml.

---

## 4. Data Model (Convex Schema Sketch)

```ts
// convex/schema.ts (sketch — agents may refine)
recipes: {
  userId: string,
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
  userId: string,
  date: string,              // "YYYY-MM-DD"
  slot: "breakfast" | "lunch" | "dinner",  // MVP UI: dinner only
  recipeId: Id<"recipes">,
  servings: number,
}

shoppingLists: {
  userId: string,
  name: string,
  createdAt: number,
}

shoppingListItems: {
  userId: string,
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

Indexes: by `userId` on all tables; `plannedMeals` by `(userId, date)`;
`shoppingListItems` by `listId`.

---

## 5. Routes / Screens

| Route               | Screen                                     |
| ------------------- | ------------------------------------------ |
| `/`                 | Landing (marketing-lite) → sign in         |
| `/recipes`          | Recipe list (search, tag filter, FAB add)  |
| `/recipes/new`      | Create recipe form                         |
| `/recipes/:id`      | Recipe detail (cook mode friendly)         |
| `/recipes/:id/edit` | Edit recipe                                |
| `/plan`             | Weekly dinner plan (default: current week) |
| `/lists`            | Shopping lists index                       |
| `/lists/:id`        | Shopping list detail (check-off UI)        |

**Mobile navigation:** bottom tab bar with 3 tabs — Recipes, Plan, Lists —
plus profile/avatar (Clerk) in top bar. On desktop, tabs can become a
sidebar or top nav.

---

## 6. UX / Design

**Vibe:** fresh, healthy, friendly.

- **Palette:**
  - Primary: greens (e.g. Tailwind `emerald-600` for actions,
    `emerald-50` for tinted backgrounds).
  - Accents: warm orange (`orange-500`) for highlights/CTAs like
    "Generate list", soft yellow (`amber-100/400`) for tags & badges.
  - Neutrals: warm grays / off-white (`stone-*`) rather than cold gray.
- Rounded corners (`rounded-2xl` on cards), soft shadows, generous
  touch targets (min 44px).
- Checked shopping items: strikethrough + fade + slide to bottom.
- Empty states with friendly copy & a clear CTA
  ("No recipes yet — add your first! 🥕").
- Loading via skeletons, not spinners, where practical.
- Respect safe areas (notches) on mobile; sticky bottom nav.

Accessibility: semantic HTML, labels on all form inputs, sufficient color
contrast (don't rely on green alone for state), keyboard navigable.

---

## 7. Non-Functional Requirements

- Optimistic updates for check-offs and plan changes (Convex handles
  reactivity; UI should feel instant).
- All Convex functions validate ownership (`userId` match) — never trust
  client-passed user IDs.
- Input validation on both client and Convex mutations.
- Unit conversion utility must have thorough unit tests (merging,
  rounding, "≈" flagging, incompatible families).
- Works well on 360px-wide viewports.
- Offline support is NOT in MVP, but it is the first post-MVP milestone
  (see §8) — avoid architectural decisions that would block a PWA
  (e.g. keep list rendering logic client-side and data access behind
  clean hooks).

---

## 8. Post-MVP Roadmap

**Milestone 1 (first priority after MVP): PWA / offline shopping lists**

- Installable PWA (manifest, icons, service worker).
- Shopping list view works offline: cached list data, check-offs queued
  locally and synced when back online.
- Rationale: shopping happens in stores with bad signal — this is the
  gap users will notice most.

**Later / Nice-to-Have:**

1. **Recipe import from the web:** search/import recipes from external
   sources (e.g. parsing schema.org/Recipe JSON-LD from a pasted URL is a
   good first step; full search integration later). Design the recipe
   model so imported recipes fit cleanly.
2. **Balanced meal plan suggestions:** suggest weekly plans that vary
   cuisine/protein/carb base (e.g. avoid 4 pasta dinners in a row). Tags
   on recipes are the foundation for this — keep tags flexible.
3. **Breakfast/lunch slots in the UI** (data model already supports them).
4. Recipe images (Convex file storage).
5. Sharing lists/plans with household members.
6. Pantry tracking (subtract what you already have).
7. User-configurable unit preference (imperial display mode).

---

## 9. Acceptance Criteria (MVP Done When…)

- [ ] User can sign up/in with Clerk and only sees their own data.
- [ ] User can create, edit, delete, search recipes with ingredients,
      quantities, units (metric + imperial), and steps.
- [ ] User can assign recipes to days on a weekly dinner plan and navigate
      weeks.
- [ ] User can generate a shopping list from the current week's plan.
- [ ] Generated list merges duplicates: 2 × "250g mince" → "mince — 500g";
      2 × "tin tomatoes" → "tin tomatoes x2".
- [ ] Imperial inputs consolidate correctly into metric on lists
      (e.g. 250g + 8oz mince → "≈480g").
- [ ] Rounded/converted quantities display "≈" with an explanatory note;
      exact sums do not.
- [ ] Volume↔mass never auto-converted; incompatible units stay as
      separate lines.
- [ ] User can check off, add, edit, and remove list items; checked state
      persists across reloads.
- [ ] Fully usable on a 360px-wide phone with bottom tab navigation.
- [ ] Green/orange/yellow "healthy" visual theme applied consistently.
- [ ] Codebase lints clean with oxlint and is formatted with oxfmt.
