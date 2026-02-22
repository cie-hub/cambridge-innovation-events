import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'

const BASE_URL = 'https://www.allia.org.uk'
const EVENTS_URL = `${BASE_URL}/events`
const SOURCE = 'allia'

/**
 * Parses Allia Future Business Centre events from a cheerio-loaded DOM.
 * The /future-business-centres/cambridge URL returns a 404 page.
 * The site uses The Events Calendar (tribe-events) plugin but the specific
 * events URL is /events. This parser targets tribe-events list view patterns.
 *
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {import('./_utils.js').NormalizedEvent[]} Array of normalized event objects
 */
export function parseAllia($) {
  const events = []

  const items = $(
    'article.tribe_events, ' +
    'div.tribe-events-calendar-list__event, ' +
    'div.type-tribe_events, ' +
    'article.type-tribe_events'
  )

  items.each((_i, el) => {
    const item = $(el)
    const titleEl = item.find('h3 a, h2 a, a.tribe-events-calendar-list__event-title-link')
    const title = titleEl.text().trim()
    const href = titleEl.attr('href')

    if (!title || !href) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`

    const dateAttr = item.find('time[datetime]').attr('datetime')
    const dateText = dateAttr || item.find('.tribe-event-schedule-details').text().trim()
    if (!dateText) return

    const parsed = new Date(dateText)
    if (Number.isNaN(parsed.getTime())) return
    const startDateStr = parsed.toISOString().split('T')[0]

    const description = item.find('.tribe-events-calendar-list__event-description p').text().trim()

    const location = item.find('.tribe-events-calendar-list__event-venue').text().trim()

    const timeText = item.find('time').text().trim()
    const timeMatch = timeText.match(/(\d{1,2}:\d{2}\s*[ap]m\s*-\s*\d{1,2}:\d{2}\s*[ap]m)/i)
    const time = timeMatch ? timeMatch[1] : null

    const imgEl = item.find('img[src]')
    const imgSrc = imgEl.attr('src') || ''
    const imageUrl = imgSrc && imgSrc.startsWith('http') ? imgSrc : null

    const categories = []
    item.find('.tribe-events-calendar-list__event-category a').each((_j, a) => {
      const cat = $(a).text().trim()
      if (cat) categories.push(cat)
    })

    const costEl = item.find('.tribe-events-cost, .tribe-events-event-cost').text().trim()
    const cost = costEl ? (/free/i.test(costEl) ? 'Free' : costEl) : null

    events.push(
      normalizeEvent({
        title,
        description,
        date: startDateStr,
        source: SOURCE,
        sourceUrl,
        location,
        categories,
        time,
        imageUrl,
        cost,
      })
    )
  })

  return events
}

/**
 * Fetches and parses events from Allia Future Business Centre.
 * @returns {Promise<import('./_utils.js').NormalizedEvent[]>} Array of normalized event objects
 */
export async function scrapeAllia() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const events = parseAllia($)
  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
