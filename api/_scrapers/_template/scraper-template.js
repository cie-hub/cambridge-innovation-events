/**
 * [SOURCE_NAME] scraper
 *
 * Scrapes events from [SOURCE URL].
 * [Brief description of scraping strategy: HTML parsing / API / RSS / etc.]
 *
 * To create a new scraper from this template:
 * 1. Copy this file to the appropriate platform folder (custom/, luma/, etc.)
 * 2. Rename to your-source-slug.js
 * 3. Update SOURCE, EVENTS_URL, and the parse function
 * 4. Add your source to _shared/config.js (batches + sources)
 * 5. Add your scraper to index.js
 * 6. Create a fixture and test (see scraper-template.test.js)
 */
import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'

const EVENTS_URL = 'https://example.com/events'
const SOURCE = 'your-source-slug'

/**
 * Parses events from the source page DOM.
 * This is the pure parsing function — no network calls.
 * Exported for testing with fixtures.
 *
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {{ title: string, date: string, sourceUrl: string, description: string, location?: string, time?: string, imageUrl?: string|null }[]}
 */
export function parseSourceName($) {
  const events = []

  // TODO: Replace with actual selectors for the source
  $('article.event, div.event-item').each((_i, el) => {
    const item = $(el)

    // Title (required)
    const titleEl = item.find('h2 a, h3 a').first()
    const title = titleEl.text().trim()
    const href = titleEl.attr('href')
    if (!title || !href) return

    const sourceUrl = href.startsWith('http') ? href : `https://example.com${href}`

    // Date (required) — adapt parsing to your source's date format
    const dateText = item.find('time[datetime]').attr('datetime')
      || item.find('.event-date').text().trim()
    if (!dateText) return
    const startDate = new Date(dateText)
    if (isNaN(startDate.getTime())) return
    const dateStr = startDate.toISOString().split('T')[0]

    // Description
    const description = item.find('.event-description, p').first().text().trim().slice(0, 500)

    // Location
    const location = item.find('.event-venue, .location').text().trim()

    // Time
    const timeText = item.find('.event-time').text().trim()
    const time = timeText || null

    // Image
    const imgSrc = item.find('img').first().attr('src') || ''
    const imageUrl = imgSrc.startsWith('http') ? imgSrc : null

    events.push({ title, date: dateStr, sourceUrl, description, location, time, imageUrl })
  })

  return events
}

/**
 * Fetches and parses events from [SOURCE NAME].
 * @returns {Promise<import('../_shared/utils.js').NormalizedEvent[]>}
 */
export async function scrapeSourceName() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const listings = parseSourceName($)

  const events = listings.map((evt) =>
    normalizeEvent({
      title: evt.title,
      description: evt.description,
      date: evt.date,
      source: SOURCE,
      sourceUrl: evt.sourceUrl,
      location: evt.location,
      time: evt.time,
      imageUrl: evt.imageUrl,
    })
  ).filter(Boolean)

  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
