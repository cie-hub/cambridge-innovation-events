// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { dedup } from './dedup.js'

describe('dedup', () => {
  it('returns all events when there are no duplicates', () => {
    const events = [
      { title: 'Event A', date: new Date('2026-03-01'), source: 'bradfield-centre' },
      { title: 'Event B', date: new Date('2026-03-02'), source: 'kings-elab' },
    ]
    expect(dedup(events)).toHaveLength(2)
  })

  it('keeps platform source over venue source for same title and date', () => {
    const events = [
      { title: 'Startup Meetup', date: new Date('2026-03-01'), source: 'bradfield-centre', description: 'short' },
      { title: 'Startup Meetup', date: new Date('2026-03-01'), source: 'eventbrite-cambridge', description: 'detailed' },
    ]
    const result = dedup(events)
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('eventbrite-cambridge')
  })

  it('handles case-insensitive title matching', () => {
    const events = [
      { title: 'AI Workshop', date: new Date('2026-03-01'), source: 'cambridge-network' },
      { title: 'ai workshop', date: new Date('2026-03-01'), source: 'luma-cue' },
    ]
    const result = dedup(events)
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('luma-cue')
  })

  it('treats different dates as separate events even with same title', () => {
    const events = [
      { title: 'Weekly Meetup', date: new Date('2026-03-01'), source: 'meetup-cambridge' },
      { title: 'Weekly Meetup', date: new Date('2026-03-08'), source: 'meetup-cambridge' },
    ]
    expect(dedup(events)).toHaveLength(2)
  })

  it('strips punctuation when comparing titles', () => {
    const events = [
      { title: 'Demo Day: Cambridge!', date: new Date('2026-03-01'), source: 'innovate-cambridge' },
      { title: 'Demo Day Cambridge', date: new Date('2026-03-01'), source: 'eventbrite-cambridge' },
    ]
    const result = dedup(events)
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('eventbrite-cambridge')
  })

  it('keeps first when two platform sources have the same event', () => {
    const events = [
      { title: 'Founders Night', date: new Date('2026-03-01'), source: 'luma-cffn' },
      { title: 'Founders Night', date: new Date('2026-03-01'), source: 'eventbrite-cambridge' },
    ]
    const result = dedup(events)
    expect(result).toHaveLength(1)
  })

  it('deduplicates titles with speaker suffix against base title', () => {
    const events = [
      { title: 'What is Digital Identity all about?', date: new Date('2026-03-02'), source: 'talks-cam' },
      { title: 'What is Digital Identity all about? - Professor Jon Crowcroft FRS', date: new Date('2026-03-02'), source: 'cam-public-events' },
    ]
    const result = dedup(events)
    expect(result).toHaveLength(1)
  })

  it('does not strip dash from short titles', () => {
    const events = [
      { title: 'AI - Ethics', date: new Date('2026-03-01'), source: 'talks-cam' },
      { title: 'AI - Workshop', date: new Date('2026-03-01'), source: 'cam-public-events' },
    ]
    expect(dedup(events)).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    expect(dedup([])).toEqual([])
  })
})
