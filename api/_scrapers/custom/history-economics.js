import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { parseDayMonthYear } from '../_shared/dates.js'

const EVENTS_URL = 'https://www.hist.cam.ac.uk/event-series/history-and-economics'
const SOURCE = 'history-economics'
const PAGE_URL = EVENTS_URL

const DATE_RE = /^\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i

/**
 * Parses History & Economics seminar events from the body HTML.
 * Events are unstructured <p> tags with <strong> dates, <a> speakers, <em> titles.
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {Array<{ title: string, date: string, location: string, sourceUrl: string, description: string, access: string }>}
 */
export function parseHistoryEconomics($) {
  const bodyField = $('article.event-series .field--name-body.field--item')
  const defaultLocation = $('.field--name-field-event-location .field--item').first().text().trim()

  const events = []
  let isHarvardSection = false

  bodyField.find('p').each((_i, el) => {
    const p = $(el)
    const text = p.text().trim()

    // Detect sub-series headings
    if (/Joint Harvard Center/i.test(text) && p.find('strong').length > 0) {
      isHarvardSection = true
      return
    }
    if (/The Cambridge.*History and Economics seminar/i.test(text) && p.find('strong').length > 0 && !DATE_RE.test(text)) {
      isHarvardSection = false
      return
    }

    // Skip "Past" links
    if (/^Past\s/i.test(text)) return

    const strongEl = p.find('strong').first()
    const strongText = strongEl.text().trim()
    if (!DATE_RE.test(strongText)) return

    // Skip if the strong is inside an <a> (it's a navigation link, not an event)
    if (strongEl.closest('a').length > 0) return

    // Parse date — may have " -- Venue" suffix
    const parts = strongText.split(/\s*--\s*/)
    const dateStr = parseDayMonthYear(parts[0])
    if (!dateStr) return

    const venueOverride = parts[1]?.trim() || null

    // Extract talk title from <em>
    const emText = p.find('em').first().text().trim()
    if (!emText) return

    // Extract speaker from first <a> that isn't "Further information"
    let speaker = ''
    p.find('a').each((_j, a) => {
      const linkText = $(a).text().trim()
      if (!speaker && !linkText.includes('Further information') && !linkText.includes('Past')) {
        speaker = linkText
      }
    })

    // Extract affiliation from parentheses after speaker
    const bodyHtml = p.html() || ''
    const affilMatch = bodyHtml.match(/\)\s*<\/a>.*?\(([^)]+)\)|<\/a>\s*(?:<span[^>]*>)?\s*\(([^)]+)\)/i)
    let affiliation = ''
    if (affilMatch) {
      affiliation = (affilMatch[1] || affilMatch[2] || '').trim()
    }

    // Build description
    const descParts = []
    if (speaker) descParts.push(affiliation ? `${speaker} (${affiliation})` : speaker)
    descParts.push(emText)
    const description = descParts.join('. ')

    // Determine sourceUrl
    let sourceUrl = PAGE_URL
    const furtherLink = p.find('a').filter((_j, a) => $(a).text().includes('Further information'))
    if (furtherLink.length > 0) {
      sourceUrl = furtherLink.attr('href') || PAGE_URL
    }

    // Determine location
    let location
    if (isHarvardSection) {
      location = 'Online'
    } else {
      location = venueOverride || defaultLocation || ''
    }

    events.push({
      title: emText,
      date: dateStr,
      time: '17:00 - 18:00',
      location,
      sourceUrl,
      description,
      access: 'University Only',
    })
  })

  return events
}

export async function scrapeHistoryEconomics() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const listings = parseHistoryEconomics($)
  log.info(SOURCE, `found ${listings.length} events`)

  const events = listings
    .map((evt) => normalizeEvent({ ...evt, source: SOURCE }))
    .filter(Boolean)

  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
