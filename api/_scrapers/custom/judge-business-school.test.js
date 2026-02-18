// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseJudgeBusinessSchool } from './judge-business-school.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/judge-business-school.html'), 'utf-8')

describe('parseJudgeBusinessSchool', () => {
  it('returns an array from fixture HTML', () => {
    const $ = cheerio.load(html)
    const events = parseJudgeBusinessSchool($)
    expect(Array.isArray(events)).toBe(true)
  })

  it('handles landing page without structured events gracefully', () => {
    const $ = cheerio.load(html)
    const events = parseJudgeBusinessSchool($)
    events.forEach(event => {
      expect(event.source).toBe('judge-business-school')
      expect(event.hash).toHaveLength(16)
    })
  })

  it('returns events with required fields if any are found', () => {
    const $ = cheerio.load(html)
    const events = parseJudgeBusinessSchool($)
    events.forEach(event => {
      expect(event.title.length).toBeGreaterThan(0)
      expect(event.date).toBeInstanceOf(Date)
      expect(event.sourceUrl).toBeDefined()
    })
  })
})
