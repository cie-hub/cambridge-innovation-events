// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseThinkLabListing, mergeApiWithListing } from './cambridge-thinklab.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/cambridge-thinklab.html'), 'utf-8')
const apiJson = JSON.parse(readFileSync(resolve(__dirname, '_fixtures/cambridge-thinklab-api.json'), 'utf-8'))

describe('parseThinkLabListing', () => {
  it('extracts events from fixture HTML', () => {
    const $ = cheerio.load(html)
    const events = parseThinkLabListing($)
    expect(events.length).toBeGreaterThan(0)
    const first = events[0]
    expect(first.slug).toBeDefined()
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(first.time).toBeDefined()
  })

  it('parses date and time from card details', () => {
    const $ = cheerio.load(html)
    const events = parseThinkLabListing($)
    const first = events[0]
    expect(first.date).toBe('2026-02-23')
    expect(first.time).toBe('2:00 pm')
  })

  it('extracts location when present in card details', () => {
    const $ = cheerio.load(html)
    const events = parseThinkLabListing($)
    const withLocation = events.find(e => e.location)
    if (withLocation) {
      expect(withLocation.location.length).toBeGreaterThan(0)
    }
  })
})

describe('mergeApiWithListing', () => {
  it('merges API data with listing dates', () => {
    const $ = cheerio.load(html)
    const listing = parseThinkLabListing($)
    const merged = mergeApiWithListing(apiJson, listing)
    expect(merged.length).toBeGreaterThan(0)
    const first = merged[0]
    expect(first.title).toBeDefined()
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(first.sourceUrl).toContain('thinklab.strategic-partnerships.admin.cam.ac.uk')
  })

  it('includes description from API content', () => {
    const $ = cheerio.load(html)
    const listing = parseThinkLabListing($)
    const merged = mergeApiWithListing(apiJson, listing)
    const first = merged[0]
    expect(first.description).toBeDefined()
    expect(first.description.length).toBeGreaterThan(10)
  })

  it('produces consistent output across runs', () => {
    const listing1 = parseThinkLabListing(cheerio.load(html))
    const listing2 = parseThinkLabListing(cheerio.load(html))
    const run1 = mergeApiWithListing(apiJson, listing1)
    const run2 = mergeApiWithListing(apiJson, listing2)
    expect(run1.length).toBe(run2.length)
    if (run1.length > 0) {
      expect(run1[0].title).toBe(run2[0].title)
      expect(run1[0].date).toBe(run2[0].date)
    }
  })
})
