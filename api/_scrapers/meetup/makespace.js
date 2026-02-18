import { fetchMeetupGroups } from './_meetup.js'

const SOURCE = 'makespace'

const EXCLUDE = [
  'members only', 'members\'', 'member social',
  'see the space', 'induction',
  'board meeting', 'townhall', 'town hall',
  'setup', 'set up', 'cleanup', 'clean up',
  'training',  // member training sessions
  'owners group', 'owners townhall',
]

export async function scrapeMakespace() {
  const events = await fetchMeetupGroups(['makespace'], SOURCE)

  const filtered = events.filter((evt) => {
    const titleLower = evt.title.toLowerCase()
    if (EXCLUDE.some((kw) => titleLower.includes(kw))) return false
    if (evt._isRecurring) return false
    return true
  })

  // Deduplicate by title — keep only the next occurrence of each event
  const seen = new Set()
  return filtered.filter((evt) => {
    if (seen.has(evt.title)) return false
    seen.add(evt.title)
    return true
  })
}
