/**
 * Shared month-name-to-index map. Used by multiple scrapers.
 * Supports both full names ("february") and abbreviated ("feb").
 */
export const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

/**
 * Parses "25 February 2026", "Thursday 16 April 2026" → "2026-02-25".
 * Handles leading weekday names and ordinal suffixes.
 */
export function parseDayMonthYear(text) {
  const cleaned = text.trim().replace(/(\d+)(st|nd|rd|th)/i, '$1')
  const match = cleaned.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
  if (!match) return null
  const day = parseInt(match[1], 10)
  const monthIndex = MONTHS[match[2].toLowerCase()]
  if (monthIndex === undefined) return null
  const year = parseInt(match[3], 10)
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Parses "DD/MM/YYYY" → "YYYY-MM-DD".
 */
export function parseDdMmYyyy(text) {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}

/**
 * Parses dates the native Date constructor understands: "Feb 16, 2026", ISO strings, etc.
 */
export function parseNaturalDate(text) {
  const parsed = new Date(text.trim())
  if (isNaN(parsed.getTime())) return null
  return parsed.toISOString().split('T')[0]
}

/**
 * Parses "24th February 2026" → strips ordinal, then uses parseDayMonthYear.
 */
export function parseOrdinalDate(text) {
  return parseDayMonthYear(text)
}

/**
 * Parses day + month without year (e.g. "16 April", "February 12").
 * Infers year: if the date is more than 30 days in the past, assumes next year.
 */
export function parseDayMonthInfer(text) {
  const cleaned = text.trim().replace(/(\d+)(st|nd|rd|th)/i, '$1')
  const match = cleaned.match(/(\d{1,2})\s+(\w+)/i) || cleaned.match(/(\w+)\s+(\d{1,2})/i)
  if (!match) return null

  let dayStr, monthStr
  if (/^\d/.test(match[1])) {
    dayStr = match[1]
    monthStr = match[2]
  } else {
    dayStr = match[2]
    monthStr = match[1]
  }

  const day = parseInt(dayStr, 10)
  const monthKey = monthStr.toLowerCase().slice(0, 3)
  const monthIndex = MONTHS[monthKey]
  if (isNaN(day) || monthIndex === undefined) return null

  const now = new Date()
  let year = now.getFullYear()
  const candidate = new Date(year, monthIndex, day)
  if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)) {
    year++
  }
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Parses JBS-style "16<br>Feb" HTML into YYYY-MM-DD.
 */
export function parseDateFromBrHtml(html) {
  const parts = html.split(/<br\s*\/?>/i).map(s => s.trim())
  if (parts.length < 2) return null
  const day = parseInt(parts[0], 10)
  if (isNaN(day)) return null
  return parseDayMonthInfer(`${day} ${parts[1]}`)
}

/**
 * Formats a Date to "HH:MM" using en-GB 24-hour format.
 * Replaces the duplicated fmt lambda found in 7+ scrapers.
 */
export function formatTime(date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * Builds "HH:MM - HH:MM" from start and optional end Date objects.
 */
export function formatTimeRange(startDate, endDate) {
  const start = formatTime(startDate)
  if (!endDate) return start
  return `${start} - ${formatTime(endDate)}`
}
