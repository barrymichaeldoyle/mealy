import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { BookOpen, Plus, Search, SearchX } from 'lucide-react'
import { AppHeader } from '../../../components/app-header'
import { Card } from '../../../components/ui/card'
import { Chip, chipClass } from '../../../components/ui/chip'
import { EmptyState } from '../../../components/ui/empty-state'
import { Input } from '../../../components/ui/field'
import { PageHeader } from '../../../components/ui/page-header'
import { SkeletonList } from '../../../components/ui/skeleton'
import { buttonClass } from '../../../components/ui/button'
import { useRecipes } from '../../../hooks/use-recipes'
import { useOnlineStatus } from '../../../hooks/use-online-status'

export const Route = createFileRoute('/_app/recipes/')({
  component: RecipeList,
})

function RecipeList() {
  const recipes = useRecipes()
  const online = useOnlineStatus()
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const allTags = new Set<string>()
  for (const recipe of recipes ?? []) {
    for (const tag of recipe.tags) {
      allTags.add(tag)
    }
  }
  const tags = [...allTags].toSorted()

  /*
   * Ingredients and tags count, not just the title. "What can I do with
   * mince" is the question people actually arrive with, and searching
   * titles alone answered it only if somebody had thought to type mince as
   * a tag. The whole book is already in memory, so this costs nothing.
   */
  const needle = search.trim().toLowerCase()
  const filtered = (recipes ?? []).filter((recipe) => {
    const matchesSearch =
      !needle ||
      recipe.title.toLowerCase().includes(needle) ||
      recipe.tags.some((tag) => tag.includes(needle)) ||
      recipe.ingredients.some((ingredient) =>
        ingredient.name.toLowerCase().includes(needle),
      )
    const matchesTag = !activeTag || recipe.tags.includes(activeTag)
    return matchesSearch && matchesTag
  })

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        <PageHeader
          title="Recipes"
          action={
            recipes?.length === 0 || !online ? null : (
              <Link
                to="/recipes/new"
                className={buttonClass('primary', 'md')}
                aria-label="Add a recipe"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add
              </Link>
            )
          }
        />

        {!online && (
          <output className="mt-4 block rounded-card border border-line bg-paper-100 px-4 py-3 text-meta font-medium text-ink-600">
            Offline. This is your saved copy, so you can read and cook from it.
            Writing a recipe needs a connection.
          </output>
        )}

        <div className="relative mt-4">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, ingredient or tag"
            aria-label="Search recipes by title"
            className="pl-9"
          />
        </div>

        {tags.length > 0 && (
          <fieldset className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            <legend className="sr-only">Filter by tag</legend>
            {tags.map((tag) => {
              const isActive = activeTag === tag
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveTag(isActive ? null : tag)}
                  className={chipClass(isActive, 'shrink-0')}
                >
                  {tag}
                </button>
              )
            })}
          </fieldset>
        )}

        <div className="mt-4">
          {recipes === undefined ? (
            <SkeletonList />
          ) : recipes.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No recipes yet"
              body="Pop in a family favourite and it’s ready to plan and shop for."
              action={
                <Link to="/recipes/new" className={buttonClass('accent', 'md')}>
                  Add a recipe
                </Link>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nothing matches that"
              body="Try a different search, or clear the tag filter."
            />
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {filtered.map((recipe) => (
                <li key={recipe._id}>
                  <Link
                    to="/recipes/$id"
                    params={{ id: recipe._id }}
                    className="block rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-700"
                  >
                    <RecipeCard recipe={recipe} needle={needle} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  )
}

/**
 * Title-forward, with no thumbnail slot. The MVP has no images, so the card
 * is built to look complete rather than to look like something is missing.
 */
function RecipeCard({
  recipe,
  needle,
}: {
  recipe: NonNullable<ReturnType<typeof useRecipes>>[number]
  needle: string
}) {
  /*
   * Why this one came back. A recipe matching on an ingredient otherwise
   * appears with nothing on the card mentioning the word that was typed,
   * which reads like the search is broken.
   */
  const matchedIngredients =
    needle && !recipe.title.toLowerCase().includes(needle)
      ? recipe.ingredients
          .map((ingredient) => ingredient.name)
          .filter((name) => name.toLowerCase().includes(needle))
      : []
  const totalTime =
    (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)
  const meta = [
    totalTime > 0 ? `${totalTime} min` : null,
    `serves ${recipe.servings}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Card className="px-5 py-4 transition-colors duration-150 ease-out hover:border-paper-300">
      <h2 className="font-serif text-title font-medium text-ink-900">
        {recipe.title}
      </h2>
      <p className="mt-1 text-meta font-medium text-ink-400 tabular-nums">
        {meta}
      </p>
      {matchedIngredients.length > 0 && (
        <p className="mt-1 text-meta text-basil-700">
          has {matchedIngredients.join(', ')}
        </p>
      )}
      {recipe.description && (
        <p className="mt-2 line-clamp-2 text-body text-ink-600">
          {recipe.description}
        </p>
      )}
      {recipe.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <li key={tag}>
              <Chip>{tag}</Chip>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
