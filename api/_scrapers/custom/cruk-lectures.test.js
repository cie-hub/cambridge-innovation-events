// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { parseCrukLectures } from './cruk-lectures.js'

const makeHtml = (blocks) => `<div>${blocks.map(b => b.map(text => `<div style="padding-left:10px">${text}</div>`).join('')).join('')}</div>`

describe('parseCrukLectures', () => {
  it('parses a standard 3-div block (date, speaker, title)', () => {
    const html = makeHtml([
      ['Thursday 05 March 9:30am', 'Dr Jane Smith', '<em>Cancer Immunotherapy Update</em>'],
    ])
    const $ = cheerio.load(html)
    const events = parseCrukLectures($)
    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Cancer Immunotherapy Update')
    expect(events[0].time).toBe('09:30')
  })

  it('parses multiple events', () => {
    const html = makeHtml([
      ['Thursday 05 March 9:30am', 'Dr Smith', '<em>Lecture One</em>'],
      ['Thursday 12 March 9:30am', 'Dr Jones', '<em>Lecture Two</em>'],
    ])
    const $ = cheerio.load(html)
    const events = parseCrukLectures($)
    expect(events).toHaveLength(2)
    expect(events[0].title).toBe('Lecture One')
    expect(events[1].title).toBe('Lecture Two')
  })

  it('does not produce a title from a date-header div', () => {
    const html = makeHtml([
      ['Thursday 05 March 9:30am', 'Dr Smith', '<em>Real Lecture Title</em>'],
    ])
    const $ = cheerio.load(html)
    const events = parseCrukLectures($)
    expect(events.every(e => !/Thursday|Monday|Wednesday|Friday/i.test(e.title))).toBe(true)
  })

  it('skips blocks with no identifiable title', () => {
    const html = makeHtml([
      ['Thursday 05 March 9:30am', 'Dr Smith'],
    ])
    const $ = cheerio.load(html)
    const events = parseCrukLectures($)
    expect(events).toHaveLength(0)
  })

  it('falls back to plain text title when no em/strong', () => {
    const html = makeHtml([
      ['Thursday 05 March 9:30am', 'Dr Smith', 'Lecture Without Formatting'],
    ])
    const $ = cheerio.load(html)
    const events = parseCrukLectures($)
    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Lecture Without Formatting')
  })

  it('returns empty array when no events', () => {
    const $ = cheerio.load('<div>Nothing here</div>')
    expect(parseCrukLectures($)).toHaveLength(0)
  })
})
