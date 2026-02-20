const PLATFORM_SOURCES = new Set([
  'meetup-cambridge',
  'makespace',
  'luma-cffn',
  'luma-cue',
  'luma-cament',
  'eventbrite-cambridge',
  'eagle-labs',
])

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function dateKey(date) {
  if (date instanceof Date) return date.toISOString().split('T')[0]
  return String(date).split('T')[0]
}

/**
 * Deduplicates events that appear from multiple sources.
 * Groups by normalized title + date. When duplicates exist,
 * keeps the version from a platform source (Meetup, Luma, Eventbrite)
 * over a venue/company page.
 *
 * @param {Object[]} events - Array of event objects from MongoDB
 * @returns {Object[]} Deduplicated array, original order preserved
 */
export function dedup(events) {
  const groups = new Map()

  for (const event of events) {
    const key = `${normalizeTitle(event.title)}|${dateKey(event.date)}`
    const existing = groups.get(key)

    if (!existing) {
      groups.set(key, event)
      continue
    }

    const existingIsPlatform = PLATFORM_SOURCES.has(existing.source)
    const incomingIsPlatform = PLATFORM_SOURCES.has(event.source)

    // Replace only if incoming is platform and existing is not
    if (incomingIsPlatform && !existingIsPlatform) {
      groups.set(key, event)
    }
  }

  return [...groups.values()]
}
