// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseKingsElab, parseDetailPage } from './kings-elab.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/kings-elab.html'), 'utf-8')

describe('parseKingsElab', () => {
  it('extracts events from fixture HTML', () => {
    const $ = cheerio.load(html)
    const events = parseKingsElab($)
    expect(events.length).toBeGreaterThan(0)
    const first = events[0]
    expect(first.title).toBeDefined()
    expect(first.title.length).toBeGreaterThan(0)
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(first.sourceUrl).toContain('kingselab.org')
  })

  it('parses title and link correctly for the first event', () => {
    const $ = cheerio.load(html)
    const events = parseKingsElab($)
    const first = events[0]
    expect(first.title).toBe("Pitch@King's")
    expect(first.sourceUrl).toBe('https://www.kingselab.org/all-events/pitchkings-lent-2026')
  })

  it('produces consistent output across runs', () => {
    const run1 = parseKingsElab(cheerio.load(html))
    const run2 = parseKingsElab(cheerio.load(html))
    expect(run1.length).toBe(run2.length)
    expect(run1[0].title).toBe(run2[0].title)
    expect(run1[0].date).toBe(run2[0].date)
  })
})

describe('parseDetailPage', () => {
  const wrap = (body) => `<div class="sqs-block-content">${body}</div>`

  it('extracts Free cost from TICKETS line', () => {
    const $ = cheerio.load(wrap('<p>TICKETS: Free</p>'))
    expect(parseDetailPage($).cost).toBe('Free')
  })

  it('extracts priced cost with currency symbol', () => {
    const $ = cheerio.load(wrap('<p>TICKETS: £10 per person</p>'))
    expect(parseDetailPage($).cost).toBe('£10 per person')
  })

  it('ignores non-pricing text like Register here', () => {
    const $ = cheerio.load(wrap('<p>TICKETS: Register here.</p>'))
    expect(parseDetailPage($).cost).toBeNull()
  })

  it('ignores informational text about future registration', () => {
    const $ = cheerio.load(wrap('<p>TICKETS: Registration information will be available in February</p>'))
    expect(parseDetailPage($).cost).toBeNull()
  })
})
