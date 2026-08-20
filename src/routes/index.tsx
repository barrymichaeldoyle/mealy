import { Link, Navigate, createFileRoute } from '@tanstack/react-router'
import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignInButton,
  SignUpButton,
} from '@clerk/tanstack-react-start'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ShoppingBasket,
} from 'lucide-react'
import { SiteFooter } from '../components/site-footer'
import { Button } from '../components/ui/button'
import { Logo } from '../components/ui/logo'

export const Route = createFileRoute('/')({ component: Landing })

const STEPS = [
  {
    icon: BookOpen,
    title: 'Keep the recipes you actually cook',
    body: 'Ingredients, steps and tags stay together in a format that is easy to read at the stove.',
  },
  {
    icon: CalendarDays,
    title: 'Give each dinner a day',
    body: 'Plan the week, change the number of servings, and move things around when plans change.',
  },
  {
    icon: ShoppingBasket,
    title: 'Take one tidy list to the shop',
    body: 'Matching ingredients combine automatically. Tins get counted and weights get added up.',
  },
]

function Landing() {
  return (
    <>
      <ClerkLoading>
        <div className="grid min-h-dvh place-items-center" aria-label="Loading">
          <Logo className="size-12 animate-pulse" />
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <Show when="signed-in">
          <Navigate to="/recipes" replace />
        </Show>
        <Show when="signed-out">
          <PublicLanding />
        </Show>
      </ClerkLoaded>
    </>
  )
}

function PublicLanding() {
  return (
    <div className="min-h-dvh overflow-hidden pt-safe">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-btn focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-basil-700"
          aria-label="Mealy home"
        >
          <Logo className="size-9" />
          <span className="font-serif text-title font-semibold">Mealy</span>
        </Link>
        <SignInButton mode="modal">
          <Button variant="ghost">Sign in</Button>
        </SignInButton>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-12 pb-24 sm:px-8 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.9fr)] lg:gap-20 lg:pt-24 lg:pb-32">
          <div className="max-w-2xl">
            <h1 className="max-w-[11ch] text-balance font-serif text-5xl/none font-semibold tracking-[-0.035em] text-ink-900 sm:text-6xl/none lg:text-[4.75rem]/[0.98]">
              Dinner, sorted for the week.
            </h1>
            <p className="mt-7 max-w-[34rem] text-lg/7 text-ink-600 sm:text-xl/8">
              Save your recipes, plan the week’s dinners, and walk into the shop
              with one list that has already done the adding up.
            </p>
            <div className="mt-9">
              <SignUpButton mode="modal">
                <Button
                  variant="accent"
                  size="lg"
                  className="group w-full sm:w-auto"
                >
                  Get started, it’s free
                  <ArrowRight
                    className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Button>
              </SignUpButton>
            </div>
          </div>

          <KitchenPreview />
        </section>

        <section className="border-y border-paper-200 bg-paper-100">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
              <h2 className="max-w-[12ch] text-balance font-serif text-3xl/9 font-semibold tracking-[-0.025em] sm:text-4xl/11">
                From recipe to trolley, without the scraps of paper.
              </h2>
              <ol className="divide-y divide-paper-300 border-y border-paper-300">
                {STEPS.map(({ icon: Icon, title, body }) => (
                  <li
                    key={title}
                    className="grid gap-4 py-7 sm:grid-cols-[3rem_1fr] sm:gap-5"
                  >
                    <div className="flex size-11 items-center justify-center rounded-card bg-basil-100 text-basil-700">
                      <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                    </div>
                    <div>
                      <h3 className="font-serif text-title font-medium text-ink-900">
                        {title}
                      </h3>
                      <p className="mt-2 max-w-[34rem] text-body text-ink-600">
                        {body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8 sm:py-32">
          <Logo className="mx-auto size-12" />
          <h2 className="mt-6 text-balance font-serif text-4xl/11 font-semibold tracking-[-0.025em] sm:text-5xl/13">
            Make next week easier.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg/7 text-ink-600">
            Keep the recipes your household loves, then turn the week’s plan
            into a shopping list in one place.
          </p>
          <SignUpButton mode="modal">
            <Button variant="accent" size="lg" className="mt-8">
              Start planning
            </Button>
          </SignUpButton>
        </section>
      </main>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SiteFooter />
      </div>
    </div>
  )
}

function KitchenPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:mx-0" aria-hidden>
      <div className="absolute -inset-12 -z-10 rounded-full bg-basil-100/60 blur-3xl" />
      <div className="landing-preview overflow-hidden rounded-[16px] border border-paper-300 bg-paper-50">
        <div className="flex items-center justify-between border-b border-paper-200 px-5 py-4">
          <div>
            <p className="font-serif text-title font-medium">This week</p>
            <p className="mt-0.5 text-meta text-ink-400">17 to 23 Aug</p>
          </div>
          <Logo className="size-8" />
        </div>
        <div className="grid gap-px bg-paper-200 sm:grid-cols-2">
          <div className="bg-paper-50 p-5">
            <p className="text-meta font-semibold tracking-wide text-ink-400 uppercase">
              Dinner plan
            </p>
            <div className="mt-5 space-y-5">
              <PlanRow day="MON" date="17" meal="Tomato pasta" />
              <PlanRow day="TUE" date="18" meal="Chicken tray bake" active />
              <PlanRow day="WED" date="19" meal="Lentil curry" />
            </div>
          </div>
          <div className="bg-paper-100 p-5">
            <div className="flex items-center justify-between">
              <p className="text-meta font-semibold tracking-wide text-ink-400 uppercase">
                Shopping list
              </p>
              <span className="text-meta font-medium text-basil-700">
                7 items
              </span>
            </div>
            <ul className="mt-4 divide-y divide-paper-300">
              <ListRow name="Tomatoes" quantity="800g" checked />
              <ListRow name="Chicken thighs" quantity="6" />
              <ListRow name="Brown lentils" quantity="500g" />
              <ListRow name="Garlic" quantity="1 bulb" />
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlanRow({
  day,
  date,
  meal,
  active = false,
}: {
  day: string
  date: string
  meal: string
  active?: boolean
}) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr] items-center gap-3">
      <div className="text-center">
        <p className="text-[0.65rem] font-semibold tracking-wide text-ink-400">
          {day}
        </p>
        <p
          className={
            active
              ? 'mx-auto mt-1 grid size-7 place-items-center rounded-full bg-basil-700 text-meta font-semibold text-paper-50'
              : 'mt-1 text-meta font-semibold text-ink-600 tabular-nums'
          }
        >
          {date}
        </p>
      </div>
      <p className="rounded-btn border border-paper-200 bg-paper-100 px-3 py-2 text-sm/5 font-medium">
        {meal}
      </p>
    </div>
  )
}

function ListRow({
  name,
  quantity,
  checked = false,
}: {
  name: string
  quantity: string
  checked?: boolean
}) {
  return (
    <li className="flex min-h-11 items-center gap-3 py-2.5">
      <span
        className={
          checked
            ? 'grid size-5 shrink-0 place-items-center rounded-full bg-basil-700 text-paper-50'
            : 'size-5 shrink-0 rounded-full border border-paper-300 bg-paper-50'
        }
      >
        {checked ? <Check className="size-3.5" strokeWidth={2.5} /> : null}
      </span>
      <span
        className={
          checked
            ? 'min-w-0 grow text-sm text-ink-400 line-through'
            : 'min-w-0 grow text-sm text-ink-900'
        }
      >
        {name}
      </span>
      <span className="shrink-0 text-sm tabular-nums text-ink-600">
        {quantity}
      </span>
    </li>
  )
}
