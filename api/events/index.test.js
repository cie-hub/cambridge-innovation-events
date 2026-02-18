// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

const mockEvents = [
  { title: 'Event A', date: new Date('2026-03-15'), source: 'judge-business-school' },
  { title: 'Event B', date: new Date('2026-03-20'), source: 'bradfield-centre' },
]

const mockCollection = {
  find: vi.fn((_filter, _opts) => ({
    sort: vi.fn(() => ({
      toArray: vi.fn(() => Promise.resolve(mockEvents)),
    })),
  })),
}

vi.mock('../_lib/db.js', () => ({
  getDb: vi.fn(() =>
    Promise.resolve({ collection: vi.fn(() => mockCollection) })
  ),
}))

describe('GET /api/events', () => {
  it('returns events sorted by date', async () => {
    const { default: handler } = await import('./index.js')
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() }
    await handler({ method: 'GET' }, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const data = res.json.mock.calls[0][0]
    expect(data.events).toHaveLength(2)
  })
})
