# Mealy Design Specification: "Kitchen Table"

A look and feel guide for Mealy. The goal is warm, edible and unfussy. Like
a well-worn recipe card, not a SaaS dashboard.

This guide is the authority on visual design. Where it disagreed with the
[MVP specification](./MVP_Specification.md), the MVP spec has been updated
to match. See §9 for the list.

---

## 1. Design Direction

Mealy should feel like a paper notebook that happens to be an app: warm
paper tones, one confident green, honest typography, and zero decorative
noise.

What we are avoiding:

- Glassmorphism, gradient blobs, purple anything.
- Emerald-600 on white with `rounded-2xl shadow-lg` on every card, the
  default "AI-generated Tailwind app" look.
- Emoji as UI decoration. One in an empty state is fine. Sprinkled
  everywhere is not.
- Hero sections with "Effortlessly manage your..." copy.
- Icons for the sake of icons, and drop shadows for the sake of depth.

What we are leaning into:

- **Paper, not white.** The base surface is a warm cream. Cards sit on it
  via borders and tone shifts, not shadows. Shadows are reserved for
  things that actually float: bottom sheets and the FAB.
- **One green, used sparingly.** Green is for primary actions and "done"
  states only. Most of the UI is ink on paper. When everything is green,
  nothing is.
- **Flat with texture.** Depth comes from a 1px border plus a slightly
  different surface tone. It reads calm.
- **Editorial typography.** A serif for headings gives it a cookbook feel
  and kills the template look.

---

## 2. Colour

The palette is paper neutrals, one green and one tomato accent. Three
competing hues (emerald, orange, amber) became two.

Define as CSS custom properties and map them into Tailwind (v4 `@theme`
or config):

```css
:root {
  /* Paper (surfaces): warm, slightly yellow-shifted */
  --paper-50: #faf7f0; /* app background */
  --paper-100: #f3eee2; /* card fill, inputs */
  --paper-200: #e7dfcd; /* borders, dividers */
  --paper-300: #d3c8ae; /* strong borders, disabled text bg */

  /* Ink (text): warm near-black, never pure #000 */
  --ink-900: #262115; /* headings, primary text */
  --ink-600: #5c5443; /* body secondary */
  --ink-400: #6f6652; /* placeholders, meta, timestamps */

  /* Basil (primary): a deep herb green, not emerald */
  --basil-700: #2d5a3d; /* buttons, active tab, links */
  --basil-800: #234a31; /* pressed */
  --basil-100: #dfeadf; /* selected-state tint, checked rows */

  /* Tomato (accent): the one loud CTA per screen, and destructive */
  --tomato-600: #c8442c; /* "Generate list", delete confirm */
  --tomato-700: #a83722;

  /* Semantic */
  --success: var(--basil-700);
  --danger: var(--tomato-600);
  --danger-text: var(--tomato-700); /* destructive *text*, see below */
}
```

Usage rules, which are the important part:

| Element         | Colour                                     |
| --------------- | ------------------------------------------ |
| App background  | `paper-50`                                 |
| Card, list row  | `paper-100` + 1px `paper-200` border       |
| Primary button  | `basil-700` fill, `paper-50` text          |
| The one big CTA | `tomato-600` fill, max one per screen      |
| Tag, badge      | `paper-100`, `paper-300` border, `ink-600` |
| Checked item    | `basil-100` tint, strikethrough `ink-400`  |
| Focus ring      | 2px `basil-700`, 2px offset                |

Dark mode is out of MVP scope, but these tokens make it a swap later
(dark paper `#1c1913`, and so on). Do not half-implement it now.

Contrast: `ink-900` on `paper-50` is about 15:1, `basil-700` on `paper-50`
is about 7.4:1, and `paper-50` text on `basil-700` passes AA. Never signal
state with green alone. Checked items get strikethrough plus tint, not just
a green tick.

Two of these values were darkened after measuring them, because the first
draft did not clear 4.5:1:

- `ink-400` was `#8f8672`, which is 3.4:1 on `paper-50` and only 2.9:1 on
  the `basil-100` of a ticked shopping list row. At `#6f6652` the worst
  pairing is 4.6:1. Meta text is 13px, so it is not "large" and the 3:1
  allowance does not apply.
- Destructive *text* uses `tomato-700`, not `tomato-600`. Tomato-600 is
  4.2:1 on a `paper-100` card, under the line. Tomato-600 stays as the
  accent fill, where the text on top of it is `paper-50` at 4.5:1.

Anything added to this palette gets measured before it ships.

---

## 3. Typography

Two families, both free (Google Fonts or Fontsource):

- **Headings and recipe titles:** Fraunces (variable, optical sizing on).
  A warm, slightly quirky serif for the cookbook feel. Use weights 500 to
  600, never 900.
- **UI and body:** Inter, or the system stack if you want zero font cost
  on body. Weights 400, 500 and 600 only.
- **Quantities and numbers:** Inter with `font-variant-numeric:
  tabular-nums` so shopping list quantities align. Every digit in the app
  is Inter, including step numbers and the dates in the week rail.
  Fraunces figures are handsome and slow to read, and a number is read at
  a glance rather than looked at.

Scale, mobile-first, in rem:

| Token         | Size / line          | Use                                 |
| ------------- | -------------------- | ----------------------------------- |
| `hero`        | 40-76 fluid, Fraunces 600 | Landing hero only              |
| `section`     | 30-48 fluid, Fraunces 600 | Landing section headings only  |
| `lead`        | 18-20 fluid, Inter 400    | Landing lead paragraphs only   |
| `display`     | 28/34, Fraunces 600  | Recipe detail title, screen headers |
| `title`       | 20/26, Fraunces 500  | Card titles, list names             |
| `body`        | 16/24, Inter 400     | Everything readable                 |
| `body-strong` | 16/24, Inter 600     | Ingredient names, buttons           |
| `meta`        | 13/18, Inter 500     | "35 min · serves 4", timestamps     |

`meta` is set in `ink-400`, and 13px is the floor. Nothing renders smaller.

The first three are the landing page's, and nothing under `/_app` uses
them. A marketing page has to sell where a screen has to be worked in, so
it gets type the app scale does not carry. They are fluid rather than
stepped through breakpoints, which is why the landing page no longer
reaches for raw Tailwind sizes.

Cook mode on the recipe detail screen bumps body to 18/30. Step numbers
are set in Inter 600 at title size in `basil-700`, the column is capped
at about 34ch, and steps get `space-y-6`. This screen is read from a metre
away with floury hands. It should feel like a page, not a form.

---

## 4. Shape, Space, Depth

- **Radius:** 10px on cards and inputs, 8px on buttons, full on the FAB
  and on checkboxes. Round checkboxes read as tick-off affordances on
  shopping lists. Not `rounded-2xl` everywhere. The smaller radius plus a
  border reads more crafted.
- **Borders over shadows:** the default card is `bg-paper-100` with
  `border border-paper-200`. Shadow only on the FAB, bottom sheets, and
  the sticky bottom bar (`shadow-[0_-1px_0_var(--paper-200)]`, a hairline
  rather than a blur).
- **Spacing:** 4px base grid. Screen gutter 16px, card padding 16px, list
  row height at least 52px (comfortably over the 44px target),
  `space-y-3` between cards.
- **Dividers inside lists:** hairline `paper-200`, inset from the left to
  the text edge, iOS style. A small detail that signals someone cared.

---

## 5. Core Components

### Buttons

- **Primary:** `basil-700` fill, 44px minimum height, 8px radius, Inter
  600.
- **Accent**, one per screen: same shape, `tomato-600`.
- **Secondary:** `paper-100` fill, `paper-300` border, `ink-900` text.
- **Ghost and destructive text:** plain text in `tomato-700`. No outlined
  buttons. Three variants is enough.
- **Pressed:** darken the fill to the `-800` shade. No scale animations.

### Inputs

`paper-50` fill, lighter than the card it sits in so inputs punch through
the paper. `paper-300` border, swapping to `basil-700` on focus. Labels
are always visible above the field, never placeholder-as-label. 16px font
to stop iOS zooming.

### Bottom tab bar

`paper-50` background, hairline top border, safe-area padding. The active
tab is a `basil-700` icon and label at weight 500, inactive is `ink-400`.
Icons are Lucide at 1.75px stroke: Book, CalendarDays, ShoppingBasket. No
filled and outlined toggling, just colour.

### Recipe card (list view)

Title in Fraunces, a meta line ("40 min · serves 4"), and tags as quiet
bordered chips. No thumbnail placeholder boxes. The MVP has no images, so
the card is designed to not look like something is missing: title-forward,
with generous left padding.

### Plan, the week

A vertical list of 7 day rows, not a grid. It is a phone. Each row has the
day label in the left rail (Inter, "MON" plus the date number) and
meals as small cards to the right. Today's rail number gets a `basil-700`
circle. An empty day is a dashed `paper-300` border row with "＋ Add
dinner" in `ink-400`.

Week navigation is a sticky header, "‹ 17-23 Aug ›". The current-week
button appears only once you have navigated away.

### Shopping list rows

```
[ round checkbox ]  name                    ≈480g
```

The quantity is right-aligned, tabular-nums, `ink-600`. The ≈ is part of
the quantity string and is set in `ink-400`: quiet, exactly as the MVP
spec intends.

Checked rows tint to `basil-100` and strike through, then slide into a
collapsed "Done (6)" section at the bottom after about 300ms. The delay
stops rapid ticking from making rows fly around under your thumb.

Manual items get no visual difference. A shopping list is a shopping list.

### Empty states

A small line illustration or a single large Lucide icon in `paper-300`,
one Fraunces line ("Nothing planned this week"), one sentence in
`ink-600`, and one primary button. No emoji required. If one is used, it
is exactly one.

---

## 6. Motion

Restraint is the brand. Durations 150ms to 250ms, ease-out.

- Checkbox tick: 150ms scale-in of the check, then the delayed slide to
  done.
- Bottom sheets (add to plan, generate list options): slide up over
  250ms. Prefer sheets over modals everywhere on mobile.
- Skeletons: paper-toned, a `paper-200` shimmer on `paper-100`, matching
  real layout heights. No grey-on-white flash.
- No page transition animations, no springy bounces, nothing on scroll.
- Respect `prefers-reduced-motion`: kill the slides, keep instant state
  changes.

---

## 7. Voice and Microcopy

- Calm and specific, and short. "Add dinner", not "Add a new meal to your
  plan!"
- Buttons are verbs: "Generate list", "Invite someone", "Leave
  household".
- Destructive confirms state the consequence: "Remove Thandi? She'll keep
  nothing, recipes stay with the household."
- Dates in SA format where written out: "Week of 17 Aug".
- Metric everywhere, as specified.

---

## 8. Implementation Notes

- Every token above goes in `@theme` or the Tailwind config. Never raw
  hex in components. This is also what makes the "consistent theme"
  acceptance criterion checkable.
- Build 8 primitives first and compose everything from them: Button,
  Input, Card, ListRow, Checkbox, Chip, Sheet, EmptyState. If a screen
  needs something outside these, question the screen.
- One `PageHeader` component (Fraunces title plus an optional action) so
  every screen opens identically.
- Fonts are self-hosted via Fontsource with `font-display: swap`. Subset
  Fraunces to latin. It is heading-only, so the payload is small.

---

## 9. Deviations From the MVP Specification

These are resolved. The MVP spec has been updated to match this guide.

1. **Palette.** Emerald, orange and amber are replaced by basil, tomato
   and paper: fewer hues, warmer, less default-Tailwind. MVP spec §6 and
   the theme acceptance criterion in §9 now say so.
2. **Shape and depth.** `rounded-2xl` plus soft shadows becomes a 10px
   radius plus 1px borders, with shadows reserved for floating surfaces.
   MVP spec §6 updated.
3. **Plan layout.** The MVP spec described the week loosely as "7 days".
   This guide commits to a vertical day-rail list rather than a grid. MVP
   spec §3.3 updated.
4. **Empty state copy.** The MVP spec's example
   ("No recipes yet, add your first! 🥕") uses an exclamation mark and an
   emoji. The copy rules in §7 replace it. MVP spec §6 updated.

Everything else in the MVP spec (checked-item behaviour, the ≈ display,
empty states, skeletons, 44px targets) is compatible with this guide as
written.
