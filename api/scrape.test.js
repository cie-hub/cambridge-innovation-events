// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCollection = {
  updateOne: vi.fn(),
  deleteMany: vi.fn(),
}
const mockDb = { collection: vi.fn(() => mockCollection) }

vi.mock('./_lib/db.js', () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}))

vi.mock('./_scrapers/index.js', () => ({
  scrapers: {
    'kings-elab': vi.fn(() =>
      Promise.resolve([
        {
          title: 'Test Event',
          hash: 'abc123',
          date: new Date('2026-03-15'),
          source: 'kings-elab',
        },
      ])
    ),
  },
}))

const TEST_SECRET = 'test-secret-value'

function mockReq(overrides = {}) {
  return {
    method: 'GET',
    url: '/api/scrape',
    headers: { host: 'localhost', authorization: `Bearer ${TEST_SECRET}` },
    ...overrides,
  }
}

function mockRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn(), end: vi.fn() }
}

describe('/api/scrape handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = TEST_SECRET
  })

  it('scrapes all provided source IDs', async () => {
    const { buildScrapeHandler } = await import('./scrape.js')
    const handler = buildScrapeHandler({ getAllSourceIds: () => ['kings-elab'] })

    const res = mockRes()
    await handler(mockReq(), res)

    expect(res.json).toHaveBeenCalled()
    const result = res.json.mock.calls[0][0]
    expect(result.sources).toBe(1)
    expect(result.results['kings-elab'].status).toBe('ok')
    expect(result.results['kings-elab'].events).toBe(1)
  })

  it('handles sources without scrapers gracefully', async () => {
    const { buildScrapeHandler } = await import('./scrape.js')
    const handler = buildScrapeHandler({ getAllSourceIds: () => ['nonexistent'] })

    const res = mockRes()
    await handler(mockReq(), res)

    expect(res.status).toHaveBeenCalledWith(200)
    const result = res.json.mock.calls[0][0]
    expect(result.results['nonexistent'].status).toBe('error')
  })

  it('rejects requests without valid auth', async () => {
    const { buildScrapeHandler } = await import('./scrape.js')
    const handler = buildScrapeHandler({ getAllSourceIds: () => ['kings-elab'] })

    const res = mockRes()
    await handler(mockReq({ headers: { host: 'localhost' } }), res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const { buildScrapeHandler } = await import('./scrape.js')
    const handler = buildScrapeHandler({ getAllSourceIds: () => ['kings-elab'] })

    const res = mockRes()
    await handler(mockReq(), res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
