// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseHistoryEconomics } from './history-economics.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(resolve(__dirname, '_fixtures/history-economics.html'), 'utf-8')

describe('parseHistoryEconomics', () => {
  it('extracts events with dates from bold text', () => {
    const $ = cheerio.load(fixture)
    const events = parseHistoryEconomics($)
    expect(events.length).toBe(3)
  })

  it('parses date from <strong> tag', () => {
    const $ = cheerio.load(fixture)
    const events = parseHistoryEconomics($)
    expect(events[0].date).toBe('2026-02-03')
  })

  it('extracts talk title from <em> tag', () => {
    const $ = cheerio.load(fixture)
    const events = parseHistoryEconomics($)
    expect(events[0].title).toContain('Little Corners of Freedom')
  })

  it('extracts speaker name from first link', () => {
    const $ = cheerio.load(fixture)
    const events = parseHistoryEconomics($)
    expect(events[0].description).toContain('Mariia Koskina')
  })

  it('extracts venue override from date strong (after --)', () => {
    const $ = cheerio.load(fixture)
    const events = parseHistoryEconomics($)
    expect(events[0].location).toBe('Seminar Room 5, Cripps Court')
  })

  it('uses sidebar default location when no venue override', () => {
    const $ = cheerio.load(fixture)
    const events = parseHistoryEconomics($)
    expect(events[1].location).toBe('Seminar Room 3, Cripps Court, Magdalene College')
  })

  it('extracts sourceUrl from "Further information" link', () => {
    const $ = cheerio.load(fixture)
    const events = parseHistoryEconomics($)
    expect(events[0].sourceUrl).toBe('https://www.histecon.magd.cam.ac.uk/seminar_koskina.htm')
  })

  it('sets location to Online for Harvard sub-series events', () => {
    const $ = cheerio.load(fixture)
    const events = parseHistoryEconomics($)
    const harvard = events.find(e => e.title.includes('Flesh and Toil'))
    expect(harvard.location).toBe('Online')
  })

  it('skips "Past" links that contain dates in their strong text', () => {
    const $ = cheerio.load(fixture)
    const events = parseHistoryEconomics($)
    const titles = events.map(e => e.title)
    expect(titles).not.toContain('Past History and Economics seminars')
  })

  it('sets access to University Only', () => {
    const $ = cheerio.load(fixture)
    const events = parseHistoryEconomics($)
    expect(events[0].access).toBe('University Only')
  })
})
