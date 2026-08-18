import { SignIn } from '@clerk/tanstack-react-start'
import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-in/$')({ component: Page })

function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10 pt-safe">
      <Link to="/" className="text-lg font-bold text-emerald-700">
        🥕 Mealy Plan
      </Link>
      <SignIn />
    </main>
  )
}
