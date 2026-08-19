import { SignIn } from '@clerk/tanstack-react-start'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Logo } from '../components/ui/logo'

export const Route = createFileRoute('/sign-in/$')({ component: Page })

function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10 pt-safe">
      <Link
        to="/"
        className="flex items-center gap-2 font-serif text-title font-semibold text-ink-900"
      >
        <Logo className="size-7" />
        Mealy
      </Link>
      <SignIn />
    </main>
  )
}
