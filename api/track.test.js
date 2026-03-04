// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateOne = vi.fn(() => Promise.resolve())
const mockInsertOne = vi.fn(() => Promise.resolve())
const mockFindOne = vi.fn(() => Promise.resolve(null))

vi.mock('./_lib/db.js', () => ({
  getDb: vi.fn(() =>
    Promise.resolve({
      collection: vi.fn((name) => {
        if (name === 'events') return { updateOne: mockUpdateOne, findOne: mockFindOne }
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

  it('stores event hash in clicks collection and increments counter', async () => {
    mockFindOne.mockResolvedValueOnce({ _id: '507f1f77bcf86cd799439011', hash: 'abc123def456' })
    const res = { status: vi.fn().mockReturnThis(), end: vi.fn() }
    await handler({ method: 'POST', body: { eventId: '507f1f77bcf86cd799439011' } }, res)
    expect(res.status).toHaveBeenCalledWith(204)
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: expect.any(Object) },
      { $inc: { clicks: 1 } }
    )
    expect(mockInsertOne).toHaveBeenCalledWith({
      hash: 'abc123def456',
      timestamp: expect.any(Date),
    })
  })

  it('returns 404 when event not found', async () => {
    mockFindOne.mockResolvedValueOnce(null)
    const res = { status: vi.fn().mockReturnThis(), end: vi.fn() }
    await handler({ method: 'POST', body: { eventId: '507f1f77bcf86cd799439011' } }, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })
})
