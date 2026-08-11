export const severityOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  note: 4,
  warning: 5,
  none: 6,
}

export const severityColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
}

export const severityType = (
  severity: string,
): 'error' | 'warning' | 'success' | 'default' => {
  if (severity === 'critical' || severity === 'high') return 'error'
  if (severity === 'medium') return 'warning'
  if (severity === 'low') return 'success'
  return 'default'
}
