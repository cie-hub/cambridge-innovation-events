// ── Cost detection (regex — precise for £ prices and "free" keywords) ──

const FREE_PATTERNS = [
  /\bfree\b/i,
  /\bcomplimentary\b/i,
  /\bno charge\b/i,
  /\bno cost\b/i,
]

const PRICE_PATTERN = /£(\d[\d,.]*(?:\s*\+?\s*(?:VAT|vat))?(?:\s+per\s+\w+)?)/

// ── Access classifier: n-gram TF-IDF ──

/**
 * Access Type Classifier
 *
 * Inspired by the topic classifier in classifier.js, this uses TF-IDF
 * cosine similarity to detect access types from event text. Two key
 * adaptations for access (vs topics):
 *
 * 1. Context window extraction — only sentences containing trigger words
 *    are fed to the classifier, preventing topic text from diluting the
 *    access signal.
 *
 * 2. N-gram tokenization — unigrams + bigrams + trigrams capture phrases
 *    like "register_your_place" and "members_only" as distinct tokens,
 *    avoiding false positives from single words in unrelated contexts.
 *
 * To add a new access type:
 * 1. Add an entry to ACCESS_TAXONOMY: 'Type Name': 'space separated seed phrases'
 * 2. Use multi-word phrases that are distinctive to that access type
 * 3. Add tests in access-classifier.test.js
 * 4. Run: npx vitest run api/_scrapers/_shared/access-classifier.test.js
 */
const ACCESS_TAXONOMY = {
  'Public':                'open to all open to the public everyone welcome all welcome public event no registration required free to attend',
  'Registration Required': 'register your place book your place book your spot sign up now get tickets buy tickets secure your place reserve your spot tickets required booking essential booking required register via booking via book now register now',
  'RSVP Required':         'rsvp required please rsvp confirm your attendance confirm your place please reply rsvp to confirm',
  'Members Only':          'members only for members member exclusive member event',
  'Invite Only':           'invitation only by invitation invite only invited guests only',
  'Students Only':         'students only for students open to students student only event',
  'University Only':       'university staff and students college members only faculty only academic staff only members of the university',
  'Industry Partners':     'park tenants only industry partners only network members only partner event only',
}

const TRIGGER_WORDS = /\b(open|regist|book|free|member|student|invit|rsvp|ticket|sign.up|admiss|attend|place|faculty|staff|exclusiv|welcom|guest|tenant|partner)/i

const ACCESS_MIN_SIMILARITY = 0.15

// ── N-gram tokenizer (keeps stop words for phrase context) ──

function tokenizeNgrams(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1)

  const tokens = [...words]
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]}_${words[i + 1]}`)
  }
  for (let i = 0; i < words.length - 2; i++) {
    tokens.push(`${words[i]}_${words[i + 1]}_${words[i + 2]}`)
  }
  return tokens
}

// ── TF-IDF machinery (same algorithm as classifier.js) ──

function termFrequency(tokens) {
  const tf = {}
  for (const t of tokens) {
    tf[t] = (tf[t] || 0) + 1
  }
  const max = Math.max(...Object.values(tf), 1)
  for (const t in tf) {
    tf[t] /= max
  }
  return tf
}

const accessSeedDocs = Object.values(ACCESS_TAXONOMY).map(tokenizeNgrams)
const accessAllTerms = new Set(accessSeedDocs.flat())
const accessDocCount = accessSeedDocs.length

const accessIdf = {}
for (const term of accessAllTerms) {
  const docsWithTerm = accessSeedDocs.filter(doc => doc.includes(term)).length
  accessIdf[term] = Math.log(accessDocCount / (1 + docsWithTerm)) + 1
}

function accessTfidfVector(tokens) {
  const tf = termFrequency(tokens)
  const vec = {}
  for (const t of tokens) {
    if (accessIdf[t] !== undefined) {
      vec[t] = (tf[t] || 0) * accessIdf[t]
    }
  }
  return vec
}

function cosineSimilarity(a, b) {
  let dot = 0
  let magA = 0
  let magB = 0
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    const va = a[k] || 0
    const vb = b[k] || 0
    dot += va * vb
    magA += va * va
    magB += vb * vb
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

// Pre-compute seed vectors at module load
const accessSeedVectors = {}
for (const [accessType, seedText] of Object.entries(ACCESS_TAXONOMY)) {
  accessSeedVectors[accessType] = accessTfidfVector(tokenizeNgrams(seedText))
}

// ── Context window extraction ──

// Sentences containing these patterns are false triggers — the words appear
// in non-access contexts (e.g. "team members" = people, not restrictions)
const FALSE_TRIGGERS = [
  /\bopen\s+source\b/i,
  /\b(?:team|board|panel|committee|staff)\s+members?\b/i,
]

function extractAccessContext(text) {
  const sentences = text.split(/[.\n]|<br\s*\/?>/).map(s => s.trim()).filter(Boolean)
  const relevant = sentences.filter(s => {
    if (!TRIGGER_WORDS.test(s)) return false
    if (FALSE_TRIGGERS.some(re => re.test(s)) && !/\bopen\s+to\b/i.test(s) && !/\bmembers?\s+only\b/i.test(s)) return false
    return true
  })
  return relevant.join(' ')
}

// ── Public API ──

/**
 * Classifies event text into an access type using n-gram TF-IDF
 * cosine similarity against the ACCESS_TAXONOMY.
 *
 * @param {string} text - Free-form event text (description, body)
 * @returns {string|null} Access type label or null if no match
 */
export function inferAccess(text) {
  if (!text) return null

  // "open to all members of the University" = University Only, not Public
  if (/open\s+to\s+all\s+members?\s+of\s+(?:the\s+)?(?:university|college)/i.test(text)) {
    return 'University Only'
  }

  const context = extractAccessContext(text)
  if (!context) return null

  const tokens = tokenizeNgrams(context)
  if (tokens.length === 0) return null

  const eventVec = accessTfidfVector(tokens)
  let bestType = null
  let bestScore = 0

  for (const [accessType, seedVec] of Object.entries(accessSeedVectors)) {
    const score = cosineSimilarity(eventVec, seedVec)
    if (score > bestScore) {
      bestScore = score
      bestType = accessType
    }
  }

  return bestScore >= ACCESS_MIN_SIMILARITY ? bestType : null
}

/**
 * Infers cost and access from free-form event text (description, body).
 * Cost uses regex (precise for £ prices and "free" keywords).
 * Access delegates to the n-gram TF-IDF classifier.
 *
 * @param {string} text - Free-form text to scan
 * @returns {{ cost: string|null, access: string|null }}
 */
export function inferCostAccess(text) {
  let cost = null

  if (!text) return { cost, access: null }

  // Cost detection (regex)
  const priceMatch = text.match(PRICE_PATTERN)
  if (priceMatch) {
    const nearby = text.slice(Math.max(0, priceMatch.index - 20), Math.min(text.length, priceMatch.index + priceMatch[0].length + 20))
    if (!/\bprizes?\b/i.test(nearby)) {
      cost = `£${priceMatch[1]}`
    }
  } else if (FREE_PATTERNS.some(re => re.test(text))) {
    cost = 'Free'
  }

  // Access detection (n-gram TF-IDF classifier)
  const access = inferAccess(text)

  return { cost, access }
}
