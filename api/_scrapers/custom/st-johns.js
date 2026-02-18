import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { parseDdMmYyyy } from '../_shared/dates.js'

const BASE_URL = 'https://www.stjohns.co.uk'
const EVENTS_URL = `${BASE_URL}/events`
const SOURCE = 'st-johns'

function parseDate(raw) {
  const result = parseDdMmYyyy(raw.trim())
  if (!result) throw new Error(`Failed to parse date: "${raw}"`)
  return result
}

/**
 * Extracts time from free-form event page text.
 * Handles patterns like "Time: 10am - 1pm", "between 08:30-10:30am", "5.30pm"
 * @param {string} text - Full page text content
 * @returns {string|null} Extracted time string or null
 */
function extractTime(text) {
  // "Time: 10am - 1pm" or "Time: 17:30 - 19:00"
  const timeLabel = text.match(/Time:\s*(.+?)(?:\.|$)/im)
  if (timeLabel) return timeLabel[1].trim()

  // "between 08:30-10:30am" or "between 5:00pm-7:00pm"
  const between = text.match(/between\s+([\d.:]+\s*(?:am|pm)?\s*[-–]\s*[\d.:]+\s*(?:am|pm)?)/i)
  if (between) return between[1].trim()

  // "5.30pm" standalone on a line (often with date)
  const standalone = text.match(/(\d{1,2}[.:]\d{2}\s*(?:am|pm)\s*[-–]\s*\d{1,2}[.:]\d{2}\s*(?:am|pm))/i)
  if (standalone) return standalone[1].trim()

  return null
}

/**
 * Extracts location from free-form event page text.
 * Handles patterns like "Location: ...", "Where: ...", "Venue: ..."
 * @param {string} text - Full page text content
 * @returns {string|null} Extracted location string or null
 */
function extractLocation(text) {
  // "Location: St Johns Innovation Centre, ..."
  const locLabel = text.match(/(?:Location|Where|Venue):\s*(.+?)(?:\n|$)/im)
  if (locLabel) return locLabel[1].trim()

  return null
}

/**
 * Extracts detail fields from an individual St Johns event page.
 * Parses free-form text paragraphs for time, location, and description.
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded detail page DOM
 * @returns {{ time: string|null, location: string|null, description: string|null, imageUrl: string|null }}
 */
export function parseDetailPage($) {
  let time = null
  let location = null
  let description = null
  let imageUrl = null

  // OG image from meta tag
  const ogImage = $('meta[property="og:image"]').attr('content')
  if (ogImage && ogImage.startsWith('http')) {
    imageUrl = ogImage
  }

  // Inline content images (wp-block-image)
  const inlineImg = $('main#content .page-content img').first()
  if (inlineImg.length) {
    const src = inlineImg.attr('src') || ''
    if (src && src.startsWith('http')) {
      imageUrl = src
    }
  }

  // Extract all paragraph text from page content
  const paragraphs = []
  $('main#content .page-content p').each((_i, el) => {
    const text = $(el).text().trim()
    if (text) paragraphs.push(text)
  })

  const fullText = paragraphs.join('\n')

  // Extract time and location from the free-form text
  time = extractTime(fullText)
  location = extractLocation(fullText)

  // Build description from paragraphs, excluding metadata lines
  const descParts = paragraphs.filter((p) => {
    const lower = p.toLowerCase()
    return !lower.startsWith('date:') && !lower.startsWith('time:')
      && !lower.startsWith('location:') && !lower.startsWith('where:')
      && !lower.startsWith('venue:') && !lower.startsWith('register')
      && !lower.startsWith('booking')
  })
  if (descParts.length > 0) {
    description = descParts.join(' ').slice(0, 500)
  }

  return { time, location, description, imageUrl }
}

/**
 * Parses St John's Innovation Centre events from a cheerio-loaded DOM.
 * The events page uses Elementor loop items with the post type "event".
 *
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {{ title: string, date: string, sourceUrl: string, imageUrl: string|null }[]}
 */
export function parseStJohns($) {
  const events = []

  const items = $('div.e-loop-item.type-event')

  items.each((_i, el) => {
    const item = $(el)

    const titleEl = item.find('h1.elementor-heading-title a')
    const title = titleEl.text().trim()
    const href = titleEl.attr('href')

    if (!title || !href) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`

    const dateText = item.find('.postStartDate .elementor-post-info__item--type-custom').text().trim()
    if (!dateText) return

    const startDateStr = parseDate(dateText)

    const imgEl = item.find('img[src]')
    const imgSrc = imgEl.attr('src') || ''
    const imageUrl = imgSrc && !imgSrc.includes('placeholder') ? imgSrc : null

    events.push({ title, date: startDateStr, sourceUrl, imageUrl })
  })

  return events
}

/**
 * Fetches and parses events from St John's Innovation Centre, including
 * detail page scraping for description, time, location, and images.
 * @returns {Promise<import('./_utils.js').NormalizedEvent[]>} Array of normalized event objects
 */
export async function scrapeStJohns() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const listings = parseStJohns($)
  log.info(SOURCE, `found ${listings.length} listings, fetching details`)

  const results = await Promise.allSettled(
    listings.map(async (evt) => {
      const detail$ = await fetchPage(evt.sourceUrl)
      const detail = parseDetailPage(detail$)
      return normalizeEvent({
        title: evt.title,
        description: detail.description,
        date: evt.date,
        source: SOURCE,
        sourceUrl: evt.sourceUrl,
        imageUrl: detail.imageUrl || evt.imageUrl,
        time: detail.time,
        location: detail.location,
      })
    })
  )

  const rejected = results.filter((r) => r.status === 'rejected')
  if (rejected.length > 0) {
    log.warn(SOURCE, `${rejected.length} detail page fetches failed`)
  }

  const events = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter(Boolean)

  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
