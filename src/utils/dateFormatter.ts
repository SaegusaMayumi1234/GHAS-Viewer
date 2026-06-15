export const formatDateHumanly = (isoDateString: string): string => {
  if (!isoDateString) return '-'

  const date = new Date(isoDateString)
  if (Number.isNaN(date.getTime())) return isoDateString

  const now = new Date()
  const rawDiffMs = now.getTime() - date.getTime()
  const isFuture = rawDiffMs < 0
  const diffMs = Math.abs(rawDiffMs)
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  const suffix = isFuture ? 'from now' : 'ago'
  if (diffSecs < 60) return isFuture ? 'in a few seconds' : 'just now'
  if (diffMins < 60) return `${diffMins}m ${suffix}`
  if (diffHours < 24) return `${diffHours}h ${suffix}`
  if (diffDays < 7) return `${diffDays}d ${suffix}`
  if (diffWeeks < 4) return `${diffWeeks}w ${suffix}`
  if (diffMonths < 12) return `${diffMonths}mo ${suffix}`
  if (!isFuture && diffYears === 1) return 'last year'
  if (isFuture && diffYears === 1) return 'next year'
  return `${diffYears}y ${suffix}`
}
