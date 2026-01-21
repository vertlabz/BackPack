const SAO_PAULO_OFFSET_MINUTES = 3 * 60
const OFFSET_MS = SAO_PAULO_OFFSET_MINUTES * 60 * 1000

export function saoPauloMinutesFromMidnight(dateUtc: Date): number {
  const localMs = dateUtc.getTime() - OFFSET_MS
  const d = new Date(localMs)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

export function saoPauloDiffInDaysFromNow(targetUtc: Date): number {
  const nowUtc = new Date()
  const localNowMs = nowUtc.getTime() - OFFSET_MS
  const localTargetMs = targetUtc.getTime() - OFFSET_MS

  const dayNow = Math.floor(localNowMs / (24 * 60 * 60 * 1000))
  const dayTarget = Math.floor(localTargetMs / (24 * 60 * 60 * 1000))

  return dayTarget - dayNow
}

export function getSaoPauloDayRangeFromUtc(dateUtc: Date): {
  dayStartUtc: Date
  dayEndUtc: Date
  weekday: number
} {
  const localMs = dateUtc.getTime() - OFFSET_MS
  const d = new Date(localMs)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  const day = d.getUTCDate()
  const weekday = d.getUTCDay()

  const localStartMs = Date.UTC(year, month, day, 0, 0, 0)
  const dayStartUtc = new Date(localStartMs + OFFSET_MS)
  const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000)

  return { dayStartUtc, dayEndUtc, weekday }
}

export function getSaoPauloDayRangeFromLocalDate(dateStr: string): {
  dayStartUtc: Date
  dayEndUtc: Date
  weekday: number
} {
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)

  if (!year || !month || !day) {
    throw new Error('Invalid date string')
  }

  const localStartMs = Date.UTC(year, month - 1, day, 0, 0, 0)
  const dayStartUtc = new Date(localStartMs + OFFSET_MS)
  const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000)

  const localDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const weekday = localDate.getUTCDay()

  return { dayStartUtc, dayEndUtc, weekday }
}

export { OFFSET_MS }
