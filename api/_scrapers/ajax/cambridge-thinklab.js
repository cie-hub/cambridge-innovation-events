import * as cheerio from 'cheerio'
import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { parseDayMonthYear } from '../_shared/dates.js'

const EVENTS_URL = 'https://www.thinklab.strategic-partnerships.admin.cam.ac.uk/events/'
const API_URL = 'https://www.thinklab.strategic-partnerships.admin.cam.ac.uk/wp-json/wp/v2/events?per_page=100&_embed'
const SOURCE = 'cambridge-thinklab'

/**
 * Extracts the slug from a ThinkLab event URL.
 * e.g. ".../events/event/item/some-event-slug/" → "some-event-slug"
 */
function extractSlug(url) {
  const parts = url.replace(/\/+$/, '').split('/')
  return parts[parts.length - 1]
}

/**
 * Strips HTML tags from a string and collapses whitespace.
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, '\u2014')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parses the ThinkLab /events/ HTML listing page for event dates, times,
 * and locations. These fields are rendered by the WordPress PHP template
 * from post meta and are not available in the REST API.
 *
 * @param {import('cheerio').CheerioAPI} $ - Cheerio-loaded DOM
 * @returns {{ slug: string, date: string, time: string|null, location: string|null }[]}
 */
export function parseThinkLabListing($) {
  const events = []

  $('div.card.card--borderless').each((_i, el) => {
    const card = $(el)

    const linkEl = card.find('a.card-link')
    const href = linkEl.attr('href')
    if (!href) return

    const slug = extractSlug(href)

    // Format: "23 February, 2026 @ 2:00 pm" or "11 December, 2023 @ 10:00 am - Jesus College, Cambridge"
    const detailsText = card.find('.card__details').text().trim()
    if (!detailsText) return

    const [datePart, rest] = detailsText.split('@').map(s => s.trim())
    if (!datePart) return

    // Remove comma: "23 February, 2026" → "23 February 2026"
    const dateClean = datePart.replace(',', '')
    const date = parseDayMonthYear(dateClean)
    if (!date) return

    let time = null
    let location = null

    if (rest) {
      const locationSplit = rest.split(/\s+-\s+/)
      time = locationSplit[0]?.trim() || null
      location = locationSplit.slice(1).join(' - ').trim() || null
    }

    events.push({ slug, date, time, location })
  })

  return events
}

/**
 * Merges WP REST API event data with listing page dates/times/locations.
 * Matches events by URL slug.
 *
 * @param {Object[]} apiEvents - Parsed JSON from /wp-json/wp/v2/events?_embed
 * @param {{ slug: string, date: string, time: string|null, location: string|null }[]} listing
 * @returns {{ title: string, description: string, date: string, time: string|null, location: string|null, sourceUrl: string, imageUrl: string|null }[]}
 */
export function mergeApiWithListing(apiEvents, listing) {
  const dateMap = new Map(listing.map(e => [e.slug, e]))
  const merged = []

  for (const apiEvent of apiEvents) {
    const listingData = dateMap.get(apiEvent.slug)
    if (!listingData) continue

    const title = apiEvent.title?.rendered
      ?.replace(/&#038;/g, '&')
      .replace(/&#8217;/g, '\u2019')
      .replace(/&#8211;/g, '\u2014')
      .replace(/&#8212;/g, '\u2014')
      .trim()
    if (!title) continue

    const rawContent = apiEvent.content?.rendered || ''
    const description = stripHtml(rawContent).slice(0, 500)

    const sourceUrl = apiEvent.link

    let imageUrl = null
    const media = apiEvent._embedded?.['wp:featuredmedia']?.[0]
    if (media) {
      imageUrl = media.media_details?.sizes?.crop_415x190?.source_url
        || media.source_url
        || null
    }

    merged.push({
      title,
      description,
      date: listingData.date,
      time: listingData.time,
      location: listingData.location,
      sourceUrl,
      imageUrl,
    })
  }

  return merged
}

export async function scrapeCambridgeThinklab() {
  log.info(SOURCE, 'starting scrape')

  const [apiRes, $] = await Promise.all([
    fetch(API_URL, {
      headers: { 'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)' },
    }).then(res => {
      if (!res.ok) throw new Error(`API fetch failed: ${res.status}`)
      return res.json()
    }),
    fetchPage(EVENTS_URL),
  ])

  const listing = parseThinkLabListing($)
  const merged = mergeApiWithListing(apiRes, listing)

  const events = merged
    .map(evt => normalizeEvent({
      title: evt.title,
      description: evt.description,
      date: evt.date,
      source: SOURCE,
      sourceUrl: evt.sourceUrl,
      time: evt.time,
      location: evt.location,
      imageUrl: evt.imageUrl,
      cost: 'Free',
    }))
    .filter(Boolean)

  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
