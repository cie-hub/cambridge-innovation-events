// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseListingHtml, parseDetailPage } from './crassh.js'

const SAMPLE_HTML = `
<div class="events-item" id="event-50260-1" data-date="1772582400">
  <div class="events-image">
    <img src="https://www.crassh.cam.ac.uk/wp-content/uploads/2025/01/geopolitics-540x540.png" alt="Milei talk" loading="lazy">
    <div class="events-type">Talk</div>
  </div>
  <div class="events-body">
    <p>4 Mar 2026</p>
    <h3><a href="https://www.crassh.cam.ac.uk/events/50260/">Milei&#8217;s Economics: Signpost or warning?</a></h3>
  </div>
</div>
<div class="events-item" id="event-48670-7" data-date="1772582400">
  <div class="events-image">
    <img src="https://www.crassh.cam.ac.uk/wp-content/uploads/2025/10/AI-540x540.png" alt="AI workshop" loading="lazy">
    <div class="events-type">Hybrid Event, Seminar</div>
  </div>
  <div class="events-body">
    <p>4 Mar 2026</p>
    <h3><a href="https://www.crassh.cam.ac.uk/events/48670/">AI for Sustainability workshop series</a></h3>
  </div>
</div>
<div class="events-item" id="event-48670-8" data-date="1772668800">
  <div class="events-image">
    <img src="https://www.crassh.cam.ac.uk/wp-content/uploads/2025/10/AI-540x540.png" alt="AI workshop" loading="lazy">
    <div class="events-type">Hybrid Event, Seminar</div>
  </div>
  <div class="events-body">
    <p>5 Mar 2026</p>
    <h3><a href="https://www.crassh.cam.ac.uk/events/48670/">AI for Sustainability workshop series</a></h3>
  </div>
</div>
`

describe('parseListingHtml', () => {
  it('extracts title, date, sourceUrl, imageUrl, eventType from each event', () => {
    const events = parseListingHtml(SAMPLE_HTML)
    expect(events[0]).toEqual({
      eventId: '50260',
      title: "Milei\u2019s Economics: Signpost or warning?",
      date: '2026-03-04',
      sourceUrl: 'https://www.crassh.cam.ac.uk/events/50260/',
      imageUrl: 'https://www.crassh.cam.ac.uk/wp-content/uploads/2025/01/geopolitics-540x540.png',
      eventType: 'Talk',
    })
  })

  it('deduplicates recurring events by eventId, keeping earliest date', () => {
    const events = parseListingHtml(SAMPLE_HTML)
    const aiEvents = events.filter(e => e.eventId === '48670')
    expect(aiEvents).toHaveLength(1)
    expect(aiEvents[0].date).toBe('2026-03-04')
  })

  it('converts unix timestamp to ISO date', () => {
    const events = parseListingHtml(SAMPLE_HTML)
    expect(events[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns empty array for empty HTML', () => {
    expect(parseListingHtml('')).toEqual([])
  })
})

import * as cheerio from 'cheerio'

describe('parseDetailPage', () => {
  it('extracts time, location, and description from detail page', () => {
    const $ = cheerio.load(`
      <article class="page-article pagebuilder">
        <table class="table table--dates">
          <tbody>
            <tr>
              <td class="date">4 Mar 2026</td>
              <td class="time">17:30 - 19:00</td>
              <td class="location" colspan="2">Trinity Hall Lecture Theatre, Trinity Lane, CB2 1TJ</td>
            </tr>
          </tbody>
        </table>
        <section class="tabs">
          <div class="tabs-content tabs-content--current contentArea" id="tab-1">
            <h2 class="tabs-subheading">Description</h2>
            <p>This talk will explore the dramatic economic experiment unfolding in Argentina.</p>
            <h3>About the speaker</h3>
            <p>Dr Irene Mia is Senior Fellow at the International Institute for Strategic Studies.</p>
          </div>
        </section>
      </article>
    `)
    const detail = parseDetailPage($)
    expect(detail.time).toBe('17:30 - 19:00')
    expect(detail.location).toBe('Trinity Hall Lecture Theatre, Trinity Lane, CB2 1TJ')
    expect(detail.description).toContain('dramatic economic experiment')
    expect(detail.description).toContain('Dr Irene Mia')
  })

  it('returns null for missing time and location', () => {
    const $ = cheerio.load(`
      <article class="page-article pagebuilder">
        <table class="table table--dates">
          <tbody><tr><td class="date">4 Mar 2026</td></tr></tbody>
        </table>
        <section class="tabs">
          <div class="tabs-content tabs-content--current contentArea" id="tab-1">
            <p>Short event description text here for the test.</p>
          </div>
        </section>
      </article>
    `)
    const detail = parseDetailPage($)
    expect(detail.time).toBeNull()
    expect(detail.location).toBeNull()
    expect(detail.description).toContain('Short event description')
  })

  it('truncates description to 800 chars', () => {
    const longText = 'a'.repeat(1000)
    const $ = cheerio.load(`
      <article class="page-article pagebuilder">
        <table class="table table--dates"><tbody><tr><td class="date">4 Mar 2026</td></tr></tbody></table>
        <section class="tabs">
          <div class="tabs-content tabs-content--current contentArea" id="tab-1">
            <p>${longText}</p>
          </div>
        </section>
      </article>
    `)
    const detail = parseDetailPage($)
    expect(detail.description.length).toBe(800)
  })
})
