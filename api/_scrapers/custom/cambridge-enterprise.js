import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { parseDayMonthYear } from '../_shared/dates.js'

const EVENTS_URL = 'https://www.enterprise.cam.ac.uk/our-events/'
const SOURCE = 'cambridge-enterprise'

export function parseCambridgeEnterprise($) {
  const events = []

  $('#search-filter-results-31031 a.group').each((_i, el) => {
    const card = $(el)

    const title = card.find('h3').text().trim()
    const href = card.attr('href')
    if (!title || !href) return

    const sourceUrl = href.startsWith('http') ? href : `https://www.enterprise.cam.ac.uk${href}`

    // Date + time line: "25 February 2026 • 10:00"
    const dateTimeLine = card.find('span.text-20sr').text().trim()
    const parts = dateTimeLine.split(/[•·]/)
    const dateStr = parts[0]?.trim()
    const timeStr = parts[1]?.trim() || null

    const date = parseDayMonthYear(dateStr)
    if (!date) return

    const imgSrc = card.find('img.fill-image').attr('src')
    const imageUrl = imgSrc && imgSrc.startsWith('http') ? imgSrc : null

    events.push(
      normalizeEvent({
        title,
        date,
        source: SOURCE,
        sourceUrl,
        time: timeStr,
        imageUrl,
        categories: ['Enterprise'],
        access: 'Registration Required',
      })
    )
  })

  return events
}

export async function scrapeCambridgeEnterprise() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const events = parseCambridgeEnterprise($)
  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
