import { SignUp } from '@clerk/tanstack-react-start'
import { Link, createFileRoute } from '@tanstack/react-router'
import { flatCardAppearance } from '../integrations/clerk/appearance'
import { SiteFooter } from '../components/site-footer'
import { Logo } from '../components/ui/logo'

export const Route = createFileRoute('/sign-up/$')({ component: Page })

function Page() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 pt-safe">
      <main className="flex grow flex-col items-center justify-center gap-6 py-10">
        <Link
          to="/"
          className="flex items-center gap-2 font-serif text-title font-semibold text-ink-900"
        >
          <Logo className="size-7" />
          Mealy
        </Link>
        <SignUp appearance={flatCardAppearance} />
      </main>
      <SiteFooter />
    </div>
  )
}
