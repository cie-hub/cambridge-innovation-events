import { getDb } from './_lib/db.js'
import { scrapers } from './_scrapers/index.js'
import { batches, sources as sourcesMeta } from './_scrapers/_shared/config.js'

export function buildScrapeHandler({ getAllSourceIds }) {
  return async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end()

    const secret = process.env.CRON_SECRET
    if (!secret) return res.status(500).json({ error: 'CRON_SECRET is not configured' })
    if (req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorised' })
    }

    const batchParam = new URL(req.url, `http://${req.headers.host}`).searchParams.get('batch')
    const sourceIds = batchParam !== null && batches[batchParam]
      ? batches[batchParam]
      : getAllSourceIds()

    const db = await getDb()
    const eventsCol = db.collection('events')
    const sourcesCol = db.collection('sources')

    await eventsCol.createIndex({ contentHash: 1 }, { sparse: true, background: true })

    const results = {}

    for (const sourceId of sourceIds) {
      const scrapeFn = scrapers[sourceId]
      if (!scrapeFn) {
        results[sourceId] = { status: 'error', error: 'No scraper found' }
        continue
      }

      const now = new Date()
      const meta = sourcesMeta[sourceId]

      try {
        const rawEvents = await scrapeFn()
        const events = rawEvents.filter(Boolean)

        // Remove stale events for this source before upserting fresh data
        const freshHashes = new Set(events.map((e) => e.hash))
        await eventsCol.deleteMany({
          source: sourceId,
          hash: { $nin: [...freshHashes] },
        })

        for (const event of events) {
          await eventsCol.updateOne(
            { hash: event.hash },
            { $set: event },
            { upsert: true }
          )
        }

        await sourcesCol.updateOne(
          { _id: sourceId },
          { $set: { ...meta, _id: sourceId, lastScrapedAt: now, status: 'ok' } },
          { upsert: true }
        )

        results[sourceId] = { status: 'ok', events: events.length }
      } catch (err) {
        await sourcesCol.updateOne(
          { _id: sourceId },
          { $set: { ...meta, _id: sourceId, lastScrapedAt: now, status: 'error' } },
          { upsert: true }
        )
        results[sourceId] = { status: 'error', error: err.message }
      }
    }

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    await eventsCol.deleteMany({ date: { $lt: threeMonthsAgo } })

    // Remove events from deregistered sources
    const allRegistered = Object.values(batches).flat()
    await eventsCol.deleteMany({ source: { $nin: allRegistered } })

    // Cross-source dedup: for each contentHash with multiple sources, keep latest scraped
    const duplicates = await eventsCol.aggregate([
      { $match: { contentHash: { $ne: null } } },
      { $group: { _id: '$contentHash', count: { $sum: 1 }, docs: { $push: { id: '$_id', scrapedAt: '$scrapedAt' } } } },
      { $match: { count: { $gt: 1 } } },
    ]).toArray()

    for (const dup of duplicates) {
      const sorted = dup.docs.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt))
      const idsToRemove = sorted.slice(1).map(d => d.id)
      await eventsCol.deleteMany({ _id: { $in: idsToRemove } })
    }

    return res.status(200).json({ sources: sourceIds.length, results })
  }
}

export default buildScrapeHandler({
  getAllSourceIds: () => Object.values(batches).flat(),
})
