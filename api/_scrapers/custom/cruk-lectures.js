import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { parseDayMonthInfer } from '../_shared/dates.js'

const EVENTS_URL = 'https://crukcambridgecentre.org.uk/content/lectures-cancer-biology-and-medicine'
const SOURCE = 'cruk-lectures'
const LOCATION = 'School of Clinical Medicine, Theo Chalmers Lecture Theatre'

function extractTime(text) {
  const match = text.match(/(\d{1,2}[.:]\d{2}\s*(?:am|pm))/i)
  return match ? match[1] : null
}

export function parseCrukLectures($) {
  const events = []
  const divs = $('div[style*="padding-left"]').toArray()

  let i = 0
  while (i < divs.length) {
    const text = $(divs[i]).text().trim()
    const dateMatch = text.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+\w+/i)

    if (dateMatch) {
      const date = parseDayMonthInfer(dateMatch[0])
      const time = extractTime(text)
      if (!date) { i++; continue }

      let speaker = ''
      let lectureTitle = ''

      // Next divs should be speaker and title
      if (i + 1 < divs.length) {
        speaker = $(divs[i + 1]).text().trim()
      }
      if (i + 2 < divs.length) {
        const titleEl = $(divs[i + 2])
        lectureTitle = titleEl.find('em, strong').text().trim() || titleEl.text().trim()
      }

      if (lectureTitle) {
        events.push(
          normalizeEvent({
            title: lectureTitle,
            description: speaker ? `Speaker: ${speaker}` : '',
            date,
            source: SOURCE,
            sourceUrl: EVENTS_URL,
            location: LOCATION,
            time,
            categories: ['Healthcare', 'Research'],
          })
        )
        i += 3
        continue
      }
    }
    i++
  }

  return events
}

export async function scrapeCrukLectures() {
  log.info(SOURCE, 'starting scrape')
  const $ = await fetchPage(EVENTS_URL)
  const events = parseCrukLectures($)
  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
