// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseBradfieldCentre } from './bradfield-centre.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/bradfield-centre.html'), 'utf-8')

describe('parseBradfieldCentre', () => {
  it('extracts events from fixture HTML', () => {
    const $ = cheerio.load(html)
    const events = parseBradfieldCentre($)
    expect(events.length).toBeGreaterThan(0)
    const first = events[0]
    expect(first.title).toBeDefined()
    expect(first.title.length).toBeGreaterThan(0)
    expect(first.date).toBeInstanceOf(Date)
    expect(first.source).toBe('bradfield-centre')
    expect(first.hash).toBeDefined()
  })

  it('extracts the correct number of event highlights', () => {
    const $ = cheerio.load(html)
    const events = parseBradfieldCentre($)
    expect(events.length).toBe(2)
  })

  it('parses the first event correctly', () => {
    const $ = cheerio.load(html)
    const events = parseBradfieldCentre($)
    const first = events[0]
    expect(first.title).toContain('Byte Size')
    expect(first.sourceUrl).toContain('bradfieldcentre.com')
    expect(first.date.toISOString().slice(0, 10)).toBe('2026-02-24')
  })

  it('produces deterministic hashes', () => {
    const $ = cheerio.load(html)
    const run1 = parseBradfieldCentre($)
    const run2 = parseBradfieldCentre(cheerio.load(html))
    expect(run1[0].hash).toBe(run2[0].hash)
    expect(run1[0].hash).toHaveLength(16)
  })
})
