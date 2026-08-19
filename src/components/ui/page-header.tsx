/**
 * Every screen opens the same way: a Fraunces title, an optional line of
 * meta underneath, and at most one action to its right. Screens do not
 * hand-roll their own heading row.
 */
export function PageHeader({
  title,
  meta,
  action,
}: {
  title: string
  meta?: string
  action?: React.ReactNode
}) {
  return (
    <div
      className={`flex justify-between gap-3 ${meta ? 'items-start' : 'items-center'}`}
    >
      <div className="min-w-0">
        <h1 className="font-serif text-display font-semibold text-ink-900">
          {title}
        </h1>
        {meta && (
          <p className="mt-1 text-meta font-medium text-ink-400">{meta}</p>
        )}
      </div>
      {action && (
        <div className={`shrink-0 ${meta ? 'mt-1' : ''}`}>{action}</div>
      )}
    </div>
  )
}
