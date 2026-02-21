import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { parseDateFromBrHtml } from '../_shared/dates.js'
import { inferCostAccess } from '../_shared/access.js'

const BASE_URL = 'https://www.jbs.cam.ac.uk'
const EVENTS_URL = `${BASE_URL}/entrepreneurship/programmes/accelerate-cambridge/events/`
const SOURCE = 'judge-business-school'

export function parseDetailPage($) {
  let time = null
  let location = null
  const categories = []

  const scripts = $('script').toArray()
  for (const script of scripts) {
    const text = $(script).html() || ''
    if (!text.includes('dataLayer_content')) continue
    const match = text.match(/dataLayer_content\s*=\s*(\{[\s\S]*?\});/)
    if (!match) continue
    try {
      const data = JSON.parse(match[1])
      const meta = data?.pagePostTerms?.meta
      if (meta) {
        const start = meta.cjbs_event_datetimes_0_cjbs_event_start
        const end = meta.cjbs_event_datetimes_0_cjbs_event_end
        if (start && end) {
          const fmt = (s) => s.split(' ')[1]?.slice(0, 5)
          time = `${fmt(start)} - ${fmt(end)}`
        }
        if (meta.location) {
          // meta.location may be a PHP serialized array like a:1:{i:0;s:13:"Cambridge, UK";}
          const phpMatch = String(meta.location).match(/s:\d+:"([^"]+)"/)
          location = phpMatch ? phpMatch[1] : String(meta.location)
        }
      }
      const terms = data?.pagePostTerms?.cjbs_event_categories
      if (Array.isArray(terms)) {
        for (const t of terms) categories.push(t)
      }
    } catch (err) { log.warn(SOURCE, 'dataLayer parse failed', { error: err.message }) }
    break
  }

  // Prefer the specific venue from the HTML over the generic dataLayer meta.location
  const venueEl = $('p.event-address.main.bold').first().text().trim()
  if (venueEl) {
    location = venueEl
  }

  const ogImage = $('meta[property="og:image"]').attr('content')
  const imageUrl = ogImage && ogImage.startsWith('http') ? ogImage : null

  return { time, location, categories, imageUrl }
}

export function parseJudgeBusinessSchool($) {
  const events = []

  $('.b06Box').each((_i, el) => {
    const card = $(el)
    const titleEl = card.find('.b06EventTitle a')
    const title = titleEl.text().trim()
    const href = titleEl.attr('href')
    if (!title || !href) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`

    const dateHtml = card.find('.b06EventDate .Date h3').html()
    if (!dateHtml) return
    const date = parseDateFromBrHtml(dateHtml)
    if (!date) return

    const description = card.find('.b06EventExcerpt p').text().trim()

    events.push({ title, date, sourceUrl, description })
  })

  return events
}

export async function scrapeJudgeBusinessSchool() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const listings = parseJudgeBusinessSchool($)
  log.info(SOURCE, `found ${listings.length} listings, fetching details`)

  const results = await Promise.allSettled(
    listings.map(async (evt) => {
      const detail$ = await fetchPage(evt.sourceUrl)
      const detail = parseDetailPage(detail$)
      const { cost, access } = inferCostAccess(evt.description)
      return normalizeEvent({
        title: evt.title,
        description: evt.description,
        date: evt.date,
        source: SOURCE,
        sourceUrl: evt.sourceUrl,
        categories: detail.categories,
        imageUrl: detail.imageUrl,
        time: detail.time,
        location: detail.location,
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

  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
