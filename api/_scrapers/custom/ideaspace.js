import { normalizeEvent } from '../_shared/utils.js'
import { log } from '../_shared/log.js'

const API_URL = 'https://ideaspace.cam.ac.uk/wp-json/wp/v2/posts'
const SOURCE = 'ideaspace'

export function parseIdeaspace($) {
  const events = []

  $('article, .post, .event-item, .type-tribe_events').each((_i, el) => {
    const item = $(el)
    const titleEl = item.find('h2 a, h3 a, .entry-title a').first()
    const title = (titleEl.text() || item.find('h2, h3, .entry-title').first().text()).trim()
    if (!title) return

    const href = titleEl.attr('href') || ''
    const sourceUrl = href.startsWith('http') ? href : 'https://ideaspace.cam.ac.uk/getting-involved/'

    const dateText = item.find('time, .entry-date, .event-date').first().attr('datetime')
      || item.find('time, .entry-date, .event-date').first().text().trim()
    if (!dateText) return

    const pubDate = new Date(dateText)
    if (isNaN(pubDate.getTime())) return
    const dateStr = pubDate.toISOString().split('T')[0]

    const description = item.find('.entry-summary, .entry-content, p').first().text().trim().slice(0, 500)

    const imgSrc = item.find('img').first().attr('src') || ''
    const imageUrl = imgSrc.startsWith('http') ? imgSrc : null

    events.push(
      normalizeEvent({
        title,
        description,
        date: dateStr,
        source: SOURCE,
        sourceUrl,
        location: 'IdeaSpace, West Hub, Cambridge',
        imageUrl,
      })
    )
  })

  return events
}

export async function scrapeIdeaspace() {
  log.info(SOURCE, 'starting scrape')
  const url = `${API_URL}?categories=1383&per_page=20&_embed`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)',
    },
  })
  if (!res.ok) throw new Error(`IdeaSpace fetch failed: ${res.status}`)
  const posts = await res.json()
  if (!Array.isArray(posts)) throw new Error('IdeaSpace API returned non-array response — schema or category ID may have changed')

  const events = posts.map((post) => {
    const title = post.title?.rendered?.replace(/<[^>]*>/g, '').trim()
    if (!title) return null

    const pubDate = new Date(post.date)
    if (isNaN(pubDate.getTime())) return null
    const dateStr = pubDate.toISOString().split('T')[0]

    const description = (post.excerpt?.rendered || '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500)

    const imageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null

    return normalizeEvent({
      title,
      description,
      date: dateStr,
      source: SOURCE,
      sourceUrl: post.link || 'https://ideaspace.cam.ac.uk/getting-involved/',
      location: 'IdeaSpace, West Hub, Cambridge',
      imageUrl,
      cost: 'Free',
      access: 'Open to All',
    })
  }).filter(Boolean)
  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
