import type { LucideIcon } from 'lucide-react'

/**
 * One large paper-toned icon, one serif line, one sentence, one button.
 * The icon is `paper-300` on purpose: present, but not competing with the
 * action underneath it.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-paper-300 px-6 py-12 text-center">
      <Icon className="size-10 text-paper-300" strokeWidth={1.75} aria-hidden />
      <h2 className="font-serif text-title font-medium text-ink-900">
        {title}
      </h2>
      {body && <p className="max-w-xs text-body text-ink-600">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
