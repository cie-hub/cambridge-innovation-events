import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { formatTimeRange } from '../_shared/dates.js'

const LUMA_API = 'https://api.lu.ma'

/**
 * Extracts plain text from a Luma ProseMirror description_mirror document.
 */
function extractTextFromMirror(node) {
  if (!node) return ''
  const parts = []
  if (node.type === 'text') {
    parts.push(node.text || '')
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      parts.push(extractTextFromMirror(child))
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Fetches the description for a single Luma event from its page.
 * The calendar/get-items API does not return descriptions —
 * they live in description_mirror on each event's detail page.
 */
async function fetchEventDescription(eventUrl) {
  const url = `https://luma.com/${eventUrl}`
  const $ = await fetchPage(url)
  const nextDataScript = $('#__NEXT_DATA__').html()
  if (!nextDataScript) return ''

  const data = JSON.parse(nextDataScript)
  const mirror = data?.props?.pageProps?.initialData?.data?.description_mirror
  if (!mirror) return ''

  return extractTextFromMirror(mirror).slice(0, 500)
}

/**
 * Fetches events from a Luma calendar via the public API.
 * Works for both calendar IDs (cal-xxx) and org pages.
 */
async function fetchCalendarEvents(calendarApiId) {
  const url = `${LUMA_API}/calendar/get-items?calendar_api_id=${calendarApiId}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)' },
  })
  if (!res.ok) throw new Error(`Luma calendar fetch failed: ${res.status}`)
  const data = await res.json()
  return data.entries || []
}

async function parseEntry(entry, source) {
  const evt = entry?.event
  if (!evt?.name || !evt?.start_at) return null

  const startDate = new Date(evt.start_at)
  if (isNaN(startDate.getTime())) return null
  const dateStr = startDate.toISOString().split('T')[0]

  let time = null
  if (evt.start_at && evt.end_at) {
    time = formatTimeRange(new Date(evt.start_at), new Date(evt.end_at))
  }

  let location = ''
  const geo = evt.geo_address_info
  if (geo) {
    location = geo.description || geo.address || geo.city || ''
  }
  if (!location && evt.location_type === 'zoom') location = 'Online (Zoom)'

  let description = ''
  if (evt.url) {
    try {
      description = await fetchEventDescription(evt.url)
    } catch (err) {
      log.warn(source, 'Description fetch failed', { event: evt.name, error: err.message })
    }
  }

  return normalizeEvent({
    title: evt.name,
    description,
    date: dateStr,
    source,
    sourceUrl: `https://luma.com/${evt.url}`,
    location,
    time,
    imageUrl: evt.cover_url || null,
  })
}

/**
 * Scrapes events from a Luma page. Uses API for calendar IDs,
 * falls back to __NEXT_DATA__ parsing for org pages.
 */
export async function scrapeLumaPage(url, source) {
  log.info(source, 'starting scrape', { url })
  // Extract calendar API ID from URL
  const calMatch = url.match(/calendar\/(cal-[A-Za-z0-9]+)/)
  if (calMatch) {
    const entries = await fetchCalendarEvents(calMatch[1])
    const results = []
    for (const e of entries) {
      const parsed = await parseEntry(e, source)
      if (parsed) results.push(parsed)
    }
    log.info(source, 'scrape complete', { events: results.length })
    return results
  }

  // Org page: extract calendar ID from __NEXT_DATA__, then use API
  const $ = await fetchPage(url)
  const nextDataScript = $('#__NEXT_DATA__').html()
  if (!nextDataScript) return []

  try {
    const data = JSON.parse(nextDataScript)
    const pageProps = data?.props?.pageProps

    // Try to get calendar ID from org data
    const calendarId = pageProps?.initialData?.data?.calendar?.api_id
    if (calendarId) {
      const entries = await fetchCalendarEvents(calendarId)
      if (entries.length > 0) {
        const results = []
        for (const e of entries) {
          const parsed = await parseEntry(e, source)
          if (parsed) results.push(parsed)
        }
        log.info(source, 'scrape complete', { events: results.length })
        return results
      }
    }

    // Fallback: parse featured_items from __NEXT_DATA__
    const featuredItems = pageProps?.initialData?.data?.featured_items
    if (Array.isArray(featuredItems)) {
      const results = []
      for (const item of featuredItems) {
        const parsed = await parseEntry(item, source)
        if (parsed) results.push(parsed)
      }
      log.info(source, 'scrape complete', { events: results.length })
      return results
    }
  } catch (err) {
    log.warn(source, 'Failed to parse __NEXT_DATA__', { error: err.message })
  }

  log.info(source, 'scrape complete', { events: 0 })
  return []
}
