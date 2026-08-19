/** A filename that sorts by date and says what it is: mealy-2026-08-19.json */
export function exportFilename(now: Date): string {
  const [date] = now.toISOString().split('T')
  return `mealy-${date ?? 'export'}.json`
}

/** Hand the browser a JSON file. The object URL is revoked straight after. */
export function downloadJson(filename: string, data: unknown): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
