import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'

const BASE_URL = 'https://www.cambridgenetwork.co.uk'
const EVENTS_URL = `${BASE_URL}/events/search-results`
const SOURCE = 'cambridge-network'

/**
 * Parses a date string like "17 February 2026" into an ISO 8601 date string.
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
 * Extracts detail fields from an individual Cambridge Network event page.
 * Uses Drupal structured fields for time, venue, image, and full description.
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded detail page DOM
 * @returns {{ time: string|null, location: string|null, description: string|null, imageUrl: string|null, categories: string[] }}
 */
export function parseDetailPage($) {
  let time = null
  let location = null
  let description = null
  let imageUrl = null
  const categories = []

  // Time: .field--name-field-time contains start and end <time> elements
  const timeEls = $('.field--name-field-time time.datetime')
  if (timeEls.length >= 2) {
    const startTime = timeEls.eq(0).text().trim()
    const endTime = timeEls.eq(1).text().trim()
    time = `${startTime} - ${endTime}`
  } else if (timeEls.length === 1) {
    time = timeEls.eq(0).text().trim()
  }

  // Venue: .field--name-field-venue
  const venueText = $('.field--name-field-venue').text().trim()
  if (venueText && venueText.toLowerCase() !== 'virtual') {
    location = venueText
  } else if (venueText.toLowerCase() === 'virtual') {
    location = 'Online'
  }

  // Image: .field--name-field-event-image img (relative URL)
  const imgSrc = $('.field--name-field-event-image img').attr('src') || ''
  if (imgSrc) {
    imageUrl = imgSrc.startsWith('http') ? imgSrc : `${BASE_URL}${imgSrc}`
  }

  // Full description from .field--name-body
  const bodyEl = $('.field--name-body')
  if (bodyEl.length) {
    const parts = []
    bodyEl.find('p').each((_i, p) => {
      const text = $(p).text().trim()
      if (text) parts.push(text)
    })
    if (parts.length > 0) {
      description = parts.join(' ').slice(0, 500)
    }
  }

  // Tags from detail page (richer than listing)
  $('.field--name-field-tags .field__item a').each((_i, a) => {
    const tag = $(a).text().trim()
    if (tag) categories.push(tag)
  })

  return { time, location, description, imageUrl, categories }
}

/**
 * Parses Cambridge Network events from a cheerio-loaded DOM.
 * Targets the main search results listing (div.view-id-search_content).
 *
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {{ title: string, date: string, endDate: string|null, sourceUrl: string, description: string, categories: string[], imageUrl: string|null }[]}
 */
export function parseCambridgeNetwork($) {
  const events = []

  const rows = $('div.view-id-search_content div.view-content > div.views-row')

  rows.each((_i, el) => {
    const row = $(el)

    const titleEl = row.find('h2.nls-title > a')
    const title = titleEl.text().trim()
    const relativeLink = titleEl.attr('href')

    if (!title || !relativeLink) return

    const sourceUrl = `${BASE_URL}${relativeLink}`

    const dateText = row.find('span.nl-date').text().trim()
    const dateParts = dateText.split(/\s*-\s*/)
    const startDateStr = parseDate(dateParts[0])
    const endDateStr = dateParts.length > 1 ? parseDate(dateParts[1]) : null

    const descParts = []
    row.find('div.nl-content > p').each((_j, p) => {
      const text = $(p).text().trim()
      if (text) descParts.push(text)
    })
    const description = descParts.join(' ')

    const categories = []
    row.find('span.nl-sector > a').each((_j, a) => {
      const sector = $(a).text().trim()
      if (sector) categories.push(sector)
    })

    const imgEl = row.find('img[src]')
    const imgSrc = imgEl.attr('src') || ''
    const imageUrl = imgSrc && imgSrc.startsWith('http')
      ? imgSrc
      : imgSrc ? `${BASE_URL}${imgSrc}` : null

    events.push({ title, description, date: startDateStr, endDate: endDateStr, sourceUrl, categories, imageUrl })
  })

  return events
}

/**
 * Fetches and parses events from Cambridge Network, including detail page scraping
 * for time, venue, full description, and images.
 * @returns {Promise<import('./_utils.js').NormalizedEvent[]>} Array of normalized event objects
 */
export async function scrapeCambridgeNetwork() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const listings = parseCambridgeNetwork($)
  log.info(SOURCE, `found ${listings.length} listings, fetching details`)

  const results = await Promise.allSettled(
    listings.map(async (evt) => {
      const detail$ = await fetchPage(evt.sourceUrl)
      const detail = parseDetailPage(detail$)
      return normalizeEvent({
        title: evt.title,
        description: detail.description || evt.description,
        date: evt.date,
        endDate: evt.endDate,
        source: SOURCE,
        sourceUrl: evt.sourceUrl,
        categories: detail.categories.length > 0 ? detail.categories : evt.categories,
        imageUrl: detail.imageUrl || evt.imageUrl,
        time: detail.time,
        location: detail.location,
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
