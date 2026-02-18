import { normalizeEvent } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { formatTimeRange } from '../_shared/dates.js'

const EVENTS_URL = 'https://www.qescambridge.com/events'
const SOURCE = 'queens-college'
const WIX_EVENTS_APP_ID = '140603ad-af8d-84a5-2c80-a0f60cb47351'

function parseWixEventsFromHtml(html) {
  const marker = '"appsWarmupData":'
  const idx = html.indexOf(marker)
  if (idx === -1) return []

  const start = idx + marker.length
  let depth = 0
  let end = start
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++
    else if (html[i] === '}') {
      depth--
      if (depth === 0) { end = i + 1; break }
    }
  }

  let warmupData
  try {
    warmupData = JSON.parse(html.slice(start, end))
  } catch (err) {
    log.error(SOURCE, 'Wix warmup data parse failed', err)
    return []
  }

  const appData = warmupData[WIX_EVENTS_APP_ID]
  if (!appData) return []

  const events = []

  for (const key of Object.keys(appData)) {
    const widget = appData[key]
    const widgetEvents = widget?.events?.events
    if (!Array.isArray(widgetEvents)) continue

    for (const evt of widgetEvents) {
      if (!evt.title) continue
      if (evt.status !== undefined && evt.status !== 0) continue

      const startStr = evt.scheduling?.config?.startDate
      if (!startStr) continue

      const startDate = new Date(startStr)
      if (isNaN(startDate.getTime())) continue
      const dateStr = startDate.toISOString().split('T')[0]

      let time = null
      const endStr = evt.scheduling?.config?.endDate
      if (startStr && endStr) {
        time = formatTimeRange(new Date(startStr), new Date(endStr))
      }

      const loc = evt.location
      const location = loc?.name
        ? [loc.name, loc.address].filter(Boolean).join(', ')
        : ''

      const slug = evt.slug || ''
      const sourceUrl = slug
        ? `https://www.qescambridge.com/event-details/${slug}`
        : EVENTS_URL

      events.push(
        normalizeEvent({
          title: evt.title,
          description: evt.description || '',
          date: dateStr,
          source: SOURCE,
          sourceUrl,
          location,
          time,
          categories: ["Queen's Entrepreneurship"],
        })
      )
    }
  }

  return events
}

export function parseQueensCollege($) {
  const html = $.html()
  return parseWixEventsFromHtml(html)
}

export async function scrapeQueensCollege() {
  log.info(SOURCE, 'starting scrape')
  const res = await fetch(EVENTS_URL, {
    headers: {
      'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)',
    },
  })
  if (!res.ok) throw new Error(`Queens College fetch failed: ${res.status}`)
  const html = await res.text()

  const events = parseWixEventsFromHtml(html)
  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
