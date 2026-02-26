# CRUK + HTML Entity Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two bugs: (1) CRUK scraper producing broken titles from misaligned div traversal, and (2) HTML entities like `&#8211;` rendering as literals in event titles and descriptions.

**Architecture:** Task 1 extracts a `decodeEntities` helper in `_shared/utils.js` and applies it to `title` and `description` in `normalizeEvent`. Task 2 refactors the CRUK scraper to anchor on date-header divs by content rather than positional offset.

**Tech Stack:** Node.js, Cheerio, Vitest

---

### Task 1: HTML entity decoding in normalizeEvent (TDD)

**Files:**
- Modify: `api/_scrapers/_shared/utils.js:68-78` (extract helper, apply to title/description)
- Test: `api/_scrapers/_shared/utils.test.js` (add new tests)

**Step 1: Write failing tests**

Open `api/_scrapers/_shared/utils.test.js` and add these tests to the existing `normalizeEvent` describe block (or create the describe block if it doesn't exist):

```js
import { normalizeEvent } from './utils.js'

describe('normalizeEvent HTML entity decoding', () => {
  const base = {
    date: '2026-03-04',
    source: 'test-source',
    sourceUrl: 'https://example.com',
  }

  it('decodes numeric HTML entities in title', () => {
    const event = normalizeEvent({ ...base, title: 'Pitch &#8211; Winter 2026' })
    expect(event.title).toBe('Pitch – Winter 2026')
  })

  it('decodes named HTML entities in title', () => {
    const event = normalizeEvent({ ...base, title: 'Tech &amp; Innovation' })
    expect(event.title).toBe('Tech & Innovation')
  })

  it('decodes numeric HTML entities in description', () => {
    const event = normalizeEvent({ ...base, title: 'Test Event', description: 'Building at the intersection &#8211; while exciting' })
    expect(event.description).toBe('Building at the intersection – while exciting')
  })

  it('leaves plain text unchanged', () => {
    const event = normalizeEvent({ ...base, title: 'Normal Title' })
    expect(event.title).toBe('Normal Title')
  })
})
```

**Step 2: Run to verify they fail**

Run: `npx vitest run api/_scrapers/_shared/utils.test.js`
Expected: FAIL — `expected 'Pitch &#8211; Winter 2026' to be 'Pitch – Winter 2026'`

**Step 3: Implement the fix**

In `api/_scrapers/_shared/utils.js`:

1. Extract a `decodeEntities` function **before** `sanitizeLocation` (around line 68):

```js
function decodeEntities(str) {
  if (!str) return str
  return str
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(code))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
```

2. Update `sanitizeLocation` to reuse it (replace the duplicate entity lines):

```js
function sanitizeLocation(str) {
  return decodeEntities(str)
    .replace(/[\t\n\r]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
```

3. Apply `decodeEntities` to `title` and `description` in `normalizeEvent` (lines 113-115):

```js
return {
  title: decodeEntities(title),
  description: decodeEntities(description) || '',
  // ... rest unchanged
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run api/_scrapers/_shared/utils.test.js`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add api/_scrapers/_shared/utils.js api/_scrapers/_shared/utils.test.js
git commit -m "fix: decode HTML entities in event titles and descriptions"
```

---

### Task 2: Refactor CRUK scraper (TDD)

**Files:**
- Create: `api/_scrapers/custom/cruk-lectures.test.js`
- Modify: `api/_scrapers/custom/cruk-lectures.js`

**Step 1: Write failing tests**

Create `api/_scrapers/custom/cruk-lectures.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { parseCrukLectures } from './cruk-lectures.js'

const makeHtml = (blocks) => `<div>${blocks.map(b => b.map(text => `<div style="padding-left:10px">${text}</div>`).join('')).join('')}</div>`

describe('parseCrukLectures', () => {
  it('parses a standard 3-div block (date, speaker, title)', () => {
    const html = makeHtml([
      ['Thursday 05 March 9:30am', 'Dr Jane Smith', '<em>Cancer Immunotherapy Update</em>'],
    ])
    const $ = cheerio.load(html)
    const events = parseCrukLectures($)
    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Cancer Immunotherapy Update')
    expect(events[0].time).toBe('09:30')
  })

  it('parses multiple events', () => {
    const html = makeHtml([
      ['Thursday 05 March 9:30am', 'Dr Smith', '<em>Lecture One</em>'],
      ['Thursday 12 March 9:30am', 'Dr Jones', '<em>Lecture Two</em>'],
    ])
    const $ = cheerio.load(html)
    const events = parseCrukLectures($)
    expect(events).toHaveLength(2)
    expect(events[0].title).toBe('Lecture One')
    expect(events[1].title).toBe('Lecture Two')
  })

  it('does not produce a title from a date-header div', () => {
    const html = makeHtml([
      ['Thursday 05 March 9:30am', 'Dr Smith', '<em>Real Lecture Title</em>'],
    ])
    const $ = cheerio.load(html)
    const events = parseCrukLectures($)
    expect(events.every(e => !/Thursday|Monday|Wednesday|Friday/i.test(e.title))).toBe(true)
  })

  it('skips blocks with no identifiable title', () => {
    const html = makeHtml([
      ['Thursday 05 March 9:30am', 'Dr Smith'],
    ])
    const $ = cheerio.load(html)
    const events = parseCrukLectures($)
    expect(events).toHaveLength(0)
  })

  it('falls back to plain text title when no em/strong', () => {
    const html = makeHtml([
      ['Thursday 05 March 9:30am', 'Dr Smith', 'Lecture Without Formatting'],
    ])
    const $ = cheerio.load(html)
    const events = parseCrukLectures($)
    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Lecture Without Formatting')
  })

  it('returns empty array when no events', () => {
    const $ = cheerio.load('<div>Nothing here</div>')
    expect(parseCrukLectures($)).toHaveLength(0)
  })
})
```

**Step 2: Run to verify they fail**

Run: `npx vitest run api/_scrapers/custom/cruk-lectures.test.js`
Expected: FAIL — tests fail due to existing positional-offset logic producing wrong results

**Step 3: Refactor parseCrukLectures**

Replace `parseCrukLectures` in `api/_scrapers/custom/cruk-lectures.js` with the content-anchored version:

```js
const DATE_RE = /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+\w+/i

export function parseCrukLectures($) {
  const events = []
  const divs = $('div[style*="padding-left"]').toArray()

  const dateIndices = divs.reduce((acc, el, i) => {
    if (DATE_RE.test($(el).text())) acc.push(i)
    return acc
  }, [])

  for (let d = 0; d < dateIndices.length; d++) {
    const dateIdx = dateIndices[d]
    const nextDateIdx = dateIndices[d + 1] ?? divs.length

    const dateText = $(divs[dateIdx]).text().trim()
    const dateMatch = dateText.match(DATE_RE)
    const date = parseDayMonthInfer(dateMatch[0])
    if (!date) continue

    const time = extractTime(dateText)
    const block = divs.slice(dateIdx + 1, nextDateIdx)

    let lectureTitle = ''
    let speaker = ''

    for (const el of block) {
      const elCheerio = $(el)
      const emphText = elCheerio.find('em, strong').text().trim()
      const fullText = elCheerio.text().trim()

      if (!lectureTitle && (emphText || fullText.length > 20)) {
        lectureTitle = emphText || fullText
      } else if (!speaker && fullText.length > 0) {
        speaker = fullText
      }
    }

    if (!lectureTitle) continue

    events.push(
      normalizeEvent({
        title: lectureTitle,
        description: speaker ? `Speaker: ${speaker}` : '',
        date,
        source: SOURCE,
        sourceUrl: EVENTS_URL,
        location: LOCATION,
        time,
        categories: ['Healthcare', 'Research'],
        cost: 'Free',
      })
    )
  }

  return events
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run api/_scrapers/custom/cruk-lectures.test.js`
Expected: All 6 tests PASS

**Step 5: Run full suite to check for regressions**

Run: `npx vitest run`
Expected: Same pass/fail count as before (4 pre-existing failures in dates.test.js and cambridge-network.test.js are unrelated)

**Step 6: Commit**

```bash
git add api/_scrapers/custom/cruk-lectures.js api/_scrapers/custom/cruk-lectures.test.js
git commit -m "fix: refactor CRUK scraper to anchor on date divs, add tests"
```
