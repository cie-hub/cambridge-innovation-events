// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { filterAndParseApiEvents, parseDetailPage, parseAcEventListings, assembleDescription } from './judge-business-school.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiFixture = JSON.parse(
  readFileSync(resolve(__dirname, '_fixtures/jbs-api-response.json'), 'utf-8')
)
const acFixture = readFileSync(resolve(__dirname, '_fixtures/ac-programme-events.html'), 'utf-8')

describe('filterAndParseApiEvents', () => {
  it('filters out admissions events', () => {
    const events = filterAndParseApiEvents(apiFixture.post)
    const titles = events.map(e => e.title)
    expect(titles).not.toContain('Jumpstart your MBA journey: financing your studies')
    expect(titles).not.toContain('Executive MBA in-person information session')
  })

  it('keeps non-admissions events', () => {
    const events = filterAndParseApiEvents(apiFixture.post)
    expect(events).toHaveLength(3)
    expect(events.map(e => e.title)).toContain('Female Founders Day: Build, Grow, Scale')
    expect(events.map(e => e.title)).toContain('Transparency in supply chains')
    expect(events.map(e => e.title)).toContain('Energy Policy seminar: zonal electricity prices')
  })

  it('converts unix start_date to ISO date string', () => {
    const events = filterAndParseApiEvents(apiFixture.post)
    const female = events.find(e => e.title.includes('Female Founders'))
    expect(female.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('passes through time from the API', () => {
    const events = filterAndParseApiEvents(apiFixture.post)
    const female = events.find(e => e.title.includes('Female Founders'))
    expect(female.time).toBe('09:00-18:00')
  })

  it('extracts category names from categoryField HTML', () => {
    const events = filterAndParseApiEvents(apiFixture.post)
    const female = events.find(e => e.title.includes('Female Founders'))
    expect(female.categories).toContain('Accelerate Cambridge')
    expect(female.categories).toContain('Entrepreneurship events')
  })

  it('sets access to Public for all events', () => {
    const events = filterAndParseApiEvents(apiFixture.post)
    for (const ev of events) {
      expect(ev.access).toBe('Public')
    }
  })

  it('passes through the API excerpt', () => {
    const events = filterAndParseApiEvents(apiFixture.post)
    const female = events.find(e => e.title.includes('Female Founders'))
    expect(female.excerpt).toBe('The 5th Female Founders Day celebrates the power of female-led mentoring.')
  })

  it('sets isAccelerateCambridge: true for events with category 3285', () => {
    const events = filterAndParseApiEvents(apiFixture.post)
    const female = events.find(e => e.title.includes('Female Founders'))
    expect(female.isAccelerateCambridge).toBe(true)
  })

  it('sets isAccelerateCambridge: false for non-AC events', () => {
    const events = filterAndParseApiEvents(apiFixture.post)
    const energy = events.find(e => e.title.includes('Energy Policy'))
    expect(energy.isAccelerateCambridge).toBe(false)
  })

  it('keeps permalink as sourceUrl for AC events', () => {
    const events = filterAndParseApiEvents(apiFixture.post)
    const female = events.find(e => e.title.includes('Female Founders'))
    expect(female.sourceUrl).toBe('https://www.jbs.cam.ac.uk/events/female-founders-day-build-grow-scale/')
  })
})

describe('parseDetailPage', () => {
  it('extracts venue from p.event-address.main.bold', () => {
    const $ = cheerio.load(`
      <div class="cjbs-event">
        <div class="cjbs-event-top-container">
          <div class="cjbs-event-content">
            <div class="location content-item">
              <p class="main bold event-address">CRASSH-Meeting Room</p>
              <p class="event-address">Alison Richard Building</p>
            </div>
          </div>
        </div>
        <div class="cjbs-event-bottom-container"></div>
        <div class="wp-block-group">
          <p>Speaker info and description text here that is long enough.</p>
        </div>
      </div>
      <meta property="og:image" content="https://www.jbs.cam.ac.uk/wp-content/uploads/2025/event-image.jpg" />
    `)
    const detail = parseDetailPage($)
    expect(detail.location).toBe('CRASSH-Meeting Room')
  })

  it('extracts og:image and skips default logo', () => {
    const $ = cheerio.load(`
      <div class="cjbs-event"></div>
      <meta property="og:image" content="https://www.jbs.cam.ac.uk/wp-content/uploads/2025/event-image.jpg" />
    `)
    const detail = parseDetailPage($)
    expect(detail.imageUrl).toBe('https://www.jbs.cam.ac.uk/wp-content/uploads/2025/event-image.jpg')
  })

  it('returns null imageUrl for the default JBS logo', () => {
    const $ = cheerio.load(`
      <div class="cjbs-event"></div>
      <meta property="og:image" content="https://www.jbs.cam.ac.uk/wp-content/uploads/2024/11/cjbs-logo-with-shield-on-yellow-1200x675-1.jpg" />
    `)
    const detail = parseDetailPage($)
    expect(detail.imageUrl).toBeNull()
  })

  it('extracts description from .cjbs-event > div.wp-block-group paragraphs', () => {
    const $ = cheerio.load(`
      <div class="cjbs-event">
        <div class="cjbs-event-top-container"></div>
        <div class="cjbs-event-bottom-container"></div>
        <div class="wp-block-group">
          <h3>Speaker: Dr Jane Smith, University of Cambridge</h3>
          <p>This workshop explores advanced methods in supply chain transparency.</p>
        </div>
        <div class="wp-block-group">
          <p>No registration required.</p>
        </div>
      </div>
    `)
    const detail = parseDetailPage($)
    expect(detail.description).toContain('Speaker: Dr Jane Smith')
    expect(detail.description).toContain('supply chain transparency')
  })

  it('includes li text from wp-block-group', () => {
    const $ = cheerio.load(`
      <div class="cjbs-event">
        <div class="cjbs-event-top-container"></div>
        <div class="wp-block-group">
          <p>Introduction paragraph text for context.</p>
          <ul>
            <li>Session one: deep dive into product-market fit</li>
            <li>Session two: investor readiness frameworks</li>
          </ul>
        </div>
      </div>
    `)
    const detail = parseDetailPage($)
    expect(detail.description).toContain('product-market fit')
    expect(detail.description).toContain('investor readiness frameworks')
  })

  it('description is not pre-truncated beyond 800 chars', () => {
    const longText = 'a'.repeat(900)
    const $ = cheerio.load(`
      <div class="cjbs-event">
        <div class="wp-block-group">
          <p>${longText}</p>
        </div>
      </div>
    `)
    const detail = parseDetailPage($)
    expect(detail.description.length).toBe(900)
  })
})

describe('parseAcEventListings', () => {
  it('builds a lowercase title→excerpt map from .b06Box cards', () => {
    const $ = cheerio.load(acFixture)
    const map = parseAcEventListings($)
    expect(map.size).toBe(2)
    expect(map.get('female founders day: build, grow, scale')).toBe(
      'A flagship Accelerate Cambridge event celebrating female-led ventures with mentoring sessions and investor pitches.'
    )
  })

  it('lowercases keys for case-insensitive lookup', () => {
    const $ = cheerio.load(acFixture)
    const map = parseAcEventListings($)
    expect(map.has('pitch and judge #5 – spring 2026')).toBe(true)
  })

  it('returns empty map when page has no b06Box cards', () => {
    const $ = cheerio.load('<div>Nothing here</div>')
    expect(parseAcEventListings($).size).toBe(0)
  })
})

describe('assembleDescription', () => {
  it('returns detailDescription for non-AC events', () => {
    expect(assembleDescription('Detail text here.', 'API excerpt', false, '', new Map())).toBe('Detail text here.')
  })

  it('falls back to excerpt for non-AC events when detail is empty', () => {
    expect(assembleDescription('', 'API excerpt fallback', false, '', new Map())).toBe('API excerpt fallback')
  })

  it('prepends AC excerpt to detail description for AC events', () => {
    const map = new Map([['my event', 'AC programme excerpt.']])
    const result = assembleDescription('Full detail text here.', 'API excerpt', true, 'My Event', map)
    expect(result).toBe('AC programme excerpt. Full detail text here.')
  })

  it('uses AC excerpt alone when detail is empty for AC events', () => {
    const map = new Map([['my event', 'AC excerpt only.']])
    expect(assembleDescription('', 'API excerpt', true, 'My Event', map)).toBe('AC excerpt only.')
  })

  it('falls back to API excerpt for AC events when AC map has no match', () => {
    expect(assembleDescription('', 'API excerpt fallback', true, 'Unknown Event', new Map())).toBe('API excerpt fallback')
  })

  it('truncates the combined result to 800 chars', () => {
    const map = new Map([['ev', 'x'.repeat(200)]])
    const result = assembleDescription('y'.repeat(700), '', true, 'ev', map)
    expect(result.length).toBe(800)
  })
})
