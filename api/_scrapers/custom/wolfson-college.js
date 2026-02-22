/**
 * Wolfson College Entrepreneurship Hub scraper
 *
 * Scrapes events from https://www.wolfson.cam.ac.uk/whats/events-feed
 * Uses the filtered HTML feed (Entrepreneurship Hub type=961) for the event list,
 * then cross-references the /rest/events JSON API for venue and speaker data.
 */
import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { parseDdMmYyyy } from '../_shared/dates.js'
import { inferCostAccess } from '../_shared/access.js'

const BASE_URL = 'https://www.wolfson.cam.ac.uk'
const FEED_URL = `${BASE_URL}/whats/events-feed?field_event_type_target_id=961`
const API_URL = `${BASE_URL}/rest/events`
const SOURCE = 'wolfson-college'

/**
 * Decodes common HTML entities from Drupal REST API responses.
 * The API returns &amp;, &#039;, etc. that need converting to plain text.
 */
function decodeEntities(text) {
  if (!text) return ''
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/**
 * Extracts cost and access from a Wolfson event detail page.
 * Runs inferCostAccess on the full page body text where access info lives.
 *
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded detail page DOM
 * @returns {{ cost: string|null, access: string|null }}
 */
export function parseDetailAccess($) {
  const text = $('div.main-block__copy').text().trim()
  return inferCostAccess(text)
}

/**
 * Parses events from the Wolfson College Entrepreneurship Hub HTML feed.
 * Pure parsing function — no network calls.
 *
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {{ title: string, date: string, time: string|null, description: string, sourceUrl: string, imageUrl: string|null }[]}
 */
export function parseWolfsonHtml($) {
  const events = []

  $('div.collapse__item').each((_i, el) => {
    const item = $(el)

    const title = item.find('h3').first().text().trim()
    if (!title) return

    const dateTimeText = item.find('.collapse__item__time span').text().trim()
    if (!dateTimeText) return

    // Format: "18/02/2026 at 17.30"
    const [datePart, timePart] = dateTimeText.split(' at ')
    const date = parseDdMmYyyy(datePart?.trim())
    if (!date) return

    const time = timePart ? timePart.trim().replace('.', ':') : null

    const description = item.find('[class*="field--name-field-introduction"] p').text().trim()

    const detailHref = item.find('a.btn-primary').attr('href')
    const sourceUrl = detailHref ? `${BASE_URL}${detailHref}` : ''

    const imgSrc = item.find('img').first().attr('src')
    const imageUrl = imgSrc ? (imgSrc.startsWith('http') ? imgSrc : `${BASE_URL}${imgSrc}`) : null

    events.push({ title, date, time, description, sourceUrl, imageUrl })
  })

  return events
}

/**
 * Enriches HTML-parsed events with data from the REST API.
 * Matches by title (after decoding HTML entities from the API).
 * Adds venue and uses API description/image when available.
 *
 * @param {{ title: string, date: string, time: string|null, description: string, sourceUrl: string, imageUrl: string|null }[]} htmlEvents
 * @param {Object[]} apiEvents - Raw array from /rest/events
 * @returns {{ title: string, date: string, time: string|null, description: string, sourceUrl: string, imageUrl: string|null, location: string }[]}
 */
export function enrichWithApi(htmlEvents, apiEvents) {
  const apiByTitle = new Map()
  for (const ev of apiEvents) {
    apiByTitle.set(decodeEntities(ev.title), ev)
  }

  return htmlEvents.map(ev => {
    const apiMatch = apiByTitle.get(ev.title)
    const desc = apiMatch ? decodeEntities(apiMatch.body) : ev.description
    const { cost, access } = inferCostAccess(desc || '')

    if (!apiMatch) {
      return { ...ev, description: desc, location: 'Wolfson College, Cambridge', cost, access }
    }

    const venue = decodeEntities(apiMatch.venue)
    const location = venue
      ? `${venue}, Wolfson College, Cambridge`
      : 'Wolfson College, Cambridge'

    return {
      ...ev,
      description: desc || ev.description,
      imageUrl: apiMatch.image_url ? decodeEntities(apiMatch.image_url) : ev.imageUrl,
      location,
      cost,
      access,
    }
  })
}

/**
 * Fetches and parses Wolfson College Entrepreneurship Hub events.
 * Fetches HTML feed (filtered) and REST API in parallel, then cross-references.
 * @returns {Promise<import('../_shared/utils.js').NormalizedEvent[]>}
 */
export async function scrapeWolfsonCollege() {
  log.info(SOURCE, 'starting scrape')

  const [$, apiData] = await Promise.all([
    fetchPage(FEED_URL),
    fetch(API_URL, {
      headers: { 'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)' },
    }).then(res => {
      if (!res.ok) throw new Error(`Wolfson REST API returned ${res.status}`)
      return res.json()
    }),
  ])

  const htmlEvents = parseWolfsonHtml($)
  log.info(SOURCE, `parsed ${htmlEvents.length} events from HTML feed`)

  const enriched = enrichWithApi(htmlEvents, apiData)
  log.info(SOURCE, `enriched ${enriched.length} events, fetching detail pages`)

  const results = await Promise.allSettled(
    enriched.map(async (ev) => {
      let { cost, access } = ev
      if (ev.sourceUrl) {
        const detail$ = await fetchPage(ev.sourceUrl)
        const detail = parseDetailAccess(detail$)
        if (detail.cost) cost = detail.cost
        if (detail.access) access = detail.access
      }
      return normalizeEvent({
        title: ev.title,
        description: ev.description,
        date: ev.date,
        source: SOURCE,
        sourceUrl: ev.sourceUrl,
        location: ev.location,
        time: ev.time,
        imageUrl: ev.imageUrl,
        cost,
        access,
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

  log.info(SOURCE, 'scrape complete', { total: htmlEvents.length, normalized: events.length })
  return events
}
