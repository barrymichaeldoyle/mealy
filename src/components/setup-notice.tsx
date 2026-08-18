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
      <span className="text-4xl" aria-hidden="true">
        🔌
      </span>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">Almost there</h1>
      <p className="mt-2 text-stone-600">
        Mealy Plan needs{' '}
        <code className="rounded bg-stone-200 px-1.5 py-0.5 text-sm">
          {missing}
        </code>{' '}
        before it can start.
      </p>
      <p className="mt-4 rounded-xl bg-stone-900 px-4 py-3 font-mono text-sm text-stone-100">
        {command}
      </p>
      <p className="mt-3 text-sm text-stone-500">{detail}</p>
    </main>
  )
}
