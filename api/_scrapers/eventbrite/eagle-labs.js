import { normalizeEvent } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { formatTimeRange } from '../_shared/dates.js'

const SOURCE = 'eagle-labs'

const ORGANIZER_IDS = [
  '28163909931',  // National/Virtual events
  '27710347061',  // East & Midlands (includes Cambridge)
  '28484848887',  // Cambridge-specific (currently dormant, may reactivate)
]

async function fetchOrganizerEvents(orgId) {
  const url = `https://www.eventbrite.co.uk/org/${orgId}/showmore/?type=future&page=1`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)',
    },
  })
  if (!res.ok) throw new Error(`Eagle Labs fetch failed: ${res.status}`)
  const data = await res.json()
  return data?.data?.events || []
}

export function parseEagleLabs($) {
  const events = []

  $('article, .event-card, .event-item, [data-event]').each((_i, el) => {
    const item = $(el)
    const titleEl = item.find('h2 a, h3 a, .event-title a, a.event-link').first()
    const title = (titleEl.text() || item.find('h2, h3, .event-title').first().text()).trim()
    if (!title) return

    const href = titleEl.attr('href') || ''
    const sourceUrl = href.startsWith('http') ? href : href ? `https://labs.uk.barclays${href}` : 'https://labs.uk.barclays/events/'

    const dateText = item.find('time, .event-date, .date').first().attr('datetime')
      || item.find('time, .event-date, .date').first().text().trim()
    if (!dateText) return

    const startDate = new Date(dateText)
    if (isNaN(startDate.getTime())) return
    const dateStr = startDate.toISOString().split('T')[0]

    const description = item.find('p, .event-description, .description').first().text().trim().slice(0, 500)

    const imgSrc = item.find('img').first().attr('src') || ''
    const imageUrl = imgSrc.startsWith('http') ? imgSrc : null

    events.push(
      normalizeEvent({
        title,
        description,
        date: dateStr,
        source: SOURCE,
        sourceUrl,
        imageUrl,
        access: 'Registration Required',
      })
    )
  })

  return events
}

export async function scrapeEagleLabs() {
  const allEvents = []
  log.info(SOURCE, 'starting scrape', { organizers: ORGANIZER_IDS.length })

  for (const orgId of ORGANIZER_IDS) {
    let events
    try {
      events = await fetchOrganizerEvents(orgId)
    } catch (err) {
      log.warn(SOURCE, 'organizer fetch failed', { orgId, error: err.message })
      continue
    }

    for (const evt of events) {
      const title = evt.name?.text
      if (!title) continue

      const startDate = new Date(evt.start?.utc || evt.start?.local)
      if (isNaN(startDate.getTime())) continue
      const dateStr = startDate.toISOString().split('T')[0]

      let time = null
      if (evt.start?.local && evt.end?.local) {
        time = formatTimeRange(new Date(evt.start.local), new Date(evt.end.local))
      }

      const location = evt.venue?.name || ''

      const description = (evt.description?.text || evt.summary || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500)

      let cost = null
      if (evt.is_free) {
        cost = 'Free'
      } else if (evt.ticket_availability?.minimum_ticket_price?.display) {
        cost = evt.ticket_availability.minimum_ticket_price.display
      }

      allEvents.push(
        normalizeEvent({
          title,
          description,
          date: dateStr,
          source: SOURCE,
          sourceUrl: evt.url || 'https://labs.uk.barclays/events/',
          location,
          time,
          imageUrl: evt.logo?.url || null,
          cost,
          access: 'Registration Required',
        })
      )
    }
  }

  log.info(SOURCE, 'scrape complete', { events: allEvents.length })
  return allEvents
}
