/**
 * Input sanitization utilities for XSS protection on free-text fields.
 * Zero external dependencies - pure string manipulation only.
 */

/**
 * Sanitizes a single string value by stripping HTML tags, script content,
 * event handlers, and javascript: URIs, then escaping special characters.
 */
export function sanitizeHtml(input: string): string {
  let value = input

  // Remove <script>...</script> blocks (including multiline).
  value = value.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')

  // Remove <style>...</style> blocks.
  value = value.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')

  // Remove actual HTML tags while preserving plain-text angle brackets.
  value = value.replace(/<\/?[a-z][^>]*>/gi, '')

  // Remove javascript: protocol URIs (with optional whitespace).
  value = value.replace(/javascript\s*:/gi, '')

  // Escape HTML-significant characters to their entity equivalents.
  value = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  return value.trim()
}

/**
 * Sanitizes specific string fields on an object, returning a shallow copy
 * with those fields run through `sanitizeHtml`. Non-string fields and fields
 * not listed in `keys` are passed through unchanged.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]): T {
  const result = { ...obj }
  for (const key of keys) {
    const value = result[key]
    if (typeof value === 'string') {
      ;(result as Record<string, unknown>)[key as string] = sanitizeHtml(value)
    }
  }
  return result
}
