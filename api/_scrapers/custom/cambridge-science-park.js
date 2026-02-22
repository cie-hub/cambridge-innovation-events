import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { parseDayMonthInfer } from '../_shared/dates.js'
import { inferCostAccess } from '../_shared/access.js'

const BASE_URL = 'https://cambridgesciencepark.co.uk'
const EVENTS_URL = `${BASE_URL}/events/`
const SOURCE = 'cambridge-science-park'

function parseDateFromText(text) {
  const match = text.match(/(\d{1,2})\w*\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i)
  if (!match) return null
  return parseDayMonthInfer(`${match[1]} ${match[2]}`)
}

function parseTimeFromText(text) {
  const match = text.match(/(\d{1,2}[.:]\d{2})\s*[–-]\s*(\d{1,2}[.:]\d{2})/)
  if (!match) return null
  return `${match[1].replace('.', ':')} - ${match[2].replace('.', ':')}`
}

/**
 * Parses event listings from the Cambridge Science Park /events/ page.
 * Returns listings with title, URL, and optional date/description from the listing.
 * Events without dates are kept — dates can be resolved from detail pages.
 *
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {{ title: string, sourceUrl: string, imageUrl: string|null, date: string|null, time: string|null, description: string }[]}
 */
export function parseCambridgeSciencePark($) {
  const events = []

  $('article.post').each((_i, el) => {
    const item = $(el)
    const titleEl = item.find('h2.entry-title a, h2 a')
    const title = titleEl.text().trim()
    const href = titleEl.attr('href')
    if (!title || !href) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    const desc = item.find('p').text().trim()

    const date = parseDateFromText(desc)
    const time = parseTimeFromText(desc)

    const imgSrc = item.find('img.wp-post-image').attr('src') || ''
    const imageUrl = imgSrc && imgSrc.startsWith('http') ? imgSrc : null

    events.push({ title, sourceUrl, imageUrl, date, time, description: desc.slice(0, 500) })
  })

  return events
}

/**
 * Extracts event details from a Cambridge Science Park detail page.
 * Date is in the first jet-listing-dynamic-field__content element.
 * Description and access info are in page paragraphs.
 *
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded detail page DOM
 * @returns {{ date: string|null, time: string|null, description: string|null, cost: string|null, access: string|null }}
 */
export function parseDetailPage($) {
  let date = null

  // Date from first jet-listing-dynamic-field__content matching a date pattern
  $('div.jet-listing-dynamic-field__content').each((_i, el) => {
    if (date) return
    const text = $(el).text().trim()
    const parsed = parseDateFromText(text)
    if (parsed) date = parsed
  })

  // Extract paragraphs from page content
  const paragraphs = []
  $('p').each((_i, el) => {
    const text = $(el).text().trim()
    if (text.length > 20) paragraphs.push(text)
  })

  const fullText = paragraphs.join('\n')
  const time = parseTimeFromText(fullText)
  const { cost, access } = inferCostAccess(fullText)

  // Build description from content paragraphs, excluding nav/footer/metadata
  const descParts = paragraphs.filter(p => {
    const lower = p.toLowerCase()
    return !lower.startsWith('discover') && !lower.startsWith('park life')
      && !lower.startsWith('visit us') && !lower.startsWith('facebook')
      && !lower.startsWith('by submitting') && !lower.includes('cambridge science parkmilton')
      && !lower.startsWith('word of mouth')
  })
  const description = descParts.length > 0 ? descParts.join(' ').slice(0, 500) : null

  return { date, time, description, cost, access }
}

/**
 * Fetches and parses events from Cambridge Science Park, including
 * detail page scraping for dates, descriptions, and access.
 * @returns {Promise<import('../_shared/utils.js').NormalizedEvent[]>}
 */
export async function scrapeCambridgeSciencePark() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const listings = parseCambridgeSciencePark($)
  log.info(SOURCE, `found ${listings.length} listings, fetching details`)

  const results = await Promise.allSettled(
    listings.map(async (evt) => {
      const detail$ = await fetchPage(evt.sourceUrl)
      const detail = parseDetailPage(detail$)

      const date = evt.date || detail.date
      if (!date) return null

      return normalizeEvent({
        title: evt.title,
        description: detail.description || evt.description,
        date,
        source: SOURCE,
        sourceUrl: evt.sourceUrl,
        time: evt.time || detail.time,
        imageUrl: evt.imageUrl,
        location: 'Cambridge Science Park',
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

  log.info(SOURCE, 'scrape complete', { total: listings.length, events: events.length })
  return events
}
