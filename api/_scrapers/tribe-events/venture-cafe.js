import { normalizeEvent } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { formatTimeRange } from '../_shared/dates.js'

const API_URL = 'https://venturecafecambridgeconnect.org/wp-json/tribe/events/v1/events'
const SOURCE = 'venture-cafe'

export function parseVentureCafe($) {
  const events = []

  $('.tribe-events-calendar .tribe_events, article.tribe_events, .type-tribe_events, .tribe-events-list .tribe-events-event').each((_i, el) => {
    const item = $(el)
    const titleEl = item.find('h2 a, h3 a, .tribe-events-list-event-title a, .tribe-event-title a').first()
    const title = (titleEl.text() || item.find('h2, h3').first().text()).trim()
    if (!title) return

    const href = titleEl.attr('href') || ''
    const sourceUrl = href.startsWith('http') ? href : 'https://venturecafecambridgeconnect.org/events/'

    const dateText = item.find('time, .tribe-event-schedule-details, .tribe-events-schedule').first().attr('datetime')
      || item.find('.tribe-event-date-start, .tribe-events-event-meta time').first().text().trim()
    if (!dateText) return

    const startDate = new Date(dateText)
    if (isNaN(startDate.getTime())) return
    const dateStr = startDate.toISOString().split('T')[0]

    const description = item.find('.tribe-events-list-event-description p, .tribe-events-content p').first().text().trim().slice(0, 500)

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
      })
    )
  })

  return events
}

export async function scrapeVentureCafe() {
  log.info(SOURCE, 'starting scrape')
  const res = await fetch(API_URL, {
    headers: {
      'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)',
    },
  })
  if (!res.ok) throw new Error(`Venture Cafe fetch failed: ${res.status}`)
  const data = await res.json()
  if (!data.events || !Array.isArray(data.events)) return []

  const events = data.events.map((evt) => {
    const startDate = new Date(evt.start_date)
    if (isNaN(startDate.getTime())) return null
    const dateStr = startDate.toISOString().split('T')[0]

    let time = null
    if (evt.start_date && evt.end_date) {
      time = formatTimeRange(new Date(evt.start_date), new Date(evt.end_date))
    }

    const venue = evt.venue
    const location = venue
      ? [venue.venue, venue.city].filter(Boolean).join(', ')
      : ''

    const description = (evt.description || '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500)

    return normalizeEvent({
      title: evt.title,
      description,
      date: dateStr,
      source: SOURCE,
      sourceUrl: evt.url || 'https://venturecafecambridgeconnect.org/events/',
      location,
      time,
      imageUrl: evt.image?.url || null,
    })
  }).filter(Boolean)
  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
