import { normalizeEvent } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { formatTimeRange } from '../_shared/dates.js'

const BASE_URL = 'https://www.innovatecambridge.com'
const API_URL = `${BASE_URL}/wp-json/tribe/events/v1/events`
const SOURCE = 'innovate-cambridge'

const ACCESS_SLUGS = {
  'open-to-all': 'Public',
  'open-to-members': 'Open to Members',
  'closed-meeting': 'Closed Meeting',
  'closed-event': 'Glasshouse Closed',
}

const CLOSED_ACCESS = new Set(['closed-meeting', 'closed-event'])

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractTime(startDate, endDate) {
  const time = formatTimeRange(new Date(startDate), new Date(endDate))
  if (time === '00:00 - 00:00') return null
  return time
}

/**
 * Parses Innovate Cambridge events from the Tribe Events REST API response.
 * Extracts access levels from category slugs, filters out closed events,
 * and separates access categories from content categories.
 *
 * @param {Object[]} apiEvents - Array of event objects from the API
 * @returns {import('./_utils.js').NormalizedEvent[]} Array of normalized event objects
 */
export function parseInnovateCambridgeApi(apiEvents) {
  const events = []

  for (const ev of apiEvents) {
    const title = ev.title || ''
    if (!title) continue

    const cats = ev.categories || []
    let access = null
    let isClosed = false
    const contentCategories = []

    for (const cat of cats) {
      const slug = cat.slug || ''
      if (ACCESS_SLUGS[slug]) {
        if (!access) access = ACCESS_SLUGS[slug]
        if (CLOSED_ACCESS.has(slug)) {
          isClosed = true
          access = ACCESS_SLUGS[slug]
        }
      } else if (cat.name) {
        contentCategories.push(cat.name)
      }
    }

    if (isClosed) continue

    const date = ev.start_date ? ev.start_date.split(' ')[0] : null
    if (!date) continue

    const endDate = ev.end_date ? ev.end_date.split(' ')[0] : null
    const description = ev.description ? stripHtml(ev.description) : ''
    const sourceUrl = ev.url || ''
    const location = ev.venue?.venue || ''
    const time = extractTime(ev.start_date, ev.end_date)
    const imageUrl = ev.image?.url || null
    const cost = ev.cost ? (ev.cost.trim() || null) : null

    events.push(
      normalizeEvent({
        title,
        description,
        date,
        endDate: endDate !== date ? endDate : null,
        source: SOURCE,
        sourceUrl,
        location,
        categories: contentCategories,
        access,
        cost,
        time,
        imageUrl,
      })
    )
  }

  return events
}

async function fetchEventsPage(page = 1) {
  const url = `${API_URL}?page=${page}&per_page=50&start_date=now`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)',
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch Innovate Cambridge API page ${page}: ${res.status}`)
  }
  return res.json()
}

/**
 * Fetches and parses events from the Innovate Cambridge REST API.
 * Paginates through all available pages.
 * @returns {Promise<import('./_utils.js').NormalizedEvent[]>} Array of normalized event objects
 */
export async function scrapeInnovateCambridge() {
  log.info(SOURCE, 'starting scrape')
  const firstPage = await fetchEventsPage(1)
  const allEvents = [...firstPage.events]
  const totalPages = firstPage.total_pages || 1
  log.info(SOURCE, `fetched page 1/${totalPages}`, { events: firstPage.events.length })

  for (let page = 2; page <= totalPages; page++) {
    const data = await fetchEventsPage(page)
    allEvents.push(...data.events)
    log.info(SOURCE, `fetched page ${page}/${totalPages}`, { events: data.events.length })
  }

  const events = parseInnovateCambridgeApi(allEvents)
  log.info(SOURCE, 'scrape complete', { total: allEvents.length, afterFilter: events.length })
  return events
}
