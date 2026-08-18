export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden="true">
        {emoji}
      </span>
      <h2 className="text-base font-semibold text-stone-800">{title}</h2>
      {body && <p className="max-w-xs text-sm text-stone-500">{body}</p>}
      {action}
    </div>
  )
}
