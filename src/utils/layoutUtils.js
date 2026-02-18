import { START_HOUR, HOUR_HEIGHT, CARD_VISUAL_HEIGHT } from '../config/constants'

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatDateShort(date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * Extracts hour as a number from event.time string (e.g. "17:30 - 19:00" -> 17.5)
 */
export function getEventHour(event) {
  if (!event.time) return null
  const match = event.time.match(/^(\d{1,2})[.:](\d{2})/)
  if (match) return parseInt(match[1], 10) + parseInt(match[2], 10) / 60
  return null
}

export function formatHour(hour) {
  if (hour === 0) return '12am'
  if (hour < 12) return `${hour}am`
  if (hour === 12) return '12pm'
  return `${hour - 12}pm`
}

export function layoutColumn(dayEvents) {
  const timed = dayEvents
    .map((e) => ({ event: e, hour: getEventHour(e) }))
    .filter((e) => e.hour !== null)
    .sort((a, b) => a.hour - b.hour)
  const untimed = dayEvents.filter((e) => getEventHour(e) === null)

  // Build collision groups: events whose visual boxes overlap vertically
  const groups = []
  for (const item of timed) {
    const top = (Math.max(item.hour, START_HOUR) - START_HOUR) * HOUR_HEIGHT
    const bottom = top + CARD_VISUAL_HEIGHT
    let placed = false
    for (const group of groups) {
      if (top < group.bottom) {
        group.items.push({ ...item, top })
        group.bottom = Math.max(group.bottom, bottom)
        placed = true
        break
      }
    }
    if (!placed) {
      groups.push({ items: [{ ...item, top }], bottom })
    }
  }

  // Flatten into positioned items with column offsets
  const positioned = []
  for (const group of groups) {
    const count = group.items.length
    group.items.forEach((item, i) => {
      positioned.push({
        ...item,
        colIndex: i,
        colCount: count,
      })
    })
  }

  return { positioned, untimed }
}
