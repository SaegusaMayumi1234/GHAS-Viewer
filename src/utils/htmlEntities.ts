const textarea = typeof document !== 'undefined' ? document.createElement('textarea') : null

/**
 * Decodes HTML entities (e.g. &ndash; → –, &amp; → &) using the browser DOM.
 * Safe: no script execution occurs because textarea does not parse tags.
 */
export const decodeHtmlEntities = (str: string): string => {
  if (!textarea) return str
  textarea.innerHTML = str
  return textarea.value
}
