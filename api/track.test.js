// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateOne = vi.fn(() => Promise.resolve())
const mockInsertOne = vi.fn(() => Promise.resolve())

vi.mock('./_lib/db.js', () => ({
  getDb: vi.fn(() =>
    Promise.resolve({
      collection: vi.fn((name) => {
        if (name === 'events') return { updateOne: mockUpdateOne }
        if (name === 'clicks') return { insertOne: mockInsertOne }
      }),
    })
  ),
}))

describe('POST /api/track', () => {
  let handler

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./track.js')
    handler = mod.default
  })

  it('rejects non-POST requests', async () => {
    const res = { status: vi.fn().mockReturnThis(), end: vi.fn() }
    await handler({ method: 'GET' }, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('rejects missing eventId', async () => {
    const res = { status: vi.fn().mockReturnThis(), end: vi.fn() }
    await handler({ method: 'POST', body: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects invalid ObjectId', async () => {
    const res = { status: vi.fn().mockReturnThis(), end: vi.fn() }
    await handler({ method: 'POST', body: { eventId: 'not-valid' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('increments clicks and inserts timestamp for valid eventId', async () => {
    const res = { status: vi.fn().mockReturnThis(), end: vi.fn() }
    await handler({ method: 'POST', body: { eventId: '507f1f77bcf86cd799439011' } }, res)
    expect(res.status).toHaveBeenCalledWith(204)
    expect(mockUpdateOne).toHaveBeenCalledOnce()
    expect(mockInsertOne).toHaveBeenCalledOnce()
  })
})
