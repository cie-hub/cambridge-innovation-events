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

const DATE_RE = /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+\w+/i

export function parseCrukLectures($) {
  const events = []
  const divs = $('div[style*="padding-left"]').toArray()

  const dateIndices = divs.reduce((acc, el, i) => {
    if (DATE_RE.test($(el).text().trim().slice(0, 30))) acc.push(i)
    return acc
  }, [])

  for (let d = 0; d < dateIndices.length; d++) {
    const dateIdx = dateIndices[d]
    const nextDateIdx = dateIndices[d + 1] ?? divs.length

    const dateText = $(divs[dateIdx]).text().trim()
    const dateMatch = dateText.match(DATE_RE)
    const date = parseDayMonthInfer(dateMatch[0])
    if (!date) continue

    const time = extractTime(dateText)
    const block = divs.slice(dateIdx + 1, nextDateIdx)

    const titleEl = block.find(el => $(el).find('em, strong').length > 0)

    let lectureTitle = ''
    let speaker = ''

    if (titleEl) {
      lectureTitle = $(titleEl).find('em, strong').text().trim()
      const otherTexts = block
        .filter(el => el !== titleEl)
        .map(el => $(el).text().trim())
        .filter(Boolean)
      speaker = otherTexts[0] || ''
    } else {
      for (const el of block) {
        const fullText = $(el).text().trim()
        if (!lectureTitle && fullText.length > 20) {
          lectureTitle = fullText
        } else if (!speaker && fullText.length > 0) {
          speaker = fullText
        }
      }
    }

    if (!lectureTitle) continue

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
        cost: 'Free',
      })
    )
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
