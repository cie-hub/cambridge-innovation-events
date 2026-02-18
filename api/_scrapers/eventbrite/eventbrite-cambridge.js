import { normalizeEvent } from '../_shared/utils.js'
import { log } from '../_shared/log.js'


const EVENTS_URL = 'https://www.eventbrite.co.uk/d/united-kingdom--cambridge/innovation/'
const SOURCE = 'eventbrite-cambridge'

export async function scrapeEventbriteCambridge() {
  log.info(SOURCE, 'starting scrape')
  const res = await fetch(EVENTS_URL, {
    headers: {
      'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)',
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch Eventbrite: ${res.status}`)
  }
  const html = await res.text()

  // Extract __SERVER_DATA__ JSON via brace-counting (too large for regex)
  const marker = 'window.__SERVER_DATA__ = '
  const idx = html.indexOf(marker)
  if (idx === -1) return []

  const start = idx + marker.length
  let depth = 0
  let end = start
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++
    else if (html[i] === '}') { depth--; if (depth === 0) { end = i + 1; break } }
  }

  let serverData
  try {
    serverData = JSON.parse(html.slice(start, end))
  } catch (err) {
    log.error(SOURCE, 'Failed to parse __SERVER_DATA__ JSON', err)
    return []
  }

  const results = serverData?.search_data?.events?.results
  if (!Array.isArray(results)) return []

  const events = []
  for (const evt of results) {
    if (!evt.name || !evt.start_date) continue

    const startDate = new Date(evt.start_date)
    if (isNaN(startDate.getTime())) continue
    const dateStr = startDate.toISOString().split('T')[0]

    let time = null
    if (evt.start_time && evt.end_time) {
      time = `${evt.start_time} - ${evt.end_time}`
    }

    const location = evt.primary_venue?.name || evt.primary_venue?.address?.city || ''
    const imageUrl = evt.image?.url || null
    const sourceUrl = evt.url || `https://www.eventbrite.co.uk/e/${evt.id}`

    let cost = null
    if (evt.ticket_availability?.minimum_ticket_price?.major_value === '0' || evt.is_free) {
      cost = 'Free'
    } else if (evt.ticket_availability?.minimum_ticket_price?.display) {
      cost = evt.ticket_availability.minimum_ticket_price.display
    }

    events.push(
      normalizeEvent({
        title: evt.name,
        description: evt.summary || '',
        date: dateStr,
        source: SOURCE,
        sourceUrl,
        location,
        time,
        imageUrl,
        cost,
        categories: ['Innovation'],
      })
    )
  }

  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
