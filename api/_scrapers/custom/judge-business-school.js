import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'

const API_URL = 'https://www.jbs.cam.ac.uk/wp-json/cjbs-event/v1/search'
const SOURCE = 'judge-business-school'
const FETCH_TIMEOUT_MS = 15_000

const ADMISSIONS_CATEGORY_IDS = new Set(['3267', '3287', '3268', '3269', '3270'])
const ACCELERATE_CATEGORY_ID = '3285'
const ACCELERATE_EVENTS_URL = 'https://www.jbs.cam.ac.uk/entrepreneurship/programmes/accelerate-cambridge/events/'

function parseCatIds(categoryField) {
  return [...(categoryField || '').matchAll(/data-value="(\d+)"/g)].map(m => m[1])
}

export function filterAndParseApiEvents(posts) {
  return posts
    .filter((post) => {
      const catIds = parseCatIds(post.categoryField)
      return !catIds.some(id => ADMISSIONS_CATEGORY_IDS.has(id))
    })
    .map((post) => {
      const dateObj = new Date(post.start_date * 1000)
      if (isNaN(dateObj.getTime())) return null
      const date = dateObj.toISOString().split('T')[0]

      const catIds = parseCatIds(post.categoryField)
      const catNames = [...(post.categoryField || '').matchAll(/data-value="\d+">(.*?)</g)]
        .map(m => m[1].trim())
        .filter(Boolean)

      return {
        title: post.title?.replace(/&amp;/g, '&'),
        excerpt: post.excerpt?.trim() || '',
        date,
        time: post.tbc ? null : (post.time || null),
        sourceUrl: post.permalink,
        categories: catNames,
        access: 'Public',
        isAccelerateCambridge: catIds.includes(ACCELERATE_CATEGORY_ID),
      }
    })
    .filter(Boolean)
}

export function parseDetailPage($) {
  const location = $('p.event-address.main.bold').first().text().trim() || null

  const ogImage = $('meta[property="og:image"]').attr('content') || ''
  const imageUrl = ogImage.startsWith('http') && !ogImage.includes('cjbs-logo-with-shield')
    ? ogImage
    : null

  const descParts = []
  $('main .wp-block-group').each((_i, el) => {
    $(el).find('p, h3, li').each((_j, child) => {
      const text = $(child).text().trim()
      if (text.length > 10) descParts.push(text)
    })
  })
  const description = descParts.join(' ').replace(/\s+/g, ' ').trim()

  return { location, imageUrl, description }
}

export function parseAcEventListings($) {
  const map = new Map()
  $('.b06Box').each((_i, el) => {
    const title = $(el).find('.b06EventTitle').text().trim()
    const excerpt = $(el).find('.b06EventExcerpt').text().trim()
    if (title && excerpt) map.set(title.toLowerCase(), excerpt)
  })
  return map
}

export function assembleDescription(detailDescription, excerpt, isAccelerateCambridge, eventTitle, acMap) {
  if (isAccelerateCambridge) {
    const acExcerpt = acMap.get(eventTitle.toLowerCase()) || ''
    if (acExcerpt && detailDescription) {
      return (acExcerpt + ' ' + detailDescription).slice(0, 800)
    }
    return (acExcerpt || detailDescription || excerpt).slice(0, 800)
  }
  return (detailDescription || excerpt).slice(0, 800)
}

export async function scrapeJudgeBusinessSchool() {
  log.info(SOURCE, 'starting scrape')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  const res = await fetch(API_URL, {
    headers: { 'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)' },
    signal: controller.signal,
  }).finally(() => clearTimeout(timer))
  if (!res.ok) throw new Error(`JBS Events API fetch failed: ${res.status}`)
  const data = await res.json()
  if (!data.post || !Array.isArray(data.post)) {
    throw new Error('JBS Events API returned unexpected shape — missing post array')
  }

  const listings = filterAndParseApiEvents(data.post)
  log.info(SOURCE, `found ${listings.length} non-admissions events, fetching details`)

  let acMap = new Map()
  if (listings.some(l => l.isAccelerateCambridge)) {
    const ac$ = await fetchPage(ACCELERATE_EVENTS_URL)
    acMap = parseAcEventListings(ac$)
    log.info(SOURCE, 'fetched AC programme page', { acEntries: acMap.size })
  }

  const results = await Promise.allSettled(
    listings.map(async (evt) => {
      const detail$ = await fetchPage(evt.sourceUrl)
      const detail = parseDetailPage(detail$)
      const description = assembleDescription(
        detail.description,
        evt.excerpt,
        evt.isAccelerateCambridge,
        evt.title,
        acMap,
      )
      return normalizeEvent({
        title: evt.title,
        description,
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
