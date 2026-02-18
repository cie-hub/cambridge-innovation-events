// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseIdeaspace } from './ideaspace.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/ideaspace.html'), 'utf-8')

describe('parseIdeaspace', () => {
  it('returns an array from fixture HTML', () => {
    const $ = cheerio.load(html)
    const events = parseIdeaspace($)
    expect(Array.isArray(events)).toBe(true)
  })

  it('handles 404 page gracefully by returning empty array', () => {
    const $ = cheerio.load(html)
    const events = parseIdeaspace($)
    expect(events.length).toBe(0)
  })

  it('validates all returned events have required fields', () => {
    const $ = cheerio.load(html)
    const events = parseIdeaspace($)
    events.forEach(event => {
      expect(event.source).toBe('ideaspace')
      expect(event.hash).toHaveLength(16)
      expect(event.date).toBeInstanceOf(Date)
    })
  })
})
