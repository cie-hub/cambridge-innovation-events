import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { inferCostAccess } from '../_shared/access.js'

const RSS_URL = 'http://webservices.admin.cam.ac.uk/events/api/programmes/11/calendar/events.rss'
const SOURCE = 'cam-public-events'

// Word-boundary keywords that signal business/innovation/policy relevance
const RELEVANCE_PATTERNS = [
  'innovation', 'business', 'entrepreneur', 'startup', 'founder',
  'artificial intelligence', 'machine learning', 'technology',
  'investment', 'venture', 'funding', 'finance', 'fintech',
  'industry', 'industrial', 'economy', 'economic',
  'policy', 'governance', 'regulation', 'digital',
  'biotech', 'life science', 'healthcare', 'pharma',
  'sustainability', 'climate tech', 'clean energy',
  'big data', 'data science', 'computing', 'cyber', 'quantum',
  'leadership', 'strategy',
  'commerciali', 'spin-out', 'spinout', 'patent',
  'accelerat', 'incubat', 'scale-up', 'scaleup',
  'enterprise', 'supply chain',
].map((kw) => new RegExp(`\\b${kw}`, 'i'))

function isBusinessRelevant(title, description) {
  const text = `${title} ${description}`
  return RELEVANCE_PATTERNS.some((re) => re.test(text))
}

/**
 * Fetches description and image from an individual event detail page.
 * Detail pages have a div.summary with <p> description text and optional <img>.
 */
async function fetchEventDetails(url) {
  const $ = await fetchPage(url)
  const summary = $('div.summary')
  if (!summary.length) return { description: '', imageUrl: null, cost: null }

  const parts = []
  let cost = null
  summary.find('p').each((_i, el) => {
    const p = $(el)
    if (p.hasClass('cost')) {
      const costText = p.text().trim().replace(/^cost:\s*/i, '')
      if (costText) {
        const inferred = inferCostAccess(costText)
        cost = inferred.cost || costText
      }
      return
    }
    if (p.hasClass('dateRange') || p.hasClass('venueName')) return
    const text = p.text().trim()
    if (text) parts.push(text)
  })
  const description = parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 500)

  const imgSrc = summary.find('.image img').first().attr('src')
  const imageUrl = imgSrc || null

  return { description, imageUrl, cost }
}

export async function scrapeCamPublicEvents() {
  log.info(SOURCE, 'starting scrape')
  const res = await fetch(RSS_URL, {
    headers: {
      'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)',
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch Cambridge Public Events RSS: ${res.status}`)
  }
  const xml = await res.text()

  const rawEvents = []
  const items = xml.split('<item>').slice(1)

  for (const item of items) {
    const rawTitle = extractTag(item, 'title')
    const rssDescription = extractTag(item, 'description')
    const link = extractTag(item, 'link')

    if (!rawTitle) continue

    // Use ev:startdate/ev:enddate for proper structured date and time
    const evStart = extractTag(item, 'ev:startdate')
    const evEnd = extractTag(item, 'ev:enddate')
    const evLocation = extractTag(item, 'ev:location')

    // Parse ev:startdate (format: 2026-02-18T18:00)
    const startMatch = evStart?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
    const endMatch = evEnd?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)

    // Strip the date/time prefix from title: "2026-02-16 10:00 - Event Title"
    const prefixMatch = rawTitle.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*-\s*(.+)$/)
    const title = prefixMatch ? prefixMatch[3].trim() : rawTitle

    // Date from ev:startdate, falling back to title prefix
    const dateStr = startMatch ? startMatch[1] : (prefixMatch ? prefixMatch[1] : null)
    if (!dateStr) continue

    // Time range from ev:startdate + ev:enddate
    let time = null
    if (startMatch) {
      time = endMatch ? `${startMatch[2]} - ${endMatch[2]}` : startMatch[2]
    }

    if (!isBusinessRelevant(title, rssDescription)) continue

    const sourceUrl = link || 'https://www.admin.cam.ac.uk/whatson/'

    rawEvents.push({ title, dateStr, time, sourceUrl, location: evLocation || '' })
  }

  // Deduplicate by title (exhibitions repeat across days)
  const seen = new Set()
  const unique = rawEvents.filter((evt) => {
    if (seen.has(evt.title)) return false
    seen.add(evt.title)
    return true
  })

  log.info(SOURCE, 'parsed RSS', { raw: rawEvents.length, unique: unique.length })

  // Fetch descriptions and images from individual event pages
  const results = []
  for (const evt of unique) {
    let details = { description: '', imageUrl: null, cost: null }
    try {
      details = await fetchEventDetails(evt.sourceUrl)
    } catch (err) { log.warn(SOURCE, 'detail fetch failed', { url: evt.sourceUrl, error: err.message }) }

    results.push(
      normalizeEvent({
        title: evt.title,
        description: details.description,
        date: evt.dateStr,
        source: SOURCE,
        sourceUrl: evt.sourceUrl,
        location: evt.location,
        time: evt.time,
        imageUrl: details.imageUrl,
        categories: ['Research'],
        cost: details.cost,
      })
    )
  }

  log.info(SOURCE, 'scrape complete', { events: results.length })
  return results
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`))
  return match ? match[1].trim() : ''
}
