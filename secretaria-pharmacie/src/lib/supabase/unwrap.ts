/** Relation PostgREST : objet (many-to-one) ou tableau selon les types générés. */
export function unwrapEmbed<T>(value: unknown): T | null {
  if (value == null) return null
  if (Array.isArray(value)) return (value[0] as T) ?? null
  return value as T
}
