/**
 * Event Category Classifier
 *
 * Every event source classifies things differently. Eventbrite has tags,
 * Meetup has topics, some sources have nothing at all. Rather than
 * hard-coding a mapping for each source (the horror), this classifier
 * uses TF-IDF cosine similarity to figure out the best-fit categories
 * from the event's own title and description.
 *
 * How it works:
 * Each category in TAXONOMY below has a bag of seed terms. When an event
 * comes in, we tokenise its title + description, build a TF-IDF vector,
 * and measure how close it is to each category's seed vector using cosine
 * similarity. If the similarity score is above MIN_SIMILARITY (0.1), the
 * category is a candidate. We take the top MAX_CATEGORIES (2) matches.
 *
 * This means categories can be added or removed just by editing TAXONOMY.
 * No other code changes needed. The trade-off is precision: some events
 * will get slightly wrong categories. That's fine. We'd rather have a
 * reasonable guess than no category at all, and we'd rather keep the data
 * centralised than scatter hard-coded mappings across 25 scrapers.
 *
 * To add a new category:
 * 1. Add an entry to TAXONOMY: 'Category Name': 'space separated seed terms'
 * 2. Pick 10-15 terms that are distinctive to that category
 * 3. Avoid generic words that overlap with other categories (overfitting)
 * 4. Add a test in classifier.test.js to verify classification
 * 5. Run: npx vitest run api/_scrapers/_shared/classifier.test.js
 *
 * Tuning:
 * - MIN_SIMILARITY (0.1): Lower = more matches, higher = stricter
 * - MAX_CATEGORIES (2): Each event gets at most this many categories
 * - The title is weighted double (concatenated twice) for stronger signal
 */
const TAXONOMY = {
  'AI & Data': 'artificial intelligence machine learning deep learning neural network llm data science nlp computer vision algorithm ai model training dataset',
  'Biotech & Health': 'biotech life sciences healthcare biomedical pharmaceutical genomics cancer research clinical therapeutics medicine drug biology',
  'Startups & Founders': 'startup founder entrepreneurship accelerator incubator pitch venture seed stage scale-up launch company building',
  'Investment & Finance': 'investment venture capital funding fintech angel fundraising vc series private equity valuation deal',
  'Networking': 'networking meetup coffee morning drinks social connect community mixer reception gathering informal',
  'Workshops & Training': 'workshop training bootcamp masterclass hands-on practical skills tutorial course session learn',
  'Talks & Lectures': 'lecture talk seminar keynote panel discussion speaker presentation colloquium fireside chat series',
  'Science & Research': 'research science physics chemistry mathematics academic university laboratory discovery paper journal',
  'Sustainability': 'sustainability climate green energy environment clean tech net zero carbon renewable circular economy',
  'Technology': 'software hardware programming developer cyber cloud iot quantum computing digital platform web app',
  'Policy & Society': 'policy government regulation ethics diversity inclusion social impact public engagement equality',
  'Innovation & Strategy': 'innovation strategy growth transformation partnerships ecosystem collaboration enterprise roadmap',
  'Female Founders': 'female women woman gender ladies leadership women-in-tech empowerment girls womenled',
  'Product Management': 'product manager management roadmap user story backlog sprint agile scrum prioritization stakeholder discovery ux requirements features',
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that',
  'these', 'those', 'it', 'its', 'not', 'no', 'nor', 'so', 'if', 'as',
  'we', 'our', 'you', 'your', 'they', 'their', 'he', 'she', 'his', 'her',
  'all', 'each', 'every', 'both', 'more', 'most', 'other', 'some', 'such',
  'than', 'too', 'very', 'just', 'about', 'above', 'after', 'again',
  'also', 'am', 'any', 'because', 'before', 'between', 'come', 'get',
  'here', 'how', 'into', 'like', 'make', 'many', 'me', 'much', 'my',
  'new', 'now', 'only', 'out', 'over', 'own', 'same', 'then', 'there',
  'through', 'under', 'up', 'us', 'what', 'when', 'where', 'which',
  'while', 'who', 'whom', 'why', 'down', 'during', 'further',
])

const MIN_SIMILARITY = 0.1
const MAX_CATEGORIES = 2

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
}

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

// Build IDF from all seed documents
const seedDocs = Object.values(TAXONOMY).map(tokenize)
const allTerms = new Set(seedDocs.flat())
const docCount = seedDocs.length

const idf = {}
for (const term of allTerms) {
  const docsWithTerm = seedDocs.filter(doc => doc.includes(term)).length
  idf[term] = Math.log(docCount / (1 + docsWithTerm)) + 1
}

function tfidfVector(tokens) {
  const tf = termFrequency(tokens)
  const vec = {}
  for (const t of tokens) {
    if (idf[t] !== undefined) {
      vec[t] = (tf[t] || 0) * idf[t]
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
const seedVectors = {}
for (const [category, seedText] of Object.entries(TAXONOMY)) {
  seedVectors[category] = tfidfVector(tokenize(seedText))
}

/**
 * Classifies event text into 0-2 categories from the fixed taxonomy
 * using TF-IDF cosine similarity.
 *
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {string[]} Array of 0-2 category names
 */
export function classify(title, description) {
  const text = `${title} ${title} ${description}`
  const tokens = tokenize(text)
  if (tokens.length === 0) return []

  const eventVec = tfidfVector(tokens)
  const scores = []

  for (const [category, seedVec] of Object.entries(seedVectors)) {
    const score = cosineSimilarity(eventVec, seedVec)
    if (score >= MIN_SIMILARITY) {
      scores.push({ category, score })
    }
  }

  scores.sort((a, b) => b.score - a.score)
  return scores.slice(0, MAX_CATEGORIES).map(s => s.category)
}
