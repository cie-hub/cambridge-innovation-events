// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseStJohns, parseDetailPage } from './st-johns.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/st-johns.html'), 'utf-8')

describe('parseStJohns', () => {
  it('extracts events from fixture HTML', () => {
    const $ = cheerio.load(html)
    const events = parseStJohns($)
    expect(events.length).toBeGreaterThan(0)
    const first = events[0]
    expect(first.title).toBeDefined()
    expect(first.title.length).toBeGreaterThan(0)
    expect(first.date).toBeDefined()
    expect(first.sourceUrl).toBeDefined()
  })

  it('extracts the correct number of events', () => {
    const $ = cheerio.load(html)
    const events = parseStJohns($)
    expect(events.length).toBe(15)
  })

  it('parses the first event title and URL correctly', () => {
    const $ = cheerio.load(html)
    const events = parseStJohns($)
    const first = events[0]
    expect(first.title).toBe('North East Cambridge Networking Breakfast')
    expect(first.sourceUrl).toBe('https://stjohns.co.uk/event/north-east-cambridge-networking-breakfast-6/')
    expect(first.date).toBe('2026-02-03')
  })

  it('extracts image URLs', () => {
    const $ = cheerio.load(html)
    const events = parseStJohns($)
    const withImage = events.filter(e => e.imageUrl)
    expect(withImage.length).toBeGreaterThan(0)
  })
})
