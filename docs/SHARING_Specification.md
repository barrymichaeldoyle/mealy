# Mealy Sharing Specification: linked kitchens and explore

How recipes travel between households. This covers three related
features: linking two households so they can read each other's recipes,
copying a recipe you can see into your own collection with attribution,
and a public explore feed for households that want their recipes read by
anyone.

Read the [MVP specification](./MVP_Specification.md) for the data model
this builds on, and the [design specification](./DESIGN_Specification.md)
for look and feel. Both remain the authority on everything they already
cover.

---

## 1. The problem

A household is the unit of ownership, and that is right for the people
who cook together. It is wrong for everyone else you cook like. You do
not want to share a meal plan and a shopping list with your in-laws, but
you do want their bobotie. Your best friend's curry should be one tap
from your own book, not a screenshot.

Today the only way to see another household's recipe is to join that
household, which merges plans and lists you have no interest in sharing.
Linking fixes that: two households stay separate, and each can read the
other's recipes.

---

## 2. Decisions taken

These are settled, and the rest of the document assumes them.

**Ownership never moves.** A recipe belongs to exactly one household for
its whole life. Sharing changes who can read it, never who owns it.

**Sharing is read-only.** You can never edit, delete or retag another
household's recipe. The only thing you can do with it is read it, star
it, or copy it.

**A copy is a snapshot.** Copying writes a new recipe into your
household. Later edits by the author do not reach your copy, and your
edits do not reach theirs. This is the same trade-off the shopping list
already makes with its ingredient snapshots.

**Plans and lists only ever reference your own recipes.** `plannedMeals`
and `shoppingListItems.sourceRecipeIds` must not point outside the
household. Planning someone else's recipe copies it first, in one
action. Without this rule, unlinking or a delete on their side would
leave a week of dinners pointing at rows you cannot read.

**Linking is mutual.** There is no one-way follow. Accepting a link
means both households can read each other's shared recipes. Either side
can unlink at any time, on their own.

**Linking is by invite link.** There is no household directory and no
search for people. You cannot be found, only invited. This matches how
household invites already work, and it keeps the abuse surface small.

**Visibility is per recipe, and it is a ladder.** Household, then
linked, then public. Each level includes the one before it.

---

## 3. Visibility

Every recipe carries one of three levels.

| Level       | Who can read it                                    |
| ----------- | -------------------------------------------------- |
| `household` | Members of the owning household only               |
| `linked`    | The above, plus every linked household             |
| `public`    | The above, plus any signed-in user, via explore    |

`linked` is the default for new recipes and for the backfill, because
linking is already an explicit, mutual, invite-only act. Someone who
links kitchens with you has said they want to see your recipes, and a
default of `household` would mean the feature does nothing until you
visit every recipe and flip a switch.

`public` is never a default and is never reached by accident. It takes a
deliberate action per recipe, behind a confirm that says the household
name goes public with it.

A household with no links has nothing to think about: `linked` and
`household` behave identically until the first link exists.

---

## 4. Linked kitchens

### Creating a link

1. A member of household A opens `/household` and taps "Link a kitchen".
2. That creates a single-use link invite with a 7 day expiry, and gives
   them a `/link/{token}` URL to send however they like.
3. A member of household B opens the URL, sees which household is
   asking, how many recipes they share and who is in it, and either
   accepts or does not.
4. Accepting writes one `householdLinks` row. Both households now see
   each other's `linked` recipes.

One live link invite per household at a time, and creating a new one
retires the old one. This mirrors `householdInvites` exactly, so the
behaviour is already familiar and already explained in the UI copy.

Opening a link invite for a household you are already linked to is not
an error. It says so and offers the way back to explore.

Opening your own household's link invite is not an error either. It says
the link was meant for someone else.

### Unlinking

Either household can unlink, from `/household`, with a confirm that
states the consequence: "Unlink Sipho's kitchen? You each keep the
recipes you have copied. Neither of you can see the other's book any
more." Unlinking is immediate and does not notify the other side beyond
their book going quiet.

Copies already made survive unlinking. Attribution behaviour is in §5.

### Limits

- A household can hold at most 20 links. That is a family and a few
  friends, not a network. It also caps the fan-out of the read path in
  §10.
- Link invites expire after 7 days, matching household invites.

---

## 5. Copying, and where a recipe came from

### The copy action

Copy is available on any recipe you can read but do not own. It writes a
new recipe into your household with every field duplicated, visibility
reset to your default (`linked`), and a `copiedFrom` record attached.

Copying is not silent about duplicates. If you already hold a copy of
that exact recipe, the button reads "Copy again" and the detail page
says you copied it before, with a link to your copy. It still lets you,
because a second copy you then edit is a legitimate thing to want.

"Add to plan" on a shared recipe copies it and then plans the copy, in
one mutation and one tap. The confirmation says both happened: "Copied
to your recipes and added to Thursday."

### Attribution

`copiedFrom` stores the source recipe id, the source household id, the
source household name as it read at the time, and the timestamp.

The recipe detail page shows a single quiet line under the title, "From
Sipho's kitchen", while the source recipe document still exists. The
line becomes a link through to the source only when you can still read
it, so unlinking downgrades the link to plain text rather than breaking
it. If the source recipe is deleted, the line disappears and the copy
simply stands on its own.

The stored name is a snapshot, so a household rename does not rewrite
history on copies. That is deliberate: the name is a record of what you
saw when you copied, not a live pointer.

Attribution is one hop. If B copies from A and C copies from B, C's copy
says "From B's kitchen". No chains, no "originally by", no graph to
walk. The person who gave you the recipe is the useful answer.

Editing a copy keeps the attribution. Changing every ingredient does not
change where you got it.

### What the author sees

The author sees a count on their own recipe: "Copied 4 times". They do
not see who copied it. A count is enough encouragement, and identities
would make copying feel observed.

---

## 6. Stars

A star is a household-level bookmark. Anyone in the household can star a
recipe they can read, and the whole household sees it in one saved list
at `/explore` under "Starred". Stars are for recipes you have not copied
yet, or public recipes you want to come back to.

Starring is not copying and does not survive losing access. If a link is
removed or a recipe stops being public, the star stays in the table but
the saved list quietly filters it out, since the read rule in §10 no
longer passes. Nothing errors and nothing is deleted.

The star count on a recipe is public in explore and is the default sort
there. The author sees it on their own recipe next to the copy count.

Stars are also the honest answer to "how do I keep a recipe I do not
want in my book". Copy is a commitment. A star is not.

---

## 7. Explore

Explore is one route with three sections, reached from a fourth nav tab.

**Linked kitchens.** The households you are linked to, each a row with a
name, member names and a recipe count, opening into that kitchen's
shared recipes. This section is the whole feature for most people, and
it sits at the top.

**Starred.** Everything the household has starred and can still read.

**Everyone.** The public feed: recipes any household has published.
Sorted by stars by default, with "Newest" as the other option, a search
box over titles, and the tag chips the recipe list already uses.

Explore is signed-in only for now. Public recipes are readable by any
account, not by the open web. That keeps the first version out of SEO,
scraping and the legal weight of publishing to the world, and it can be
opened up later without a data model change.

### Publishing

Publishing is per recipe, from the recipe detail page, behind a sheet
that states plainly what happens:

- Anyone with a Mealy account can read it.
- It is credited to the household name, and links to nothing else about
  you.
- Anyone can copy it, and their copy is theirs to keep.
- Unpublishing removes it from explore. Copies already made stay with
  the people who made them.

A household may hold at most 100 public recipes. That is far past any
real cook and short of a spam campaign.

### Reports and takedowns

Every public recipe has a "Report" action. It writes a `recipeReports`
row with a reason from a short list, plus optional free text, and logs a
line the operator can find.

Takedown is an internal mutation run from the Convex dashboard, which
sets `blockedAt` on the recipe. A blocked recipe leaves explore, is not
copyable, and remains readable and editable by the household that owns
it. Nothing about it is deleted, and the household is not silently
lied to: their recipe detail page shows that it was removed from
explore.

This is deliberately manual. The volume does not justify a moderation
queue UI, and shipping public content with no takedown path at all is
not an option.

---

## 8. Data model changes

```ts
// convex/schema.ts additions

recipes: {
  // ...existing fields
  visibility: 'household' | 'linked' | 'public',
  copiedFrom?: {
    recipeId: Id<'recipes'>,
    householdId: Id<'households'>,
    householdName: string,   // snapshot, see 5
    copiedAt: number,
  },
  publishedAt?: number,      // set when visibility becomes public
  blockedAt?: number,        // operator takedown, see 7
  starCount: number,         // denormalised, 0 for a new recipe
  copyCount: number,         // denormalised
}
  .index('by_household', ['householdId'])                      // existing
  .index('by_household_and_visibility', ['householdId', 'visibility'])
  .index('by_visibility_and_stars', ['visibility', 'starCount'])
  .searchIndex('search_public_title', {
    searchField: 'title',
    filterFields: ['visibility'],
  })

/**
 * One row per linked pair. The two ids are stored sorted so a pair can
 * only ever be written once, and a duplicate accept is a no-op.
 */
householdLinks: {
  householdA: Id<'households'>,   // lexicographically smaller id
  householdB: Id<'households'>,
  createdAt: number,
  createdBy: string,              // Clerk subject who accepted
}
  .index('by_a', ['householdA'])
  .index('by_b', ['householdB'])
  .index('by_pair', ['householdA', 'householdB'])

/** Single use, 7 day expiry, one live per household. */
householdLinkInvites: {
  householdId: Id<'households'>,
  token: string,
  createdBy: string,
  createdAt: number,
  expiresAt: number,
  acceptedBy?: string,
  acceptedByHouseholdId?: Id<'households'>,
  acceptedAt?: number,
}
  .index('by_token', ['token'])
  .index('by_household', ['householdId'])
  .index('by_creator', ['createdBy'])

recipeStars: {
  recipeId: Id<'recipes'>,
  householdId: Id<'households'>,  // who starred it
  userId: string,                 // which member, for the record
  createdAt: number,
}
  .index('by_household', ['householdId'])
  .index('by_recipe', ['recipeId'])
  .index('by_household_and_recipe', ['householdId', 'recipeId'])

recipeReports: {
  recipeId: Id<'recipes'>,
  reportedBy: string,
  householdId: Id<'households'>,
  reason: 'spam' | 'offensive' | 'not-a-recipe' | 'other',
  detail?: string,
  status: 'open' | 'closed',
  createdAt: number,
}
  .index('by_recipe', ['recipeId'])
  .index('by_status', ['status'])
  .index('by_reporter', ['reportedBy'])
```

Notes on the shape:

- `householdLinkInvites` duplicates most of `householdInvites` rather
  than adding a `kind` field to it. The join flow that moves and deletes
  household data is the most dangerous code in the app and has tests
  around it. A second table keeps this feature away from it entirely.
- `starCount` and `copyCount` live on the recipe rather than in a stats
  table, because sorting explore by popularity needs them in an index.
  The cost is that a star from a stranger touches the author's recipe
  document and re-fires their live queries. At this scale that is fine.
  If a recipe ever gets hot enough for write contention,
  `@convex-dev/sharded-counter` is the escape hatch and only the two
  mutations that write the counts change.
- No `status` on `householdLinks`. The invite row is the pending state,
  so a link either exists or does not.

---

## 9. Function surface

New file `convex/links.ts`:

- `list` query: linked households with name, member names, shared recipe
  count, plus the live link invite token if there is one.
- `createInvite`, `revokeInvite` mutations, mirroring households.
- `invitePreview` query on a token: who is asking, what happens.
- `accept` mutation on a token.
- `unlink` mutation on a household id.

New file `convex/explore.ts`:

- `kitchen` query: one linked household's `linked` and `public` recipes.
- `feed` paginated query: public recipes by stars or by recency.
- `search` query: public recipes by title, over the search index.
- `starred` query: the household's stars, filtered by readability.
- `recipe` query: one recipe by id, read through the rule in §10,
  returning the recipe plus its attribution and whether you own it.
- `report` mutation.

Added to `convex/recipes.ts`:

- `setVisibility` mutation, with the public cap and `publishedAt`.
- `copy` mutation, returning the new recipe id.
- `copyAndPlan` mutation, for the shared-recipe "Add to plan" path.
- `star` and `unstar` mutations.

Added to `convex/lib/sharing.ts` (new):

- `linkedHouseholdIds(ctx, householdId)`: both indexed queries, merged.
- `canRead(ctx, recipe, householdId)`: the one rule from §10.
- `pairKey(a, b)`: the sorted pair used by `householdLinks`.

The public feed uses `paginate`, not `.collect()`. Every existing query
collects because every existing query is bounded by one household. The
public feed is not bounded by anything, and must never be written as a
collect.

Hooks follow the existing pattern in `src/hooks/`, in a new
`use-sharing.ts`. Components still never call Convex directly.

---

## 10. The read rule

Everything in this feature reduces to one function, and every read path
goes through it:

```ts
canRead(recipe, viewerHouseholdId, linkedIds):
  recipe.householdId === viewerHouseholdId              -> true
  recipe.blockedAt                                      -> false
  recipe.visibility === 'public'                        -> true
  recipe.visibility === 'linked'
    && linkedIds.has(recipe.householdId)                -> true
  otherwise                                             -> false
```

Write paths do not change at all. `assertHousehold` stays exactly as it
is, and every mutation that edits or deletes a recipe keeps using it.
The only mutations that touch a document outside your household are
`star`, `unstar` and the count bumps inside `copy`, and each of those
must call `canRead` first.

`recipes.get` keeps its current behaviour and stays household-only, so
the cook-mode page cannot accidentally start rendering other people's
recipes. Shared reads go through `explore.recipe`, which returns a
narrower shape: no ability to edit, and the attribution attached.

---

## 11. Routes and screens

| Route                       | Screen                                    |
| --------------------------- | ----------------------------------------- |
| `/explore`                  | Linked kitchens, starred, public feed     |
| `/explore/kitchens/$id`     | One linked kitchen's recipes              |
| `/explore/recipes/$id`      | Read-only recipe, with copy and star      |
| `/link/$token`              | Accept a kitchen link                     |
| `/household`                | Gains a "Linked kitchens" card            |
| `/recipes/$id`              | Gains visibility, attribution and counts  |

The bottom tab bar goes from three tabs to four: Recipes, Plan, Lists,
Explore. At 360px that is 90px per tab, comfortably past the 44px
minimum. `AppNav` moves from `grid-cols-3` to `grid-cols-4` and the
sidebar is unaffected.

The read-only recipe view must not be a second implementation of the
cook-mode page. Pull the body of `/recipes/$id` into
`src/components/recipe-view.tsx` first, taking the recipe and an
optional actions slot, and render both pages from it. A shared recipe
should look identical to your own, minus edit and delete.

---

## 12. Design and copy

The design specification governs. Specific decisions this feature adds:

- Visibility is a quiet control on the recipe detail page, not a badge
  on every card in the list. A recipe list peppered with "Shared" chips
  is noise. The one exception is `public`, which shows a small chip on
  the recipe detail page only.
- Attribution is `text-meta text-ink-400`, one line, directly under the
  title. It should read like a note in the margin.
- Copy is a secondary button on a shared recipe. The single loud tomato
  CTA on that page is "Add to plan", because planning is the point.
- Explore rows reuse `RecipeCard` with the household name in the meta
  line: "Sipho's kitchen · 40 min · serves 4".
- Copy and star counts show only where they mean something. On your own
  recipe they read "Copied 4 times". In explore they read as a star
  count next to the title. A recipe with no stars shows nothing, not a
  zero.
- Empty states, in the house voice, one line and one action: "No linked
  kitchens yet" with "Link a kitchen", "Nothing starred yet", and
  "Nothing published yet" on an empty public feed.
- Confirms state the consequence, as in the design spec: "Unlink
  Sipho's kitchen? You each keep the recipes you have copied."

---

## 13. Offline

Nothing here is offline. The service worker caches shopping lists and
your own recipes, and it must not cache other households' recipes, the
public feed or explore search. Browsing somebody else's book is a thing
you do on the sofa with signal, and caching it would put other people's
data in your device's cache with no way to expire it when a link is
removed.

`/explore` and its children fall through to the existing `/offline`
route when there is no connection.

---

## 14. Privacy, terms and deletion

The [privacy policy](../src/routes/privacy.tsx) and
[terms](../src/routes/terms.tsx) both need edits before any of this
ships. Public content is a promise you cannot walk back quietly.

**Privacy policy** gains a section on sharing: what a linked household
can see (your `linked` recipes and your household name, nothing else),
what a public recipe exposes (the recipe and the household name), and
the fact that copies other people made are their data and survive your
deletion.

**Terms** gain a user content clause: you keep your recipes, you grant
Mealy the right to display public ones to other users, you confirm you
have the right to publish what you publish, and we can remove content.

**Account deletion** in `households.deleteAccount` must reach the new
tables. When a household is discarded it takes its links, its link
invites, its stars and its reports with it. Recipes other households
copied are not touched, because a copy is their document, not yours.
Their attribution line stops resolving when your recipe goes, which is
the same as any deleted source.

**Export** in `households.exportData` gains `visibility` and the
`copiedFrom` block per recipe, plus a list of linked household names.

---

## 15. Migration

Existing recipes have no `visibility`, `starCount` or `copyCount`, and
all three are required fields. Add a backfill to
`convex/migrations.ts` alongside `backfillHouseholds`, following the
same shape and the same "safe to run twice" rule:

1. Add the fields as optional in the schema and push.
2. Run `npx convex run migrations:backfillSharing`, which sets
   `visibility: 'linked'`, `starCount: 0` and `copyCount: 0` on every
   recipe missing them.
3. Make the fields required and push again.

`linked` is the right backfill value for the reason in §3, and it is
inert until the household links to someone.

---

## 16. Phases

Each phase is shippable on its own and leaves the app coherent.

### Phase 1: linked kitchens and copying

The whole reason for the feature. Everything else is optional next to
it.

- [ ] Schema: `visibility`, `copiedFrom`, counts, `householdLinks`,
      `householdLinkInvites`, plus the migration.
- [ ] `convex/lib/sharing.ts` with `canRead`, `linkedHouseholdIds` and
      `pairKey`, with unit tests.
- [ ] `convex/links.ts`: invite, preview, accept, unlink, list.
- [ ] `recipes.copy`, `recipes.copyAndPlan`, `recipes.setVisibility`.
- [ ] `/link/$token`, the "Linked kitchens" card on `/household`.
- [ ] `recipe-view.tsx` extracted, `/explore` and
      `/explore/kitchens/$id`, `/explore/recipes/$id`.
- [ ] Fourth nav tab.
- [ ] Attribution line and visibility control on your own recipes.
- [ ] Deletion and export updated for the new tables.

Done when: two accounts in separate households can swap a link, see each
other's recipes, copy one, plan the copy, see where it came from, unlink,
and keep the copy with its attribution intact as plain text.

### Phase 2: stars

- [ ] `recipeStars`, `star` and `unstar`, count bumps.
- [ ] "Starred" section on `/explore`, filtered by readability.

Done when: a starred recipe from a linked kitchen appears in the saved
list, and quietly leaves it when the link is removed.

### Phase 3: public explore

- [ ] Publish flow with the confirm sheet and the 100 recipe cap.
- [ ] Public feed with pagination, sorting and title search.
- [ ] `recipeReports`, the report action, the internal takedown
      mutation, and the blocked state on the author's page.
- [ ] Privacy policy and terms updated before this phase deploys.

Done when: a recipe published by one household is findable, readable,
starrable and copyable by an unrelated account, and a takedown removes
it from explore without touching the author's copy.

---

## 17. Testing

The link and copy paths move data between households, which puts them in
the same category as the join flow: a regression is not recoverable from
the UI. They get `convex-test` suites, alongside the existing
`convex/__tests__` files.

Cases that must exist:

- A `household` recipe is not readable by a linked household.
- A `linked` recipe is not readable by an unlinked household.
- Unlinking makes previously readable recipes unreadable immediately.
- Copy writes into the caller's household, never the source's.
- Copy of a recipe you cannot read is refused.
- Edit and delete of a recipe you can read but do not own are refused.
- Accepting the same link invite twice is a no-op, not a second row.
- Accepting your own household's link invite is refused.
- Deleting an account removes its links, invites, stars and reports, and
  leaves copies other households made untouched.
- `pairKey` is order-independent.

New routes go into `tests/a11y/pages.spec.ts` with the rest.

---

## 18. Non-goals

Stated so they do not creep in.

- No one-way following. Links are mutual.
- No household search or directory. Invite links only.
- No comments, ratings or reviews. A star count is the only social
  signal.
- No live-updating shared recipes. A copy is a snapshot, permanently.
- No sharing of plans or shopping lists. Those stay household-only, and
  the invite flow already covers people who want to share them.
- No per-recipe sharing with one specific household. Visibility is a
  ladder, not an access list. If that turns out to be wanted, it is an
  additive change and not a rewrite.
- No open-web public pages in the first version. Explore is signed-in
  only.
- No moderation queue UI. Reports plus a dashboard mutation.
