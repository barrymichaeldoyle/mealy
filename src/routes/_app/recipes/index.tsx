import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Clock, Plus, Search, Users } from 'lucide-react'
import { AppHeader } from '../../../components/app-header'
import { Card } from '../../../components/ui/card'
import { EmptyState } from '../../../components/ui/empty-state'
import { Input } from '../../../components/ui/field'
import { SkeletonList } from '../../../components/ui/skeleton'
import { Tag } from '../../../components/ui/tag'
import { buttonClass } from '../../../components/ui/button'
import { useRecipes } from '../../../hooks/use-recipes'
import { cn } from '../../../lib/cn'

export const Route = createFileRoute('/_app/recipes/')({
  component: RecipeList,
})

function RecipeList() {
  const recipes = useRecipes()
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const allTags = new Set<string>()
  for (const recipe of recipes ?? []) {
    for (const tag of recipe.tags) {
      allTags.add(tag)
    }
  }
  const tags = [...allTags].toSorted()

  const needle = search.trim().toLowerCase()
  const filtered = (recipes ?? []).filter((recipe) => {
    const matchesSearch = !needle || recipe.title.toLowerCase().includes(needle)
    const matchesTag = !activeTag || recipe.tags.includes(activeTag)
    return matchesSearch && matchesTag
  })

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-stone-900">Recipes</h1>
          <Link
            to="/recipes/new"
            className={buttonClass('primary', 'md')}
            aria-label="Add a recipe"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Link>
        </div>

        <div className="relative mt-4">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recipes"
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
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium',
                    'transition-colors',
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200',
                  )}
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
              emoji="🥕"
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
              emoji="🔍"
              title="Nothing matches that"
              body="Try a different search or clear the tag filter."
            />
          ) : (
            <ul className="space-y-3">
              {filtered.map((recipe) => {
                const totalTime =
                  (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)
                return (
                  <li key={recipe._id}>
                    <Link
                      to="/recipes/$id"
                      params={{ id: recipe._id }}
                      className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                      <Card className="p-4 transition-shadow hover:shadow-md">
                        <h2 className="font-semibold text-stone-900">
                          {recipe.title}
                        </h2>
                        {recipe.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-stone-500">
                            {recipe.description}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500">
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5" aria-hidden="true" />
                            Serves {recipe.servings}
                          </span>
                          {totalTime > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3.5" aria-hidden="true" />
                              {totalTime} min
                            </span>
                          )}
                          {recipe.tags.map((tag) => (
                            <Tag key={tag}>{tag}</Tag>
                          ))}
                        </div>
                      </Card>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  )
}
