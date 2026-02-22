// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseWolfsonHtml, enrichWithApi, parseDetailAccess } from './wolfson-college.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/wolfson-college.html'), 'utf-8')
const apiData = JSON.parse(
  readFileSync(resolve(__dirname, '_fixtures/wolfson-college-api.json'), 'utf-8')
)

describe('parseWolfsonHtml', () => {
  it('extracts events from fixture HTML', () => {
    const $ = cheerio.load(html)
    const events = parseWolfsonHtml($)
    expect(events.length).toBeGreaterThan(0)
  })

  it('extracts expected number of events', () => {
    const $ = cheerio.load(html)
    const events = parseWolfsonHtml($)
    expect(events.length).toBe(5)
  })

  it('every event has required fields', () => {
    const $ = cheerio.load(html)
    const events = parseWolfsonHtml($)
    for (const event of events) {
      expect(event.title).toBeDefined()
      expect(event.title.length).toBeGreaterThan(0)
      expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(event.sourceUrl).toMatch(/^https:\/\/www\.wolfson\.cam\.ac\.uk\//)
    }
  })

  it('parses first event correctly', () => {
    const $ = cheerio.load(html)
    const events = parseWolfsonHtml($)
    const first = events[0]
    expect(first.title).toBe('WES Workshop: Pitching Examples')
    expect(first.date).toBe('2026-02-18')
    expect(first.time).toBe('17:30')
    expect(first.sourceUrl).toBe('https://www.wolfson.cam.ac.uk/about/events/wes-workshop-pitching-examples')
  })

  it('extracts time in HH:MM format', () => {
    const $ = cheerio.load(html)
    const events = parseWolfsonHtml($)
    const withTime = events.filter(e => e.time)
    expect(withTime.length).toBeGreaterThan(0)
    for (const event of withTime) {
      expect(event.time).toMatch(/^\d{2}:\d{2}$/)
    }
  })

  it('extracts image URLs as absolute', () => {
    const $ = cheerio.load(html)
    const events = parseWolfsonHtml($)
    const withImage = events.filter(e => e.imageUrl)
    expect(withImage.length).toBeGreaterThan(0)
    for (const event of withImage) {
      expect(event.imageUrl).toMatch(/^https:\/\//)
    }
  })

  it('extracts descriptions', () => {
    const $ = cheerio.load(html)
    const events = parseWolfsonHtml($)
    const withDesc = events.filter(e => e.description)
    expect(withDesc.length).toBeGreaterThan(0)
  })
})

describe('enrichWithApi', () => {
  it('adds venue from API match', () => {
    const $ = cheerio.load(html)
    const htmlEvents = parseWolfsonHtml($)
    const enriched = enrichWithApi(htmlEvents, apiData)
    const withVenue = enriched.filter(e => e.location && e.location !== 'Wolfson College, Cambridge')
    expect(withVenue.length).toBeGreaterThan(0)
  })

  it('preserves event count after enrichment', () => {
    const $ = cheerio.load(html)
    const htmlEvents = parseWolfsonHtml($)
    const enriched = enrichWithApi(htmlEvents, apiData)
    expect(enriched.length).toBe(htmlEvents.length)
  })

  it('falls back to default location when no API match', () => {
    const $ = cheerio.load(html)
    const htmlEvents = parseWolfsonHtml($)
    const enriched = enrichWithApi(htmlEvents, [])
    for (const event of enriched) {
      expect(event.location).toBe('Wolfson College, Cambridge')
    }
  })

  it('extracts cost and access from enriched descriptions', () => {
    const fakeApi = [{
      title: 'Free Event',
      date: '2026-03-01T10:00:00',
      body: 'This event is free to attend and open to all.',
      image_url: '',
      speaker: '',
      venue: '',
    }]
    const htmlEvents = [{
      title: 'Free Event',
      date: '2026-03-01',
      time: '10:00',
      description: '',
      sourceUrl: 'https://www.wolfson.cam.ac.uk/about/events/free',
      imageUrl: null,
    }]
    const enriched = enrichWithApi(htmlEvents, fakeApi)
    expect(enriched[0].cost).toBe('Free')
    expect(enriched[0].access).toBe('Public')
  })

  it('decodes HTML entities in API fields', () => {
    const fakeApi = [{
      title: 'Test &amp; Event &#039;2026&#039;',
      date: '2026-03-01T10:00:00',
      body: 'Description with &amp; entity',
      image_url: 'https://example.com/img.jpg',
      speaker: 'Dr Smith &amp; Dr Jones',
      venue: 'Gatsby Room (Chancellor&#039;s Centre)',
    }]
    const htmlEvents = [{
      title: "Test & Event '2026'",
      date: '2026-03-01',
      time: '10:00',
      description: '',
      sourceUrl: 'https://www.wolfson.cam.ac.uk/about/events/test',
      imageUrl: null,
    }]
    const enriched = enrichWithApi(htmlEvents, fakeApi)
    expect(enriched[0].location).toContain("Chancellor's Centre")
    expect(enriched[0].location).toContain('Wolfson College, Cambridge')
  })
})

describe('parseDetailAccess', () => {
  it('extracts access from detail page with "open to all" text', () => {
    const html = '<div class="node__content"><p>This is a hybrid event which is open to all members of the University of Cambridge and is free to attend.</p><p>Please book your place using the form below.</p></div>'
    const $ = cheerio.load(html)
    const result = parseDetailAccess($)
    expect(result.access).toBe('University Only')
    expect(result.cost).toBe('Free')
  })

  it('returns null when no access signal in page', () => {
    const html = '<div class="node__content"><p>Join us for an exciting workshop about entrepreneurship.</p></div>'
    const $ = cheerio.load(html)
    const result = parseDetailAccess($)
    expect(result.access).toBeNull()
  })
})
