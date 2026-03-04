import { normalizeEvent } from '../_shared/utils.js'
import { log } from '../_shared/log.js'

const SEARCH_URLS = [
  'https://www.eventbrite.co.uk/d/united-kingdom--cambridge/innovation/',
  'https://www.eventbrite.co.uk/d/united-kingdom--cambridge/business-networking/',
]
const SOURCE = 'eventbrite-cambridge'

function parseServerData(html) {
  const marker = 'window.__SERVER_DATA__ = '
  const idx = html.indexOf(marker)
  if (idx === -1) return null

  const start = idx + marker.length
  let depth = 0
  let end = start
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++
    else if (html[i] === '}') { depth--; if (depth === 0) { end = i + 1; break } }
  }

  return JSON.parse(html.slice(start, end))
}

export function extractEvents(results) {
  const events = []
  for (const evt of results) {
    if (!evt.name || !evt.start_date) continue

    const city = evt.primary_venue?.address?.city || ''
    if (!city.toLowerCase().includes('cambridge')) continue

    const dateMatch = evt.start_date.match(/^(\d{4}-\d{2}-\d{2})/)
    if (!dateMatch) continue

    let time = null
    if (evt.start_time && evt.end_time) {
      time = `${evt.start_time} - ${evt.end_time}`
    }

    let cost = null
    if (evt.ticket_availability?.minimum_ticket_price?.major_value === '0' || evt.is_free) {
      cost = 'Free'
    } else if (evt.ticket_availability?.minimum_ticket_price?.display) {
      cost = evt.ticket_availability.minimum_ticket_price.display
    }

    events.push({
      id: evt.id,
      title: evt.name,
      description: evt.summary || '',
      date: dateMatch[1],
      time,
      location: evt.primary_venue?.name || city,
      city,
      imageUrl: evt.image?.url || null,
      sourceUrl: evt.url || `https://www.eventbrite.co.uk/e/${evt.id}`,
      cost,
    })
  }
  return events
}

export function deduplicateById(events) {
  const seen = new Map()
  for (const evt of events) {
    if (!seen.has(evt.id)) seen.set(evt.id, evt)
  }
  return [...seen.values()]
}

export async function scrapeEventbriteCambridge() {
  log.info(SOURCE, 'starting scrape')

  const allRaw = []
  for (const url of SEARCH_URLS) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)' },
      })
      if (!res.ok) {
        log.warn(SOURCE, `Failed to fetch ${url}: ${res.status}`)
        continue
      }
      const html = await res.text()
      const serverData = parseServerData(html)
      if (!serverData) {
        log.warn(SOURCE, `No __SERVER_DATA__ found on ${url}`)
        continue
      }
      const results = serverData?.search_data?.events?.results
      if (Array.isArray(results)) {
        allRaw.push(...extractEvents(results))
      }
    } catch (err) {
      log.warn(SOURCE, `Error processing ${url}: ${err.message}`)
    }
  }

  const unique = deduplicateById(allRaw)
  log.info(SOURCE, 'deduplicated events', { raw: allRaw.length, unique: unique.length })

  const events = unique.map(evt => normalizeEvent({
    title: evt.title,
    description: evt.description,
    date: evt.date,
    source: SOURCE,
    sourceUrl: evt.sourceUrl,
    location: evt.location,
    time: evt.time,
    imageUrl: evt.imageUrl,
    cost: evt.cost,
    access: 'Registration Required',
    categories: ['Innovation'],
  }))

  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
