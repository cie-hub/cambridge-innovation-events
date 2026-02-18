// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseInnovateCambridgeApi } from './innovate-cambridge.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(resolve(__dirname, '_fixtures/innovate-cambridge-api.json'), 'utf-8')
)

describe('parseInnovateCambridgeApi', () => {
  it('returns only open events (filters out closed)', () => {
    const events = parseInnovateCambridgeApi(fixture.events)
    expect(events).toHaveLength(2)
  })

  it('sets access field to "Open to All" for public events', () => {
    const events = parseInnovateCambridgeApi(fixture.events)
    const aiMeetup = events.find(e => e.title === 'Cambridge AI Meetup')
    expect(aiMeetup.access).toBe('Open to All')
  })

  it('sets access field to "Open to Members" for member events', () => {
    const events = parseInnovateCambridgeApi(fixture.events)
    const coffee = events.find(e => e.title === 'Members Coffee Morning')
    expect(coffee.access).toBe('Open to Members')
  })

  it('filters out Closed Meeting events', () => {
    const events = parseInnovateCambridgeApi(fixture.events)
    const closed = events.find(e => e.title === 'Board Strategy Session')
    expect(closed).toBeUndefined()
  })

  it('filters out Glasshouse Closed events', () => {
    const events = parseInnovateCambridgeApi(fixture.events)
    const closed = events.find(e => e.title === 'Private Partner Reception')
    expect(closed).toBeUndefined()
  })

  it('excludes access labels from categories', () => {
    const events = parseInnovateCambridgeApi(fixture.events)
    for (const event of events) {
      expect(event.categories).not.toContain('Open To All')
      expect(event.categories).not.toContain('Open to Members')
      expect(event.categories).not.toContain('Closed Meeting')
      expect(event.categories).not.toContain('Glasshouse Closed')
    }
  })

  it('returns events with valid hashes and dates', () => {
    const events = parseInnovateCambridgeApi(fixture.events)
    events.forEach(event => {
      expect(event.source).toBe('innovate-cambridge')
      expect(event.hash).toHaveLength(16)
      expect(event.date).toBeInstanceOf(Date)
    })
  })
})
