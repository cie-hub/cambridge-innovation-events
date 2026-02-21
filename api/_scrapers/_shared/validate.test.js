// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { validateEvent } from './validate.js'

describe('validateEvent', () => {
  it('returns the event when all required fields are present', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const event = { title: 'Talk', date: '2026-02-17', source: 'test' }
    const result = validateEvent(event, 'test')
    expect(result).toBe(event)
    spy.mockRestore()
  })

  it('returns null when title is missing', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = validateEvent({ date: '2026-02-17', source: 'test' }, 'test')
    expect(result).toBeNull()
    spy.mockRestore()
  })

  it('returns null when date is missing', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = validateEvent({ title: 'Talk', source: 'test' }, 'test')
    expect(result).toBeNull()
    spy.mockRestore()
  })

  it('returns null when source is missing', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = validateEvent({ title: 'Talk', date: '2026-02-17' }, 'test')
    expect(result).toBeNull()
    spy.mockRestore()
  })

  it('logs warning for missing recommended fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const event = { title: 'Talk', date: '2026-02-17', source: 'test' }
    validateEvent(event, 'test')
    const warnings = spy.mock.calls.map(c => JSON.parse(c[0])).filter(o => o.level === 'warn')
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings[0].missing).toBeDefined()
    spy.mockRestore()
  })

  it('does not warn when all fields are present', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const event = {
      title: 'Talk', date: '2026-02-17', source: 'test',
      location: 'Cambridge', description: 'A talk', time: '17:00',
      imageUrl: 'https://example.com/img.jpg', sourceUrl: 'https://example.com', access: 'Open to All',
    }
    validateEvent(event, 'test')
    const warnings = spy.mock.calls.map(c => JSON.parse(c[0])).filter(o => o.level === 'warn')
    expect(warnings).toHaveLength(0)
    spy.mockRestore()
  })
})
