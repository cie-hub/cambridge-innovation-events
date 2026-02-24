import { ObjectId } from 'mongodb'
import { getDb } from './_lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { eventId } = req.body || {}
  if (!eventId || !ObjectId.isValid(eventId)) return res.status(400).end()

  const db = await getDb()
  const oid = new ObjectId(eventId)

  await Promise.all([
    db.collection('events').updateOne({ _id: oid }, { $inc: { clicks: 1 } }),
    db.collection('clicks').insertOne({ eventId: oid, timestamp: new Date() }),
  ])

  return res.status(204).end()
}
