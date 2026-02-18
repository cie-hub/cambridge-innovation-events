// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseEagleLabs } from './eagle-labs.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/eagle-labs.html'), 'utf-8')

describe('parseEagleLabs', () => {
  it('returns an array from fixture HTML', () => {
    const $ = cheerio.load(html)
    const events = parseEagleLabs($)
    expect(Array.isArray(events)).toBe(true)
  })

  it('handles location overview page gracefully', () => {
    const $ = cheerio.load(html)
    const events = parseEagleLabs($)
    events.forEach(event => {
      expect(event.source).toBe('eagle-labs')
      expect(event.hash).toHaveLength(16)
    })
  })

  it('returns events with valid fields if any are found', () => {
    const $ = cheerio.load(html)
    const events = parseEagleLabs($)
    events.forEach(event => {
      expect(event.title.length).toBeGreaterThan(0)
      expect(event.date).toBeInstanceOf(Date)
    })
  })
})
