import { Link, createFileRoute } from '@tanstack/react-router'
import { Show, SignInButton, SignUpButton } from '@clerk/tanstack-react-start'
import { Book, CalendarDays, ShoppingBasket } from 'lucide-react'
import { Button, buttonClass } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Logo } from '../components/ui/logo'

export const Route = createFileRoute('/')({ component: Landing })

const FEATURES = [
  {
    icon: Book,
    title: 'Keep your recipes',
    body: 'Ingredients, steps and tags. Readable while you cook.',
  },
  {
    icon: CalendarDays,
    title: 'Plan the week',
    body: 'Drop dinners onto days and adjust servings as you go.',
  },
  {
    icon: ShoppingBasket,
    title: 'One smart list',
    body: '2 × 250g mince becomes 500g. Tins get counted, not repeated.',
  },
]

function Landing() {
  return (
    <main className="mx-auto max-w-3xl px-5 pt-safe">
      <div className="py-14 text-center sm:py-20">
        <Logo className="mx-auto size-16" />
        <h1 className="mt-4 font-serif text-display font-semibold text-ink-900 sm:text-4xl/tight">
          Mealy
        </h1>
        <p className="mx-auto mt-3 max-w-md text-body text-ink-600">
          Save your recipes, plan the week’s dinners, and walk into the shop
          with one tidy list.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <Button variant="accent" size="lg" className="w-full sm:w-auto">
                Get started, it’s free
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Sign in
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link to="/recipes" className={buttonClass('accent', 'lg')}>
              Open my kitchen
            </Link>
          </Show>
        </div>
      </div>

      <ul className="grid gap-4 pb-16 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <li key={title}>
            <Card className="h-full p-5">
              <Icon
                className="size-6 text-basil-700"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <h2 className="mt-3 font-serif text-title font-medium text-ink-900">
                {title}
              </h2>
              <p className="mt-1 text-body text-ink-600">{body}</p>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  )
}
