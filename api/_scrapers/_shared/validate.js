import { log } from './log.js'

const REQUIRED = ['title', 'date', 'source']
const RECOMMENDED = ['location', 'description', 'time', 'imageUrl', 'sourceUrl']

/**
 * Validates raw event data before normalization.
 * Rejects events missing title, date, or source.
 * Logs warnings for missing recommended fields.
 *
 * @param {Object} raw - Raw event fields
 * @param {string} source - Source slug for logging
 * @returns {Object|null} The event if valid, null if rejected
 */
export function validateEvent(raw, source) {
  for (const field of REQUIRED) {
    if (!raw[field]) {
      log.warn(source, `Rejected event: missing required field "${field}"`, { title: raw.title || '(no title)' })
      return null
    }
  }

  const missing = RECOMMENDED.filter(f => !raw[f])
  if (missing.length > 0) {
    log.warn(source, `Missing recommended fields: ${missing.join(', ')}`, { title: raw.title, missing })
  }

  return raw
}
