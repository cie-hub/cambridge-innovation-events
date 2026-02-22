import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { parseDayMonthYear } from '../_shared/dates.js'
import { inferCostAccess } from '../_shared/access.js'

const EVENTS_URL = 'https://www.ifm.eng.cam.ac.uk/events/'
const SOURCE = 'ifm-events'

/**
 * Parses IFM Events listing page into event stubs.
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {{ title: string, date: string, sourceUrl: string, description: string, imageUrl: string|null }[]}
 */
export function parseIfmEvents($) {
  const listings = []

  $('div.event').each((_i, el) => {
    const card = $(el)

    const titleEl = card.find('h3 a')
    const title = titleEl.text().trim()
    const href = titleEl.attr('href')
    if (!title || !href) return

    const sourceUrl = href.startsWith('http') ? href : `https://www.ifm.eng.cam.ac.uk${href}`

    const dateText = card.find('h4').text().trim()
    if (!dateText) return
    const date = parseDayMonthYear(dateText)
    if (!date) return

    const descEl = card.find('div.col-md-8 p')
    const description = descEl.text().trim().replace(/\s+/g, ' ').slice(0, 500)

    const imgSrc = card.find('div.event-image img').attr('src')
    const imageUrl = imgSrc && imgSrc.startsWith('http') ? imgSrc : null

    listings.push({ title, date, sourceUrl, description, imageUrl })
  })

  return listings
}

/**
 * Extracts cost/access from an IFM internal detail page.
 * Body text lives in div.col-sm-9 p elements.
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded detail page DOM
 * @returns {{ description: string, cost: string|null, access: string|null }}
 */
export function parseDetailPage($) {
  const paragraphs = []
  $('div.col-sm-9 p').each((_i, el) => {
    const text = $(el).text().trim()
    if (text) paragraphs.push(text)
  })
  const fullText = paragraphs.join(' ')
  const description = fullText.replace(/\s+/g, ' ').trim().slice(0, 500)
  const { cost, access } = inferCostAccess(fullText)
  return { description, cost, access }
}

/**
 * Fetches and parses events from IFM, including detail pages for internal URLs.
 * External URLs (engage-events.ifm.eng.cam.ac.uk) use listing-page inference only.
 * @returns {Promise<import('./_utils.js').NormalizedEvent[]>} Array of normalized event objects
 */
export async function scrapeIfmEvents() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const listings = parseIfmEvents($)
  log.info(SOURCE, `found ${listings.length} listings, fetching details`)

  const results = await Promise.allSettled(
    listings.map(async (evt) => {
      let detail = { description: null, cost: null, access: null }
      const isInternal = evt.sourceUrl.includes('ifm.eng.cam.ac.uk/events/')
      if (isInternal) {
        const detail$ = await fetchPage(evt.sourceUrl)
        detail = parseDetailPage(detail$)
      }

      const listingInferred = inferCostAccess(evt.description)

      return normalizeEvent({
        title: evt.title,
        description: detail.description || evt.description,
        date: evt.date,
        source: SOURCE,
        sourceUrl: evt.sourceUrl,
        imageUrl: evt.imageUrl,
        categories: ['Innovation'],
        cost: detail.cost || listingInferred.cost,
        access: detail.access || listingInferred.access,
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
