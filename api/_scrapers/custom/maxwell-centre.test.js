// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { parseMaxwell, parseDetailPage } from './maxwell-centre.js'

describe('parseMaxwell', () => {
  const listingHtml = `
    <ul>
      <li class="campl-highlight-event-item clearfix">
        <div class="campl-highlight-date-container">
          <div><span class="campl-highlight-date core">
            <span class="campl-highlight-day core">
              <span property="dc:date" datatype="xsd:dateTime" content="2026-02-25T10:00:00+00:00" class="date-display-single">25</span>
            </span>
            <span property="dc:date" datatype="xsd:dateTime" content="2026-02-25T10:00:00+00:00" class="date-display-single">Feb</span>
          </span></div>
        </div>
        <div class="campl-highlight-event-details clearfix">
          <span class="campl-highlight-event-link"><a href="/events/research-context">Putting your Research into Context</a></span>
        </div>
      </li>
      <li class="campl-highlight-event-item clearfix">
        <div class="campl-highlight-date-container">
          <div><span class="campl-highlight-date core">
            <span class="campl-highlight-day core">
              <span property="dc:date" datatype="xsd:dateTime" content="2026-03-04T15:00:00+00:00" class="date-display-single">04</span>
            </span>
            <span property="dc:date" datatype="xsd:dateTime" content="2026-03-04T15:00:00+00:00" class="date-display-single">Mar</span>
          </span></div>
        </div>
        <div class="campl-highlight-event-details clearfix">
          <span class="campl-highlight-event-link"><a href="/events/good-board-debate">Good Board | Bad Board Debate 2026</a></span>
        </div>
      </li>
    </ul>
  `

  it('extracts all listings', () => {
    const $ = cheerio.load(listingHtml)
    const events = parseMaxwell($)
    expect(events).toHaveLength(2)
  })

  it('parses date from ISO content attribute', () => {
    const $ = cheerio.load(listingHtml)
    const events = parseMaxwell($)
    expect(events[0].date).toBe('2026-02-25')
    expect(events[1].date).toBe('2026-03-04')
  })

  it('extracts start time from ISO date', () => {
    const $ = cheerio.load(listingHtml)
    const events = parseMaxwell($)
    expect(events[0].startTime).toBe('10:00')
    expect(events[1].startTime).toBe('15:00')
  })

  it('builds full sourceUrl from relative href', () => {
    const $ = cheerio.load(listingHtml)
    const events = parseMaxwell($)
    expect(events[0].sourceUrl).toBe('https://www.maxwell.cam.ac.uk/events/research-context')
  })

  it('returns empty array for page with no events', () => {
    const $ = cheerio.load('<div>Nothing here</div>')
    expect(parseMaxwell($)).toHaveLength(0)
  })
})

describe('parseDetailPage', () => {
  it('extracts time range from ISO dates', () => {
    const $ = cheerio.load(`
      <span content="2026-02-25T10:00:00+00:00"></span>
      <span content="2026-02-25T13:00:00+00:00"></span>
      <div class="field-name-body"><p>A workshop about research context.</p></div>
    `)
    const detail = parseDetailPage($, '10:00')
    expect(detail.time).toBe('10:00 - 13:00')
  })

  it('extracts description from body field', () => {
    const $ = cheerio.load(`
      <span content="2026-02-25T10:00:00+00:00"></span>
      <div class="field-name-body">
        <p>Are you a Cambridge postdoctoral or early-career researcher?</p>
        <p>This workshop will equip you with tools to communicate your research.</p>
      </div>
    `)
    const detail = parseDetailPage($, '10:00')
    expect(detail.description).toContain('postdoctoral')
    expect(detail.description).toContain('workshop')
  })

  it('extracts location from field', () => {
    const $ = cheerio.load(`
      <span content="2026-03-04T15:00:00+00:00"></span>
      <div class="field">
        <div class="field-label">Event location:&nbsp;</div>
        <div class="field-items">Maxwell Centre, JJ Thomson Avenue</div>
      </div>
      <div class="field-name-body"><p>An event about boards.</p></div>
    `)
    const detail = parseDetailPage($, '15:00')
    expect(detail.location).toBe('Maxwell Centre, JJ Thomson Avenue')
  })

  it('defaults location to Maxwell Centre when not found', () => {
    const $ = cheerio.load(`
      <span content="2026-03-04T15:00:00+00:00"></span>
      <div class="field-name-body"><p>An event with no location field.</p></div>
    `)
    const detail = parseDetailPage($, '15:00')
    expect(detail.location).toBe('Maxwell Centre')
  })

  it('falls back to startTime when no end time available', () => {
    const $ = cheerio.load(`
      <div class="field-name-body"><p>An event with minimal data.</p></div>
    `)
    const detail = parseDetailPage($, '14:00')
    expect(detail.time).toBe('14:00')
  })

})
