// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { hashEvent, normalizeEvent } from './utils.js'

describe('hashEvent', () => {
  it('produces consistent hash from title + date + source', () => {
    const hash1 = hashEvent('Talk', '2026-03-15', 'bradfield-centre')
    const hash2 = hashEvent('Talk', '2026-03-15', 'bradfield-centre')
    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different events', () => {
    const hash1 = hashEvent('Talk A', '2026-03-15', 'bradfield-centre')
    const hash2 = hashEvent('Talk B', '2026-03-15', 'bradfield-centre')
    expect(hash1).not.toBe(hash2)
  })
})

describe('normalizeEvent', () => {
  it('creates event object with required fields and hash', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const event = normalizeEvent({
      title: 'Founder Night',
      description: 'Networking event',
      date: '2026-03-15T18:00:00Z',
      source: 'bradfield-centre',
      sourceUrl: 'https://bradfieldcentre.com/events/1',
      location: 'The Bradfield Centre',
    })

    expect(event.title).toBe('Founder Night')
    expect(event.source).toBe('bradfield-centre')
    expect(event.hash).toBeDefined()
    expect(event.scrapedAt).toBeInstanceOf(Date)
    expect(Array.isArray(event.categories)).toBe(true)
    expect(event.cost).toBeNull()
    expect(event.access).toBeNull()
    spy.mockRestore()
  })

  it('includes a contentHash based on title and date only (no source)', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const eventA = normalizeEvent({
      title: 'Same Talk', date: '2026-03-15', source: 'source-a', sourceUrl: 'https://a.com',
    })
    const eventB = normalizeEvent({
      title: 'Same Talk', date: '2026-03-15', source: 'source-b', sourceUrl: 'https://b.com',
    })
    expect(eventA.contentHash).toBeDefined()
    expect(eventA.contentHash).toBe(eventB.contentHash)
    expect(eventA.hash).not.toBe(eventB.hash)
    spy.mockRestore()
  })

  it('assigns categories from title and description via TF-IDF', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const event = normalizeEvent({
      title: 'Machine Learning Workshop',
      description: 'Hands-on training session on deep learning and neural networks.',
      date: '2026-04-01',
      source: 'test',
      sourceUrl: 'https://example.com',
    })

    expect(event.categories.length).toBeGreaterThan(0)
    expect(event.categories).toContain('AI & Data')
    spy.mockRestore()
  })
})

describe('normalizeEvent validation', () => {
  it('returns null when title is missing', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = normalizeEvent({ date: '2026-03-15', source: 'test', sourceUrl: 'https://example.com' })
    expect(result).toBeNull()
    spy.mockRestore()
  })

  it('returns null when date is missing', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = normalizeEvent({ title: 'Talk', source: 'test', sourceUrl: 'https://example.com' })
    expect(result).toBeNull()
    spy.mockRestore()
  })

  it('returns null when source is missing', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = normalizeEvent({ title: 'Talk', date: '2026-03-15', sourceUrl: 'https://example.com' })
    expect(result).toBeNull()
    spy.mockRestore()
  })

  it('logs warnings for missing recommended fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    normalizeEvent({
      title: 'Talk', date: '2026-03-15', source: 'test', sourceUrl: 'https://example.com',
    })
    const warns = spy.mock.calls.map(c => JSON.parse(c[0])).filter(o => o.level === 'warn')
    expect(warns.length).toBeGreaterThan(0)
    spy.mockRestore()
  })
})
