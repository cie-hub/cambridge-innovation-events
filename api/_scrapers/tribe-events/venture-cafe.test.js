// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseVentureCafe } from './venture-cafe.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/venture-cafe.html'), 'utf-8')

describe('parseVentureCafe', () => {
  it('returns an array from fixture HTML', () => {
    const $ = cheerio.load(html)
    const events = parseVentureCafe($)
    expect(Array.isArray(events)).toBe(true)
  })

  it('handles unreachable site gracefully with empty result', () => {
    const $ = cheerio.load(html)
    const events = parseVentureCafe($)
    expect(events.length).toBe(0)
  })

  it('validates all returned events have required fields', () => {
    const $ = cheerio.load(html)
    const events = parseVentureCafe($)
    events.forEach(event => {
      expect(event.source).toBe('venture-cafe')
      expect(event.hash).toHaveLength(16)
      expect(event.date).toBeInstanceOf(Date)
    })
  })
})
