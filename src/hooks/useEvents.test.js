import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useEvents } from './useEvents'

const mockEvents = [
  { _id: '1', title: 'Event A', date: '2026-03-15T18:00:00Z', source: 'judge-business-school' },
  { _id: '2', title: 'Event B', date: '2026-03-20T10:00:00Z', source: 'bradfield-centre' },
]

beforeEach(() => {
  global.fetch = vi.fn((url) => {
    if (url === '/api/events') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents }),
      })
    }
    if (url === '/api/events/sources') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sources: [] }),
      })
    }
  })
})

describe('useEvents', () => {
  it('fetches events on mount', async () => {
    const { result } = renderHook(() => useEvents())
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.events).toHaveLength(2)
    expect(result.current.events[0].title).toBe('Event A')
  })
})
