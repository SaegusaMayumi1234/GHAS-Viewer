/** Default number of context lines to include above and below the focus line in a source snippet. */
export const DEFAULT_CONTEXT_RADIUS = 6

/** Compute an integer percentage (0–100), avoiding division by zero. */
export const calcPercent = (value: number, total: number): number =>
  total > 0 ? Math.round((value / total) * 100) : 0
