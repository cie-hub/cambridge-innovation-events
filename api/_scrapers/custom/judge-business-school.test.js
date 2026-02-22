// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { filterAndParseApiEvents, parseDetailPage } from './judge-business-school.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiFixture = JSON.parse(
  readFileSync(resolve(__dirname, '_fixtures/jbs-api-response.json'), 'utf-8')
)

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

  it('maps audience containing "University of Cambridge" to University Only', () => {
    const events = filterAndParseApiEvents(apiFixture.post)
    const research = events.find(e => e.title.includes('Transparency'))
    expect(research.access).toBe('University Only')
  })

  it('sets access to null for audience "All"', () => {
    const events = filterAndParseApiEvents(apiFixture.post)
    const energy = events.find(e => e.title.includes('Energy Policy'))
    expect(energy.access).toBeNull()
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
})
