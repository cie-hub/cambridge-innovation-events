/**
 * Test template for a new scraper.
 *
 * How to create a fixture:
 * 1. Run: curl -s "https://example.com/events" > api/_scrapers/custom/_fixtures/your-source.html
 * 2. For JSON API sources, save the response: curl -s "https://api.example.com/events" > ...your-source.json
 * 3. Update the fixture path below
 *
 * What to test:
 * - Parse function returns events from fixture
 * - Required fields are present (title, date, sourceUrl)
 * - Image extraction works when images exist
 * - Known events from fixture match expected values
 */
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseSourceName } from './your-source-slug.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/your-source.html'), 'utf-8')

describe('parseSourceName', () => {
  it('extracts events from fixture HTML', () => {
    const $ = cheerio.load(html)
    const events = parseSourceName($)
    expect(events.length).toBeGreaterThan(0)
  })

  it('every event has required fields', () => {
    const $ = cheerio.load(html)
    const events = parseSourceName($)
    for (const event of events) {
      expect(event.title).toBeDefined()
      expect(event.title.length).toBeGreaterThan(0)
      expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(event.sourceUrl).toMatch(/^https?:\/\//)
    }
  })

  it('extracts expected number of events', () => {
    const $ = cheerio.load(html)
    const events = parseSourceName($)
    // TODO: Update with actual expected count from your fixture
    expect(events.length).toBe(0) // Replace 0 with actual count
  })

  it('first event matches expected values', () => {
    const $ = cheerio.load(html)
    const events = parseSourceName($)
    if (events.length > 0) {
      const first = events[0]
      // TODO: Update with actual expected values from your fixture
      expect(first.title).toBeDefined()
    }
  })
})
