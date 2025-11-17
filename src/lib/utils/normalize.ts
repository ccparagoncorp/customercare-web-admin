type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }
  | undefined

/**
 * Recursively normalizes string values:
 * - trims whitespace
 * - converts empty strings to null
 * Other types are returned untouched.
 */
export function normalizeEmptyStrings<T extends JsonValue>(value: T): T {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return (trimmed === '' ? null : (trimmed as T)) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeEmptyStrings(item)) as T
  }

  if (typeof value === 'object') {
    const result: Record<string, JsonValue> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = normalizeEmptyStrings(val as JsonValue)
    }
    return result as T
  }

  return value
}

