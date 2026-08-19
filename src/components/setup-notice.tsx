/**
 * Shown instead of the app when a required service is not configured yet.
 * Better than a stack trace on someone's first `pnpm dev`.
 */
export function SetupNotice({
  missing,
  command,
  detail,
}: {
  missing: string
  command: string
  detail: string
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      <h1 className="font-serif text-display font-semibold text-ink-900">
        Almost there
      </h1>
      <p className="mt-2 text-body text-ink-600">
        Mealy needs{' '}
        <code className="rounded bg-paper-200 px-1.5 py-0.5 text-meta">
          {missing}
        </code>{' '}
        before it can start.
      </p>
      <p className="mt-4 rounded-card bg-ink-900 px-4 py-3 font-mono text-meta text-paper-50">
        {command}
      </p>
      <p className="mt-3 text-meta text-ink-400">{detail}</p>
    </main>
  )
}
