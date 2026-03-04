// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseListingHtml } from './crassh.js'

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
