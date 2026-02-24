import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { inferCostAccess } from '../_shared/access.js'

const BASE_URL = 'https://www.maxwell.cam.ac.uk'
const EVENTS_URL = `${BASE_URL}/events`
const SOURCE = 'maxwell-centre'

/**
 * Parses event listings from the Maxwell Centre events page.
 * Each event is an li.campl-highlight-event-item with ISO dates
 * in span[content] attributes and a link to the detail page.
 *
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {{ title: string, date: string, sourceUrl: string, startTime: string|null }[]}
 */
export function parseMaxwell($) {
  const events = []

  $('li.campl-highlight-event-item').each((_i, el) => {
    const item = $(el)

    const linkEl = item.find('span.campl-highlight-event-link a')
    const title = linkEl.text().trim()
    const href = linkEl.attr('href')
    if (!title || !href) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`

    const dateEl = item.find('span[property="dc:date"][content]').first()
    const isoDate = dateEl.attr('content')
    if (!isoDate) return

    const parsed = new Date(isoDate)
    if (isNaN(parsed.getTime())) return

    const date = parsed.toISOString().split('T')[0]
    const hours = parsed.getUTCHours().toString().padStart(2, '0')
    const mins = parsed.getUTCMinutes().toString().padStart(2, '0')
    const startTime = `${hours}:${mins}`

    events.push({ title, date, sourceUrl, startTime })
  })

  return events
}

/**
 * Extracts event details from a Maxwell Centre detail page.
 * Parses time range from ISO dates, description from body field,
 * and location from the location field.
 *
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded detail page DOM
 * @param {string} startTime - Start time from listing (HH:MM)
 * @returns {{ time: string|null, location: string|null, description: string|null, cost: string|null, access: string|null }}
 */
export function parseDetailPage($, startTime) {
  // Time: extract end time from the second event ISO date
  const isoDates = []
  $('span[content]').each((_i, el) => {
    const content = $(el).attr('content')
    if (content && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(content)) {
      isoDates.push(content)
    }
  })

  let time = null
  // Filter to event dates only (skip page creation dates)
  const eventDates = isoDates.filter(d => d.includes('T') && d.includes(':00:00'))
  if (eventDates.length >= 2) {
    const start = new Date(eventDates[0])
    const end = new Date(eventDates[1])
    const sh = start.getUTCHours().toString().padStart(2, '0')
    const sm = start.getUTCMinutes().toString().padStart(2, '0')
    const eh = end.getUTCHours().toString().padStart(2, '0')
    const em = end.getUTCMinutes().toString().padStart(2, '0')
    time = `${sh}:${sm} - ${eh}:${em}`
  } else if (startTime) {
    time = startTime
  }

  // Location
  let location = null
  $('div.field-label').each((_i, el) => {
    if ($(el).text().includes('Event location')) {
      const container = $(el).parent()
      const locText = container.find('.field-items').text().trim()
      if (locText) location = locText
    }
  })
  if (!location) location = 'Maxwell Centre'

  // Description from body field
  const bodyEl = $('div.field-name-body')
  const paragraphs = []
  bodyEl.find('p').each((_i, el) => {
    const text = $(el).text().trim()
    if (text.length > 10) paragraphs.push(text)
  })
  const description = paragraphs.length > 0 ? paragraphs.join('\n').slice(0, 500) : null

  const fullText = paragraphs.join(' ')
  const { cost, access } = inferCostAccess(fullText)

  return { time, location, description, cost, access }
}

/**
 * Fetches and parses events from the Maxwell Centre, including
 * detail page scraping for descriptions, times, and locations.
 * @returns {Promise<import('../_shared/utils.js').NormalizedEvent[]>}
 */
export async function scrapeMaxwell() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const listings = parseMaxwell($)
  log.info(SOURCE, `found ${listings.length} listings, fetching details`)

  const results = await Promise.allSettled(
    listings.map(async (evt) => {
      const detail$ = await fetchPage(evt.sourceUrl)
      const detail = parseDetailPage(detail$, evt.startTime)
      return normalizeEvent({
        title: evt.title,
        description: detail.description,
        date: evt.date,
        source: SOURCE,
        sourceUrl: evt.sourceUrl,
        time: detail.time,
        location: detail.location,
        cost: detail.cost,
        access: detail.access,
      })
    })
  )

  const rejected = results.filter(r => r.status === 'rejected')
  if (rejected.length > 0) {
    log.warn(SOURCE, `${rejected.length} detail page fetches failed`)
  }

  const events = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(Boolean)

  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
