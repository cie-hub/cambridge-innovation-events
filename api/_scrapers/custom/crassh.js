import * as cheerio from 'cheerio'
import { normalizeEvent } from '../_shared/utils.js'
import { log } from '../_shared/log.js'

const SOURCE = 'crassh'

export function parseListingHtml(html) {
  const $ = cheerio.load(html)
  const seen = new Map()

  $('.events-item').each((_i, el) => {
    const item = $(el)
    const idAttr = item.attr('id') || ''
    const match = idAttr.match(/^event-(\d+)-/)
    if (!match) return
    const eventId = match[1]

    if (seen.has(eventId)) return

    const unixTs = parseInt(item.attr('data-date'), 10)
    if (!unixTs) return
    const date = new Date(unixTs * 1000).toISOString().split('T')[0]

    const linkEl = item.find('.events-body h3 a')
    const title = linkEl.text().trim()
    const sourceUrl = linkEl.attr('href') || ''
    if (!title || !sourceUrl) return

    const imageUrl = item.find('.events-image img').attr('src') || null
    const eventType = item.find('.events-type').text().trim()

    seen.set(eventId, { eventId, title, date, sourceUrl, imageUrl, eventType })
  })

  return [...seen.values()]
}

export function parseDetailPage($) {
  const time = $('td.time').first().text().trim() || null
  const location = $('td.location').first().text().trim() || null

  const descParts = []
  $('.tabs-content.contentArea').first().find('p, h3').each((_i, el) => {
    const text = $(el).text().trim()
    if (text.length > 10) descParts.push(text)
  })
  const description = descParts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 800)

  return { time, location, description }
}

const AJAX_URL = 'https://www.crassh.cam.ac.uk/wp-admin/admin-ajax.php'

export async function scrapeCrassh() {
  log.info(SOURCE, 'starting scrape')

  const MAX_PAGES = 3
  let page = 1
  const allListings = []

  while (page && page <= MAX_PAGES) {
    const res = await fetch(AJAX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)',
      },
      body: `action=screen_events&args[page]=${page}&args[range]=future`,
    })
    if (!res.ok) throw new Error(`CRASSH AJAX failed: ${res.status}`)
    const data = await res.json()

    const listings = parseListingHtml(data.html || '')
    allListings.push(...listings)

    page = data.nextpage || null
  }

  log.info(SOURCE, 'fetched listings', { count: allListings.length })

  const DEFAULT_LOCATION = 'CRASSH, Alison Richard Building, 7 West Road, Cambridge'

  const events = await Promise.all(allListings.map(async (listing) => {
    let detail = { time: null, location: null, description: '' }
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(listing.sourceUrl, {
        headers: { 'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)' },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer))
      const html = await res.text()
      detail = parseDetailPage(cheerio.load(html))
    } catch (err) {
      log.warn(SOURCE, `detail page failed for ${listing.sourceUrl}: ${err.message}`)
    }
    return normalizeEvent({
      title: listing.title,
      description: detail.description,
      date: listing.date,
      source: SOURCE,
      sourceUrl: listing.sourceUrl,
      time: detail.time,
      location: detail.location || DEFAULT_LOCATION,
      imageUrl: listing.imageUrl,
      access: 'Public',
    })
  }))

  log.info(SOURCE, 'scrape complete', { events: events.filter(Boolean).length })
  return events.filter(Boolean)
}
