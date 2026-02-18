import { getDb } from '../_lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const db = await getDb()
  const sources = await db
    .collection('sources')
    .find({})
    .toArray()

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
  return res.status(200).json({ sources })
}
