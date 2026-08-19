import { Link } from '@tanstack/react-router'
import { cn } from '../lib/cn'
import { OPERATOR } from '../lib/legal'

/**
 * The public pages all end here. Google's OAuth review looks for a home
 * link, a privacy policy and terms reachable from the page that starts the
 * sign-in flow, and Clerk points its own legal links at the same two routes.
 */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        'mt-auto w-full border-t border-paper-200 pt-6 pb-safe-8',
        className,
      )}
    >
      {/* Reversed on wide screens so the links land right and the operator
       * name left, while the narrow stack keeps links above the small print. */}
      <div className="flex flex-col items-center gap-4 sm:flex-row-reverse sm:justify-between sm:gap-6">
        <nav aria-label="Legal and site links">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-meta font-medium">
            <li>
              <FooterLink to="/">Home</FooterLink>
            </li>
            <li>
              <FooterLink to="/privacy">Privacy</FooterLink>
            </li>
            <li>
              <FooterLink to="/terms">Terms</FooterLink>
            </li>
          </ul>
        </nav>
        <p className="text-center text-meta text-balance text-ink-400 sm:text-left">
          © 2026 {OPERATOR}
        </p>
      </div>
    </footer>
  )
}

function FooterLink({
  to,
  children,
}: {
  to: '/' | '/privacy' | '/terms'
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className="rounded-btn text-ink-600 underline underline-offset-4 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-700 aria-[current=page]:text-ink-900"
    >
      {children}
    </Link>
  )
}
