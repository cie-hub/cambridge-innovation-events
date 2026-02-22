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
 * Parses Bradfield Centre listing page into event stubs.
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {{ title: string, date: string, sourceUrl: string, description: string, categories: string[], time: string|null, imageUrl: string|null }[]}
 */
export function parseBradfieldCentre($) {
  const listings = []

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

    listings.push({ title, date: startDateStr, sourceUrl, description, categories, time, imageUrl })
  })

  return listings
}

/**
 * Extracts cost/access from a Bradfield Centre detail page.
 * Body text lives in article div.article p elements.
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded detail page DOM
 * @returns {{ description: string, cost: string|null, access: string|null }}
 */
export function parseDetailPage($) {
  const paragraphs = []
  $('article div.article p').each((_i, el) => {
    const text = $(el).text().trim()
    if (text) paragraphs.push(text)
  })
  const fullText = paragraphs.join(' ')
  const description = fullText.replace(/\s+/g, ' ').trim().slice(0, 500)
  const { cost, access } = inferCostAccess(fullText)
  return { description, cost, access }
}

/**
 * Fetches and parses events from the Bradfield Centre, including detail pages.
 * @returns {Promise<import('./_utils.js').NormalizedEvent[]>} Array of normalized event objects
 */
export async function scrapeBradfieldCentre() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const listings = parseBradfieldCentre($)
  log.info(SOURCE, `found ${listings.length} listings, fetching details`)

  const results = await Promise.allSettled(
    listings.map(async (evt) => {
      const detail$ = await fetchPage(evt.sourceUrl)
      const detail = parseDetailPage(detail$)
      return normalizeEvent({
        title: evt.title,
        description: detail.description || evt.description,
        date: evt.date,
        source: SOURCE,
        sourceUrl: evt.sourceUrl,
        categories: evt.categories,
        time: evt.time,
        imageUrl: evt.imageUrl,
        cost: detail.cost,
        access: detail.access,
      })
    })
  )

  const rejected = results.filter((r) => r.status === 'rejected')
  if (rejected.length > 0) {
    log.warn(SOURCE, `${rejected.length} detail page fetches failed`)
  }

  const events = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter(Boolean)

  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
