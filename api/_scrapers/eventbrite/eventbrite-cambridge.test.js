// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { extractEvents, deduplicateById } from './eventbrite-cambridge.js'

describe('extractEvents', () => {
  it('extracts event data from __SERVER_DATA__ results array', () => {
    const results = [{
      id: '123',
      name: 'Test Event',
      summary: 'A test event description',
      start_date: '2026-03-11T00:00:00',
      start_time: '18:00',
      end_time: '20:00',
      url: 'https://www.eventbrite.co.uk/e/test-123',
      primary_venue: { name: 'The Red Lion', address: { city: 'Cambridge' } },
      image: { url: 'https://img.evbuc.com/test.jpg' },
      is_free: true,
    }]
    const events = extractEvents(results)
    expect(events).toHaveLength(1)
    expect(events[0].id).toBe('123')
    expect(events[0].title).toBe('Test Event')
    expect(events[0].date).toBe('2026-03-11')
    expect(events[0].city).toBe('Cambridge')
  })

  it('filters out events not in Cambridge area', () => {
    const results = [
      { id: '1', name: 'Cambridge Event', start_date: '2026-03-11T00:00:00', primary_venue: { address: { city: 'Cambridge' } } },
      { id: '2', name: 'Stevenage Event', start_date: '2026-03-11T00:00:00', primary_venue: { address: { city: 'Stevenage' } } },
      { id: '3', name: 'No Venue Event', start_date: '2026-03-11T00:00:00' },
      { id: '4', name: 'Cherry Hinton Event', start_date: '2026-03-11T00:00:00', primary_venue: { address: { city: 'Cherry Hinton' } } },
    ]
    const events = extractEvents(results)
    expect(events).toHaveLength(2)
    expect(events[0].title).toBe('Cambridge Event')
    expect(events[1].title).toBe('Cherry Hinton Event')
  })

  it('skips events with missing name or start_date', () => {
    const results = [
      { id: '1', start_date: '2026-03-11T00:00:00', primary_venue: { address: { city: 'Cambridge' } } },
      { id: '2', name: 'Good Event', primary_venue: { address: { city: 'Cambridge' } } },
    ]
    expect(extractEvents(results)).toHaveLength(0)
  })
})

describe('deduplicateById', () => {
  it('removes duplicate events by id', () => {
    const events = [
      { id: '1', title: 'Event A' },
      { id: '2', title: 'Event B' },
      { id: '1', title: 'Event A duplicate' },
    ]
    const deduped = deduplicateById(events)
    expect(deduped).toHaveLength(2)
    expect(deduped[0].title).toBe('Event A')
  })
})
