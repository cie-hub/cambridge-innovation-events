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
