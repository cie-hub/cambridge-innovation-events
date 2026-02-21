import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { parseDayMonthYear } from '../_shared/dates.js'
import { inferCostAccess } from '../_shared/access.js'

const EVENTS_URL = 'https://www.ifm.eng.cam.ac.uk/events/'
const SOURCE = 'ifm-events'

export function parseIfmEvents($) {
  const events = []

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

    const { cost, access } = inferCostAccess(description)

    events.push(
      normalizeEvent({
        title,
        description,
        date,
        source: SOURCE,
        sourceUrl,
        imageUrl,
        categories: ['Innovation'],
        cost,
        access,
      })
    )
  })

  return events
}

export async function scrapeIfmEvents() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const events = parseIfmEvents($)
  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
