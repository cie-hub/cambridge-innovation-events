import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'
import { parseDayMonthYear, parseDayMonthInfer } from '../_shared/dates.js'

const BASE_URL = 'https://talks.cam.ac.uk'
const SOURCE = 'talks-cam'

function parseDateHeader(text) {
  const withYear = parseDayMonthYear(text)
  if (withYear) return withYear
  return parseDayMonthInfer(text)
}

function parseIsoDt(abbr) {
  const raw = abbr || ''
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/)
  if (!m) return null
  return {
    date: `${m[1]}-${m[2]}-${m[3]}`,
    hour: `${m[4]}:${m[5]}`,
  }
}

/**
 * Fetches description, location, and time from an individual talk detail page.
 * Each talk page has a div.vevent with structured content.
 */
async function fetchTalkDetails(url) {
  const $ = await fetchPage(url)
  const vevent = $('div.vevent')
  if (!vevent.length) return { description: '', location: '', time: null, imageUrl: null }

  // Description from <p> tags (skip boilerplate) and <pre><code> blocks
  const parts = []
  vevent.find('p').each((_i, el) => {
    const p = $(el)
    if (p.hasClass('actions') || p.hasClass('urgent')) return
    const text = p.text().trim()
    if (!text) return
    if (text.startsWith('If you have a question about this talk')) return
    if (text.startsWith('This talk is part of the')) return
    parts.push(text)
  })
  vevent.find('pre code').each((_i, el) => {
    const text = $(el).text().trim()
    if (text) parts.push(text)
  })
  const description = parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 500)

  // Location from the venue link (li with House icon)
  let location = ''
  vevent.find('ul.details li').each((_i, el) => {
    const li = $(el)
    if (li.find('img[alt="House"]').length) {
      location = li.find('a').first().text().trim()
    }
  })

  // Time from dtstart/dtend abbr elements
  const dtstart = vevent.find('abbr.dtstart').attr('title')
  const dtend = vevent.find('abbr.dtend').attr('title')
  const startParsed = parseIsoDt(dtstart)
  const endParsed = parseIsoDt(dtend)
  let time = null
  if (startParsed) {
    time = startParsed.hour
    if (endParsed) time = `${startParsed.hour} - ${endParsed.hour}`
  }

  // Series logo from detail page (full-size, no ;32x32 suffix)
  const imgSrc = vevent.find('img.logo').first().attr('src')
  const imageUrl = imgSrc ? imgSrc.replace(/;.*$/, '') : null

  return { description, location, time, imageUrl }
}

/**
 * Parse homepage featured talks — extracts titles, dates, series logos, and URLs.
 * Talks are grouped under h2 date headers with div.talk children.
 */
function parseHomepage($) {
  const events = []
  let currentDate = null

  $('h2, div.talk').each((_i, el) => {
    const tag = el.tagName?.toLowerCase()
    if (tag === 'h2') {
      currentDate = parseDateHeader($(el).text())
      return
    }

    if (!currentDate) return

    const talk = $(el)
    const titleEl = talk.find('h3 a, h2 a').first()
    const title = titleEl.text().trim()
    const href = titleEl.attr('href')
    if (!title || !href) return

    const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`

    // Extract series logo image, strip size suffix (;32x32) for full-size
    const imgSrc = talk.find('img.logo').first().attr('src')
    const imageUrl = imgSrc ? imgSrc.replace(/;.*$/, '') : null

    const speaker = talk.find('p').first().text().trim()

    events.push({ title, sourceUrl, date: currentDate, speaker, imageUrl })
  })

  return events
}

/**
 * Parse a series page (e.g. /show/index/5462) which uses vevent microformat.
 */
function parseSeriesPage($) {
  const events = []

  $('div.vevent').each((_i, el) => {
    const vevent = $(el)
    const titleEl = vevent.find('h2.summary a, h3.summary a, .summary a').first()
    const title = titleEl.text().trim()
    const href = titleEl.attr('href')
    if (!title) return

    const sourceUrl = href
      ? (href.startsWith('http') ? href : `${BASE_URL}${href}`)
      : BASE_URL

    const dtstart = vevent.find('abbr.dtstart').attr('title')
    const dtend = vevent.find('abbr.dtend').attr('title')
    const startParsed = parseIsoDt(dtstart)
    if (!startParsed) return

    let time = startParsed.hour
    const endParsed = parseIsoDt(dtend)
    if (endParsed) time = `${startParsed.hour} - ${endParsed.hour}`

    const location = vevent.find('p.location a, .location a').first().text().trim()
    const speaker = vevent.find('p.details').first().text().trim()
    const series = vevent.find('p.series a').first().text().trim()

    // Extract series logo image
    const imgSrc = vevent.find('img.logo').first().attr('src')
    const imageUrl = imgSrc ? imgSrc.replace(/;.*$/, '') : null

    const categories = []
    if (series) categories.push(series)

    events.push({ title, sourceUrl, date: startParsed.date, speaker, imageUrl, location, time, categories })
  })

  return events
}

export async function scrapeTalksCam() {
  log.info(SOURCE, 'starting scrape')
  const [home$, series$] = await Promise.all([
    fetchPage(BASE_URL),
    fetchPage(`${BASE_URL}/show/index/5462`),
  ])

  const homeRaw = parseHomepage(home$)
  const seriesRaw = parseSeriesPage(series$)

  // Deduplicate by title + date
  const seen = new Set()
  const rawAll = []
  for (const evt of [...seriesRaw, ...homeRaw]) {
    const key = `${evt.title}|${evt.date}`
    if (seen.has(key)) continue
    seen.add(key)
    rawAll.push(evt)
  }

  log.info(SOURCE, 'fetching details', { unique: rawAll.length })

  // Fetch details (description, location, time) from individual talk pages
  const results = []
  for (const evt of rawAll) {
    let description = evt.speaker || ''
    let location = evt.location || ''
    let time = evt.time || null

    let imageUrl = evt.imageUrl || null

    try {
      const details = await fetchTalkDetails(evt.sourceUrl)
      if (details.description) description = details.description
      if (details.location) location = details.location
      if (details.time) time = details.time
      if (!imageUrl && details.imageUrl) imageUrl = details.imageUrl
    } catch (err) { log.warn(SOURCE, 'detail fetch failed', { url: evt.sourceUrl, error: err.message }) }

    results.push(
      normalizeEvent({
        title: evt.title,
        description,
        date: evt.date,
        source: SOURCE,
        sourceUrl: evt.sourceUrl,
        location,
        time,
        imageUrl,
        categories: evt.categories || [],
      })
    )
  }

  log.info(SOURCE, 'scrape complete', { events: results.length })
  return results
}
