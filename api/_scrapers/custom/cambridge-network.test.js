// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseCambridgeNetwork } from './cambridge-network.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/cambridge-network.html'), 'utf-8')

describe('parseCambridgeNetwork', () => {
  it('extracts events from fixture HTML', () => {
    const $ = cheerio.load(html)
    const events = parseCambridgeNetwork($)
    expect(events.length).toBeGreaterThan(0)
    const first = events[0]
    expect(first.title).toBeDefined()
    expect(first.title.length).toBeGreaterThan(0)
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(first.sourceUrl).toContain('cambridgenetwork.co.uk')
  })

  it('extracts the correct number of events from the listing', () => {
    const $ = cheerio.load(html)
    const events = parseCambridgeNetwork($)
    expect(events.length).toBe(10)
  })

  it('parses title and link correctly for the first event', () => {
    const $ = cheerio.load(html)
    const events = parseCambridgeNetwork($)
    const first = events[0]
    expect(first.title).toBe('Leading a Modern Workforce')
    expect(first.sourceUrl).toBe('https://www.cambridgenetwork.co.uk/events/leading-modern-workforce')
  })

  it('parses single dates correctly', () => {
    const $ = cheerio.load(html)
    const events = parseCambridgeNetwork($)
    const first = events[0]
    expect(first.date).toBe('2026-02-17')
    expect(first.endDate).toBeNull()
  })

  it('parses date ranges with start and end dates', () => {
    const $ = cheerio.load(html)
    const events = parseCambridgeNetwork($)
    const rangeEvent = events.find(e => e.title === 'Real Estate Analyst')
    expect(rangeEvent).toBeDefined()
    expect(rangeEvent.date).toBe('2026-02-23')
    expect(rangeEvent.endDate).toBe('2026-02-24')
  })

  it('extracts description text', () => {
    const $ = cheerio.load(html)
    const events = parseCambridgeNetwork($)
    const first = events[0]
    expect(first.description.length).toBeGreaterThan(0)
  })

  it('extracts categories from sector tags', () => {
    const $ = cheerio.load(html)
    const events = parseCambridgeNetwork($)
    const multiSector = events.find(e => e.title === 'Immersive AI Marketing 1-Day Course')
    expect(multiSector).toBeDefined()
    expect(multiSector.categories).toContain('Communications')
    expect(multiSector.categories).toContain('Education')
    expect(multiSector.categories).toContain('Information, Technology & Telecoms')
  })

  it('produces consistent output across runs', () => {
    const run1 = parseCambridgeNetwork(cheerio.load(html))
    const run2 = parseCambridgeNetwork(cheerio.load(html))
    expect(run1.length).toBe(run2.length)
    expect(run1[0].title).toBe(run2[0].title)
    expect(run1[0].date).toBe(run2[0].date)
  })
})
