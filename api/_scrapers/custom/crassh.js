import * as cheerio from 'cheerio'

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
