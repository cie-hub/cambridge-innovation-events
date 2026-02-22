import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'

const BASE_URL = 'https://www.cambridgewireless.co.uk'
const EVENTS_URL = `${BASE_URL}/event-calendar.html`
const SOURCE = 'cambridge-wireless'

function parseDate(raw) {
  const trimmed = raw.trim()
  const rangeMatch = trimmed.match(/^(\d{1,2})\s*[–-]\s*(\d{1,2})\s+(\w+)\s+(\d{4})$/)
  if (rangeMatch) {
    const [, , endDay, month, year] = rangeMatch
    const startDate = new Date(`${rangeMatch[1]} ${month} ${year}`)
    const endDate = new Date(`${endDay} ${month} ${year}`)
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      return {
        date: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      }
    }
  }

  const crossMonthMatch = trimmed.match(/^(\d{1,2}\s+\w+)\s*[–-]\s*(\d{1,2}\s+\w+)\s+(\d{4})$/)
  if (crossMonthMatch) {
    const startDate = new Date(`${crossMonthMatch[1]} ${crossMonthMatch[3]}`)
    const endDate = new Date(`${crossMonthMatch[2]} ${crossMonthMatch[3]}`)
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      return {
        date: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      }
    }
  }

  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return { date: parsed.toISOString().split('T')[0], endDate: null }
  }

  return null
}

export function parseCambridgeWireless($) {
  const events = []

  $('article.eventfolio-calendar-event').each((_i, el) => {
    const card = $(el)

    const titleEl = card.find('h4.article-title a')
    const title = titleEl.text().trim()
    const href = titleEl.attr('href')
    if (!title || !href) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`

    const dateText = card.find('.article-date').text().trim()
    if (!dateText) return
    const dates = parseDate(dateText)
    if (!dates) return

    const description = card.find('.article-teaser p').text().trim()
    const imgSrc = card.find('.article-img img').attr('src')
    const imageUrl = imgSrc && imgSrc.startsWith('http') ? imgSrc : null
    const location = card.find('.event-venue').text().trim()

    const categories = []
    card.find('.article-post-meta .badge.event-type-badge').each((_j, badge) => {
      const text = $(badge).text().trim()
      if (text) categories.push(text)
    })

    const badge = card.find('.event-badge').text().trim()
    let cost = null
    if (badge) {
      if (/free/i.test(badge)) cost = 'Free'
      else if (/£/.test(badge)) cost = badge
    }

    events.push(
      normalizeEvent({
        title,
        description,
        date: dates.date,
        endDate: dates.endDate,
        source: SOURCE,
        sourceUrl,
        location,
        categories,
        imageUrl,
        cost,
        access: 'Registration Required',
      })
    )
  })

  // Only keep events in/near Cambridge UK
  return events.filter(Boolean).filter((evt) => {
    const loc = (evt.location || '').toLowerCase()
    return !loc || loc.includes('cambridge') || loc.includes('online') || loc.includes('virtual')
  })
}

export async function scrapeCambridgeWireless() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const events = parseCambridgeWireless($)
  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
