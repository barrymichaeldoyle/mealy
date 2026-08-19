/**
 * Convex spells optional fields as `x?: T`, with no `undefined` in the type.
 * Under `exactOptionalPropertyTypes` that rejects an explicit `undefined`,
 * which is exactly what a blank form field produces. `defined` drops those
 * keys so the field is absent rather than present and empty, which is also
 * what the database should store.
 */
export type Defined<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K]
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<
    T[K],
    undefined
  >
}

export function defined<T extends object>(value: T): Defined<T> {
  const result: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      result[key] = entry
    }
  }
  return result as Defined<T>
}
