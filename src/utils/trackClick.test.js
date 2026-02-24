import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackClick } from './trackClick'

describe('trackClick', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls sendBeacon with correct URL and payload', () => {
    const beacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })

    trackClick('507f1f77bcf86cd799439011')

    expect(beacon).toHaveBeenCalledWith(
      '/api/track',
      expect.any(String)
    )
    const payload = JSON.parse(beacon.mock.calls[0][1])
    expect(payload.eventId).toBe('507f1f77bcf86cd799439011')
  })

  it('falls back to fetch when sendBeacon is unavailable', () => {
    const mockFetch = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('fetch', mockFetch)

    trackClick('507f1f77bcf86cd799439011')

    expect(mockFetch).toHaveBeenCalledWith('/api/track', expect.objectContaining({
      method: 'POST',
    }))
  })
})
