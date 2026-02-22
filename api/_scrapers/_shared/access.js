const FREE_PATTERNS = [
  /\bfree\b/i,
  /\bcomplimentary\b/i,
  /\bno charge\b/i,
  /\bno cost\b/i,
]

const PRICE_PATTERN = /£(\d[\d,.]*\d)/

const MEMBERS_PATTERNS = [
  /\bmembers\s+only\b/i,
  /\binvitation\s+only\b/i,
  /\bcollege\s+members\b/i,
  /\bpark\s+members\b/i,
  /\bfor\s+members\b/i,
]

const OPEN_PATTERN = /\bopen\s+to\s+all\b/i

const RSVP_PATTERN = /\brsvp\b/i

const REGISTER_PATTERNS = [
  /\bregist(?:er|ration)\b/i,
  /\bbook(?:ing)?(?!\s+club)\b/i,
  /\bsign\s*up\b/i,
]

/**
 * Infers cost and access from free-form event text (description, body).
 * Returns { cost, access } where each is a normalized string or null.
 *
 * @param {string} text - Free-form text to scan
 * @returns {{ cost: string|null, access: string|null }}
 */
export function inferCostAccess(text) {
  let cost = null
  let access = null

  if (!text) return { cost, access }

  // Cost detection
  const priceMatch = text.match(PRICE_PATTERN)
  if (priceMatch) {
    cost = `£${priceMatch[1]}`
  } else if (FREE_PATTERNS.some(re => re.test(text))) {
    cost = 'Free'
  }

  // Access detection (order matters: most specific first)
  if (MEMBERS_PATTERNS.some(re => re.test(text))) {
    access = 'Members Only'
  } else if (OPEN_PATTERN.test(text)) {
    access = 'Open to All'
  } else if (RSVP_PATTERN.test(text)) {
    access = 'RSVP Required'
  } else if (REGISTER_PATTERNS.some(re => re.test(text))) {
    access = 'Registration Required'
  }

  return { cost, access }
}
