import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('mongodb', () => {
  const mockDb = { collection: vi.fn() }
  class MongoClient {
    constructor() {}
    connect() { return Promise.resolve() }
    db() { return mockDb }
  }
  return { MongoClient }
})

describe('getDb', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.MONGODB_URI
  })

  it('throws if MONGODB_URI is not set', async () => {
    const { getDb } = await import('./db.js')
    await expect(getDb()).rejects.toThrow('MONGODB_URI')
  })

  it('returns a db instance when URI is set', async () => {
    process.env.MONGODB_URI = 'mongodb+srv://test:test@cluster.mongodb.net/test'
    const { getDb } = await import('./db.js')
    const db = await getDb()
    expect(db).toBeDefined()
    expect(db.collection).toBeDefined()
  })
})
