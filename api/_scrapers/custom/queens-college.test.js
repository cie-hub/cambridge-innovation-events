// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseQueensCollege } from './queens-college.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/queens-college.html'), 'utf-8')

describe('parseQueensCollege', () => {
  it('returns an array from fixture HTML', () => {
    const $ = cheerio.load(html)
    const events = parseQueensCollege($)
    expect(Array.isArray(events)).toBe(true)
  })

  it('handles informational page without structured events gracefully', () => {
    const $ = cheerio.load(html)
    const events = parseQueensCollege($)
    events.forEach(event => {
      expect(event.source).toBe('queens-college')
      expect(event.hash).toHaveLength(16)
    })
  })

  it('returns events with required fields if any are found', () => {
    const $ = cheerio.load(html)
    const events = parseQueensCollege($)
    events.forEach(event => {
      expect(event.title.length).toBeGreaterThan(0)
      expect(event.date).toBeInstanceOf(Date)
      expect(event.sourceUrl).toBeDefined()
    })
  })
})
