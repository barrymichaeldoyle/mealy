import { chipClass } from './ui/chip'
import { suggestNames, type NameCount } from '../lib/ingredient-names'

/**
 * Names already in use, offered under the field as it is typed. Tapping one
 * is what keeps "Roast Veg Pack" and "Roasted Veg Pack" from becoming two
 * lines on the same shopping list.
 *
 * Buttons, not a combobox: this is a shortcut beside a field that still
 * takes anything you type, so it needs no listbox semantics and no
 * keyboard mode of its own.
 */
export function NameSuggestions({
  vocabulary,
  typed,
  onPick,
}: {
  vocabulary: NameCount[]
  typed: string
  onPick: (name: string) => void
}) {
  const names = suggestNames(vocabulary, typed)
  if (names.length === 0) {
    return null
  }

  return (
    <div className="mt-2">
      <p className="text-meta text-ink-400">Already in your recipes</p>
      <ul className="mt-1.5 flex flex-wrap gap-2">
        {names.map((name) => (
          <li key={name}>
            <button
              type="button"
              onClick={() => onPick(name)}
              className={chipClass(
                false,
                'min-h-[32px] hover:border-basil-700 hover:bg-basil-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-700',
              )}
            >
              {name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
