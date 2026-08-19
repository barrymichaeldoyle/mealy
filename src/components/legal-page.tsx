import { Link } from '@tanstack/react-router'
import { SiteFooter } from './site-footer'
import { Logo } from './ui/logo'
import { PageHeader } from './ui/page-header'

/** A section is paragraphs and bulleted lists, in whatever order it needs. */
export type LegalSection = {
  heading: string
  blocks: ({ text: React.ReactNode } | { list: React.ReactNode[] })[]
}

/**
 * Both legal documents render through here, so they stay identical in
 * structure: a link home, the title, the date it changed, then numbered
 * sections. The prose lives in the route files.
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string
  updated: string
  intro: React.ReactNode
  sections: LegalSection[]
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-2xl grow px-5 pt-safe">
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-btn font-serif text-title font-semibold text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-700"
        >
          <Logo className="size-6" />
          Mealy
        </Link>

        <div className="mt-8">
          <PageHeader title={title} meta={`Last updated ${updated}`} />
        </div>

        <p className="mt-4 text-body text-ink-600">{intro}</p>

        <div className="pb-12">
          {sections.map((section, index) => (
            <section key={section.heading} className="mt-8">
              <h2 className="font-serif text-title font-medium text-ink-900">
                {index + 1}. {section.heading}
              </h2>
              {section.blocks.map((block, blockIndex) =>
                'list' in block ? (
                  <ul
                    key={blockIndex}
                    className="mt-3 list-disc space-y-2 pl-5 text-body text-ink-600 marker:text-ink-400"
                  >
                    {block.list.map((item, itemIndex) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={blockIndex} className="mt-3 text-body text-ink-600">
                    {block.text}
                  </p>
                ),
              )}
            </section>
          ))}
        </div>
      </main>

      <div className="mx-auto w-full max-w-2xl px-5">
        <SiteFooter />
      </div>
    </div>
  )
}

/**
 * Emails and cross-document links inside the prose. Exported as a class the
 * way buttonClass is, so a route can put it on an <a> or a router <Link>.
 */
export const legalLinkClass =
  'rounded-btn text-basil-700 underline underline-offset-2 hover:text-basil-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-700'
