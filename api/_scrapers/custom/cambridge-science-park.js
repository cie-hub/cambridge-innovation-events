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

    const dateStr = parseDateFromText(desc)
    if (!dateStr) return

    const time = parseTimeFromText(desc)

    const imgSrc = item.find('img.wp-post-image').attr('src') || ''
    const imageUrl = imgSrc && imgSrc.startsWith('http') ? imgSrc : null

    const { cost, access } = inferCostAccess(desc)

    events.push(
      normalizeEvent({
        title,
        description: desc.slice(0, 500),
        date: dateStr,
        source: SOURCE,
        sourceUrl,
        time,
        imageUrl,
        location: 'Cambridge Science Park',
        cost,
        access,
      })
    )
  })

  return events
}

export async function scrapeCambridgeSciencePark() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const events = parseCambridgeSciencePark($)
  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
