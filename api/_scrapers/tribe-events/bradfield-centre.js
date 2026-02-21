import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { inferCostAccess } from '../_shared/access.js'

const BASE_URL = 'https://www.bradfieldcentre.com'
const EVENTS_URL = BASE_URL
const SOURCE = 'bradfield-centre'

/**
 * Parses a Bradfield Centre date string like "24th February 2026 | 17:30 - 20:15"
 * into a YYYY-MM-DD string and optional time string.
 * @param {string} raw - Date text from the page
 * @returns {{ date: string, time: string | null }} Date and time
 */
function parseDateAndTime(raw) {
  const parts = raw.split('|')
  const dateOnly = parts[0].trim()
  const cleaned = dateOnly.replace(/(\d+)(st|nd|rd|th)/i, '$1')
  const parsed = new Date(cleaned)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Failed to parse date: "${raw}"`)
  }
  const date = parsed.toISOString().split('T')[0]
  const time = parts.length > 1 ? parts[1].trim() : null
  return { date, time }
}

/**
 * Parses Bradfield Centre events from a cheerio-loaded DOM.
 * Event highlights are structured as div blocks with h3 titles and <date> elements.
 *
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {import('./_utils.js').NormalizedEvent[]} Array of normalized event objects
 */
export function parseBradfieldCentre($) {
  const events = []

  const highlights = $('div.w-full.mt-6.mb-12.border-b')

  highlights.each((_i, el) => {
    const block = $(el)

    const title = block.find('h3').first().text().trim()
    if (!title) return

    const dateText = block.find('date').first().text().trim()
    if (!dateText) return

    const { date: startDateStr, time } = parseDateAndTime(dateText)

    const linkEl = block.find('a[href*="/events/"]')
    const href = linkEl.attr('href')
    if (!href) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`

    const description = block.find('p').first().text().trim()
    const category = block.find('h5').first().text().trim()
    const categories = category ? [category] : []

    const imgEl = block.find('img[src]')
    const imgSrc = imgEl.attr('src') || ''
    const imageUrl = imgSrc && imgSrc.startsWith('http') ? imgSrc : null

    const { cost, access } = inferCostAccess(description)

    events.push(
      normalizeEvent({
        title,
        description,
        date: startDateStr,
        source: SOURCE,
        sourceUrl,
        categories,
        time,
        imageUrl,
        cost,
        access,
      })
    )
  })

  return events
}

/**
 * Fetches and parses events from the Bradfield Centre.
 * @returns {Promise<import('./_utils.js').NormalizedEvent[]>} Array of normalized event objects
 */
export async function scrapeBradfieldCentre() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const events = parseBradfieldCentre($)
  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
