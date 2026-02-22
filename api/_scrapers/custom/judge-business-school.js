import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'

const API_URL = 'https://www.jbs.cam.ac.uk/wp-json/cjbs-event/v1/search'
const SOURCE = 'judge-business-school'

const ADMISSIONS_CATEGORY_IDS = new Set(['3267', '3287', '3268', '3269', '3270'])

/**
 * Filters out admissions events and parses API response into listing objects.
 * @param {Object[]} posts - Array of event objects from the JBS API
 * @returns {{ title: string, date: string, time: string|null, sourceUrl: string, categories: string[], access: string|null }[]}
 */
export function filterAndParseApiEvents(posts) {
  return posts
    .filter((post) => {
      const catIds = [...(post.categoryField || '').matchAll(/data-value="(\d+)"/g)].map(m => m[1])
      return !catIds.some(id => ADMISSIONS_CATEGORY_IDS.has(id))
    })
    .map((post) => {
      const dateObj = new Date(post.start_date * 1000)
      if (isNaN(dateObj.getTime())) return null
      const date = dateObj.toISOString().split('T')[0]

      const catNames = [...(post.categoryField || '').matchAll(/data-value="\d+">(.*?)</g)]
        .map(m => m[1].trim())
        .filter(Boolean)

      let access = null
      if (post.audience && /University of Cambridge/i.test(post.audience)) {
        access = 'University Only'
      }

      return {
        title: post.title?.replace(/&amp;/g, '&'),
        date,
        time: post.tbc ? null : (post.time || null),
        sourceUrl: post.permalink,
        categories: catNames,
        access,
      }
    })
    .filter(Boolean)
}

/**
 * Extracts venue, image, and description from a JBS event detail page.
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {{ location: string|null, imageUrl: string|null, description: string }}
 */
export function parseDetailPage($) {
  const location = $('p.event-address.main.bold').first().text().trim() || null

  const ogImage = $('meta[property="og:image"]').attr('content') || ''
  const imageUrl = ogImage.startsWith('http') && !ogImage.includes('cjbs-logo-with-shield')
    ? ogImage
    : null

  const descParts = []
  $('.cjbs-event > div.wp-block-group').each((_i, el) => {
    $(el).find('p, h3').each((_j, child) => {
      const text = $(child).text().trim()
      if (text.length > 10) descParts.push(text)
    })
  })
  const description = descParts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 500)

  return { location, imageUrl, description }
}

export async function scrapeJudgeBusinessSchool() {
  log.info(SOURCE, 'starting scrape')

  const res = await fetch(API_URL, {
    headers: { 'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)' },
  })
  if (!res.ok) throw new Error(`JBS Events API fetch failed: ${res.status}`)
  const data = await res.json()
  if (!data.post || !Array.isArray(data.post)) {
    throw new Error('JBS Events API returned unexpected shape — missing post array')
  }

  const listings = filterAndParseApiEvents(data.post)
  log.info(SOURCE, `found ${listings.length} non-admissions events, fetching details`)

  const results = await Promise.allSettled(
    listings.map(async (evt) => {
      const detail$ = await fetchPage(evt.sourceUrl)
      const detail = parseDetailPage(detail$)
      return normalizeEvent({
        title: evt.title,
        description: detail.description,
        date: evt.date,
        source: SOURCE,
        sourceUrl: evt.sourceUrl,
        categories: evt.categories,
        imageUrl: detail.imageUrl,
        time: evt.time,
        location: detail.location,
        access: evt.access,
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
