import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'

const BASE_URL = 'https://www.kingselab.org'
const EVENTS_URL = `${BASE_URL}/events`
const SOURCE = 'kings-elab'

/**
 * Parses a Squarespace summary date string like "Feb 16, 2026" into YYYY-MM-DD.
 * @param {string} raw - Date text from the page
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function parseDate(raw) {
  const trimmed = raw.trim()
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Failed to parse date: "${trimmed}"`)
  }
  return parsed.toISOString().split('T')[0]
}

/**
 * Extracts detail fields from an individual Kings E-Lab event page.
 * Uses JSON-LD structured data for time/location, and body content for description/images.
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded detail page DOM
 * @returns {{ time: string|null, location: string|null, description: string|null, imageUrl: string|null, endDate: string|null }}
 */
export function parseDetailPage($) {
  let time = null
  let location = null
  let description = null
  let imageUrl = null
  let endDate = null

  // Parse JSON-LD for structured event data
  $('script[type="application/ld+json"]').each((_i, el) => {
    const raw = $(el).html()
    if (!raw) return
    let data
    try {
      data = JSON.parse(raw)
    } catch (err) {
      log.warn(SOURCE, 'JSON-LD parse failed on detail page', { error: err.message })
      return
    }
    if (data['@type'] !== 'Event') return

    if (data.startDate) {
      const start = new Date(data.startDate)
      if (!Number.isNaN(start.getTime())) {
        const hours = String(start.getUTCHours()).padStart(2, '0')
        const mins = String(start.getUTCMinutes()).padStart(2, '0')
        let timeStr = `${hours}:${mins}`
        if (data.endDate) {
          const end = new Date(data.endDate)
          if (!Number.isNaN(end.getTime())) {
            const endH = String(end.getUTCHours()).padStart(2, '0')
            const endM = String(end.getUTCMinutes()).padStart(2, '0')
            timeStr += ` - ${endH}:${endM}`
            if (end.toISOString().split('T')[0] !== start.toISOString().split('T')[0]) {
              endDate = end.toISOString().split('T')[0]
            }
          }
        }
        time = timeStr
      }
    }

    if (data.location && data.location.name) {
      const name = data.location.name.trim()
      const addr = (data.location.address || '').replace(/\n/g, ', ').trim()
      location = addr ? `${name}, ${addr}` : name
    }

    // JSON-LD image is the series banner; we prefer inline speaker photos
    if (data.image && data.image.length > 0 && !imageUrl) {
      imageUrl = data.image[0]
    }
  })

  // Look for a speaker/event-specific inline image (better than series banner)
  const inlineImg = $('img[src*="images.squarespace-cdn.com"]').filter((_i, el) => {
    const src = $(el).attr('src') || ''
    return !src.includes('logo') && !src.includes('favicon')
  }).first()
  if (inlineImg.length) {
    imageUrl = inlineImg.attr('src')
  }

  const descParts = []
  let cost = null
  $('div.sqs-block-content p, div.sqs-block-content h4').each((_i, el) => {
    const text = $(el).text().trim()
    if (!text) return
    if (text.startsWith('TICKETS:')) {
      const raw = text.replace(/^TICKETS:\s*/i, '').trim()
      if (/free/i.test(raw)) cost = 'Free'
      else if (/[£$€]\d/.test(raw)) cost = raw
      return
    }
    if (text.startsWith('WHEN:') || text.startsWith('WHERE:')) return
    descParts.push(text)
  })
  if (descParts.length > 0) {
    description = descParts.join(' ').slice(0, 500)
  }

  return { time, location, description, imageUrl, endDate, cost }
}

/**
 * Parses King's E-Lab events from a cheerio-loaded DOM.
 * Targets Squarespace summary block event items on the homepage.
 *
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {{ title: string, date: string, sourceUrl: string, description: string, imageUrl: string|null, categories: string[] }[]}
 */
export function parseKingsElab($) {
  const events = []

  const items = $('div.summary-item.summary-item-record-type-event')

  items.each((_i, el) => {
    const item = $(el)

    const titleEl = item.find('div.summary-title a.summary-title-link')
    const title = titleEl.text().trim()
    const relativeLink = titleEl.attr('href')

    if (!title || !relativeLink) return

    const sourceUrl = `${BASE_URL}${relativeLink}`

    const dateEl = item.find('div.summary-metadata-container--above-title time.summary-metadata-item--date')
    const dateText = dateEl.first().text().trim()
    if (!dateText) return

    const startDateStr = parseDate(dateText)

    const description = item.find('.summary-excerpt').text().trim()

    const imgEl = item.find('img[src]')
    const imgSrc = imgEl.attr('data-src') || imgEl.attr('src') || ''
    const imageUrl = imgSrc && imgSrc.startsWith('http') ? imgSrc : null

    const categories = []
    item.find('.summary-metadata-item--cats a').each((_j, a) => {
      const cat = $(a).text().trim()
      if (cat) categories.push(cat)
    })

    events.push({ title, description, date: startDateStr, sourceUrl, imageUrl, categories })
  })

  return events
}

/**
 * Fetches and parses events from King's E-Lab, including detail page scraping
 * for time, location, full description, and images.
 * @returns {Promise<import('./_utils.js').NormalizedEvent[]>} Array of normalized event objects
 */
export async function scrapeKingsElab() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const listings = parseKingsElab($)
  log.info(SOURCE, `found ${listings.length} listings, fetching details`)

  const results = await Promise.allSettled(
    listings.map(async (evt) => {
      const detail$ = await fetchPage(evt.sourceUrl)
      const detail = parseDetailPage(detail$)
      return normalizeEvent({
        title: evt.title,
        description: detail.description || evt.description,
        date: evt.date,
        endDate: detail.endDate,
        source: SOURCE,
        sourceUrl: evt.sourceUrl,
        imageUrl: detail.imageUrl || evt.imageUrl,
        categories: evt.categories,
        time: detail.time,
        location: detail.location,
        cost: detail.cost,
        access: 'Registration Required',
      })
    })
  )

  const events = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter(Boolean)

  const rejected = results.filter((r) => r.status === 'rejected')
  if (rejected.length > 0) {
    log.warn(SOURCE, `${rejected.length} detail page fetches failed`)
  }

  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
