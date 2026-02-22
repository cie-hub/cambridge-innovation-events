// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseBradfieldCentre, parseDetailPage } from './bradfield-centre.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/bradfield-centre.html'), 'utf-8')
const detailHtml = readFileSync(resolve(__dirname, '_fixtures/bradfield-centre-detail.html'), 'utf-8')

describe('parseBradfieldCentre', () => {
  it('extracts listings from fixture HTML', () => {
    const $ = cheerio.load(html)
    const listings = parseBradfieldCentre($)
    expect(listings.length).toBeGreaterThan(0)
    const first = listings[0]
    expect(first.title).toBeDefined()
    expect(first.title.length).toBeGreaterThan(0)
    expect(typeof first.date).toBe('string')
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('extracts the correct number of event highlights', () => {
    const $ = cheerio.load(html)
    const listings = parseBradfieldCentre($)
    expect(listings.length).toBe(2)
  })

  it('parses the first event correctly', () => {
    const $ = cheerio.load(html)
    const listings = parseBradfieldCentre($)
    const first = listings[0]
    expect(first.title).toContain('Byte Size')
    expect(first.sourceUrl).toContain('bradfieldcentre.com')
    expect(first.date).toMatch(/^2026-02-2[34]$/)
  })

  it('produces consistent listing structure', () => {
    const $ = cheerio.load(html)
    const listings = parseBradfieldCentre($)
    const first = listings[0]
    expect(first).toHaveProperty('title')
    expect(first).toHaveProperty('date')
    expect(first).toHaveProperty('sourceUrl')
    expect(first).toHaveProperty('description')
    expect(first).toHaveProperty('categories')
    expect(first).toHaveProperty('time')
    expect(first).toHaveProperty('imageUrl')
  })
})

describe('parseDetailPage (Bradfield)', () => {
  it('extracts cost from detail page body text', () => {
    const $ = cheerio.load(detailHtml)
    const result = parseDetailPage($)
    expect(result.cost).toBe('Free')
  })

  it('extracts access from detail page body text', () => {
    const $ = cheerio.load(detailHtml)
    const result = parseDetailPage($)
    expect(result.access).toBe('Registration Required')
  })

  it('extracts description from detail page', () => {
    const $ = cheerio.load(detailHtml)
    const result = parseDetailPage($)
    expect(result.description).toContain('AI agents')
  })
})
