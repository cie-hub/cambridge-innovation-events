import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { parseDayMonthInfer, formatTimeRange, formatTime } from '../_shared/dates.js'

const EVENTS_URL = 'https://engage.ifm.eng.cam.ac.uk/upcoming/'
const SOURCE = 'ifm-engage'

function parseTimeRange(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  return trimmed.replace(/\s+/g, ' ')
}

export function parseIfmEngage($) {
  const events = []

  // Try JSON-LD first for structured data
  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const data = JSON.parse($(el).html())
      if (data['@type'] === 'Event' && data.name && data.startDate) {
        const startDate = new Date(data.startDate)
        if (isNaN(startDate.getTime())) return
        const dateStr = startDate.toISOString().split('T')[0]

        let endDateStr = null
        if (data.endDate) {
          const endDate = new Date(data.endDate)
          if (!isNaN(endDate.getTime())) {
            endDateStr = endDate.toISOString().split('T')[0]
          }
        }

        let time = formatTime(startDate)
        if (data.endDate) {
          const endDate = new Date(data.endDate)
          time = formatTimeRange(startDate, endDate)
        }

        const location = data.location?.name || data.location?.address?.addressLocality || ''
        const cost = data.offers?.price === 0 || data.isAccessibleForFree ? 'Free' : null

        events.push(
          normalizeEvent({
            title: data.name,
            description: data.description || '',
            date: dateStr,
            endDate: endDateStr !== dateStr ? endDateStr : null,
            source: SOURCE,
            sourceUrl: data.url || EVENTS_URL,
            location,
            cost,
            time,
          })
        )
      }
    } catch (err) { log.warn(SOURCE, 'JSON-LD parse failed', { error: err.message }) }
  })

  if (events.length > 0) return events

  // Fallback: parse HTML grid items
  $('.et_pb_grid_item').each((_i, el) => {
    const item = $(el).find('.et_pb_portfolio_item')
    if (!item.length) return

    const titleEl = item.find('.entry-title a')
    const title = titleEl.text().trim()
    const href = titleEl.attr('href')
    if (!title || !href) return

    const dateText = item.find('.event-date').text().trim()
    const date = parseDayMonthInfer(dateText)
    if (!date) return

    const description = item.find('.entry-content').text().trim()
    const time = parseTimeRange(item.find('.event-time').text())
    const location = item.find('.event-location').text().trim()
    const priceText = item.find('.event-price').text().trim()
    const cost = priceText.toLowerCase() === 'free' ? 'Free' : priceText || null

    events.push(
      normalizeEvent({
        title,
        description,
        date,
        source: SOURCE,
        sourceUrl: href,
        location,
        cost,
        time,
      })
    )
  })

  return events
}

export async function scrapeIfmEngage() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const events = parseIfmEngage($)
  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
