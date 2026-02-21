import { normalizeEvent } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { formatTimeRange, formatTime } from '../_shared/dates.js'

const GQL_URL = 'https://www.meetup.com/gql2'

function stripMarkdown(text) {
  return text
    .replace(/<[^>]*>/g, '')           // HTML tags
    .replace(/^#{1,6}\s+/gm, '')       // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1')     // italic
    .replace(/__([^_]+)__/g, '$1')     // bold alt
    .replace(/_([^_]+)_/g, '$1')       // italic alt
    .replace(/~~([^~]+)~~/g, '$1')     // strikethrough
    .replace(/`([^`]+)`/g, '$1')       // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^>\s?/gm, '')            // blockquotes
    .replace(/^[-*+]\s+/gm, '')        // unordered lists
    .replace(/^\d+\.\s+/gm, '')        // ordered lists
    .replace(/^---+$/gm, '')           // horizontal rules
    .replace(/\\([`*_{}[\]()#+\-.!])/g, '$1') // escaped markdown chars
    .replace(/\\([a-zA-Z])/g, '$1')  // stray backslash escapes
    .replace(/\s+/g, ' ')
    .trim()
}

const EVENTS_FRAGMENT = `
  edges {
    node {
      id title description dateTime endTime eventUrl
      venue { name address city }
      featuredEventPhoto { highResUrl }
      going { totalCount }
      eventType isOnline
      series { description }
      feeSettings { amount currency }
    }
  }
`

/**
 * Fetch upcoming events for multiple Meetup groups via GraphQL.
 * Groups are batched using aliases to minimise requests.
 */
export async function fetchMeetupGroups(slugs, source) {
  const allEvents = []
  log.info(source, 'fetching meetup groups', { count: slugs.length })

  // Batch groups ~5 at a time to keep query size reasonable
  for (let i = 0; i < slugs.length; i += 5) {
    const batch = slugs.slice(i, i + 5)
    const aliases = batch.map((slug, j) => {
      const alias = `g${i + j}`
      return `${alias}: groupByUrlname(urlname: "${slug}") {
        name urlname
        events(first: 20, sort: ASC, filter: {status: [ACTIVE]}) {
          ${EVENTS_FRAGMENT}
        }
      }`
    })

    const query = `query { ${aliases.join('\n')} }`

    const res = await fetch(GQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)',
      },
      body: JSON.stringify({ query }),
    })

    if (!res.ok) { log.warn(source, 'Meetup GraphQL batch failed', { status: res.status }); continue }
    const json = await res.json()
    if (!json.data) { log.warn(source, 'Meetup GraphQL response missing data'); continue }

    for (const key of Object.keys(json.data)) {
      const group = json.data[key]
      if (!group?.events?.edges) continue

      const groupName = group.name || group.urlname

      for (const { node: evt } of group.events.edges) {
        if (!evt.title || !evt.dateTime) continue

        const startDate = new Date(evt.dateTime)
        if (isNaN(startDate.getTime())) continue
        const dateStr = startDate.toISOString().split('T')[0]

        let time = formatTime(startDate)
        if (evt.endTime) {
          const endDate = new Date(evt.endTime)
          if (!isNaN(endDate.getTime())) {
            time = formatTimeRange(startDate, endDate)
          }
        }

        const venue = evt.venue
        const location = venue
          ? [venue.name, venue.city].filter(Boolean).join(', ')
          : evt.isOnline ? 'Online' : ''

        const description = stripMarkdown(evt.description || '')
          .slice(0, 500)

        const imageUrl = evt.featuredEventPhoto?.highResUrl || null
        const isRecurring = !!evt.series

        let cost = null
        if (evt.feeSettings) {
          cost = evt.feeSettings.amount === 0 ? 'Free' : `${evt.feeSettings.currency || '£'}${evt.feeSettings.amount}`
        }

        const normalized = normalizeEvent({
          title: evt.title,
          description,
          date: dateStr,
          source,
          sourceUrl: evt.eventUrl || `https://www.meetup.com/${group.urlname}/`,
          location,
          time,
          imageUrl,
          categories: [groupName],
          cost,
          access: 'RSVP Required',
        })
        if (!normalized) continue
        normalized._isRecurring = isRecurring

        allEvents.push(normalized)
      }
    }
  }

  log.info(source, 'scrape complete', { events: allEvents.length })
  return allEvents
}
