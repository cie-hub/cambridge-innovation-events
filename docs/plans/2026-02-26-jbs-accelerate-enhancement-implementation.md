# JBS + Accelerate Cambridge Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the JBS scraper to pass through the API `excerpt` field, flag Accelerate Cambridge events, scrape the AC programme page for richer descriptions, improve `parseDetailPage` to capture more content, and add a pure `assembleDescription` helper that wires all description sources together.

**Architecture:** All changes are confined to `api/_scrapers/custom/judge-business-school.js` and its test file. Four new exported functions (`filterAndParseApiEvents` gains new return fields; `parseDetailPage` gains `li` support; new `parseAcEventListings`; new `assembleDescription`) are each developed TDD before being wired into `scrapeJudgeBusinessSchool` in a final step. Source slug and config stay unchanged.

**Tech Stack:** Node.js, Cheerio, Vitest

---

### Task 1: Add `excerpt` and `isAccelerateCambridge` to `filterAndParseApiEvents` (TDD)

**Files:**
- Modify: `api/_scrapers/custom/judge-business-school.js:1-42`
- Test: `api/_scrapers/custom/judge-business-school.test.js`

**Step 1: Write failing tests**

Open `api/_scrapers/custom/judge-business-school.test.js` and add these four tests inside the existing `describe('filterAndParseApiEvents', ...)` block, after the last existing test:

```js
it('passes through the API excerpt', () => {
  const events = filterAndParseApiEvents(apiFixture.post)
  const female = events.find(e => e.title.includes('Female Founders'))
  expect(female.excerpt).toBe('The 5th Female Founders Day celebrates the power of female-led mentoring.')
})

it('sets isAccelerateCambridge: true for events with category 3285', () => {
  const events = filterAndParseApiEvents(apiFixture.post)
  const female = events.find(e => e.title.includes('Female Founders'))
  expect(female.isAccelerateCambridge).toBe(true)
})

it('sets isAccelerateCambridge: false for non-AC events', () => {
  const events = filterAndParseApiEvents(apiFixture.post)
  const energy = events.find(e => e.title.includes('Energy Policy'))
  expect(energy.isAccelerateCambridge).toBe(false)
})

it('keeps permalink as sourceUrl for AC events', () => {
  const events = filterAndParseApiEvents(apiFixture.post)
  const female = events.find(e => e.title.includes('Female Founders'))
  expect(female.sourceUrl).toBe('https://www.jbs.cam.ac.uk/events/female-founders-day-build-grow-scale/')
})
```

**Step 2: Run to verify they fail**

Run: `npx vitest run api/_scrapers/custom/judge-business-school.test.js`
Expected: FAIL — `Cannot read properties of undefined (reading 'excerpt')`

**Step 3: Implement**

In `api/_scrapers/custom/judge-business-school.js`, add this constant after `ADMISSIONS_CATEGORY_IDS` on line 8:

```js
const ACCELERATE_CATEGORY_ID = '3285'
```

Replace the entire `filterAndParseApiEvents` function (lines 15–42) with:

```js
export function filterAndParseApiEvents(posts) {
  return posts
    .filter((post) => {
      const catIds = [...(post.categoryField || '').matchAll(/data-value="(\d+)"/g)].map(m => m[1])
      return !catIds.some(id => ADMISSIONS_CATEGORY_IDS.has(id))
    })
    .map((post) => {
      const dateObj = new Date(post.start_date * 1000)
      if (isNaN(dateObj.getTime())) return null
      const date = dateObj.toISOString().split('T')[0]

      const catIds = [...(post.categoryField || '').matchAll(/data-value="(\d+)"/g)].map(m => m[1])
      const catNames = [...(post.categoryField || '').matchAll(/data-value="\d+">(.*?)</g)]
        .map(m => m[1].trim())
        .filter(Boolean)

      return {
        title: post.title?.replace(/&amp;/g, '&'),
        excerpt: post.excerpt?.trim() || '',
        date,
        time: post.tbc ? null : (post.time || null),
        sourceUrl: post.permalink,
        categories: catNames,
        access: 'Public',
        isAccelerateCambridge: catIds.includes(ACCELERATE_CATEGORY_ID),
      }
    })
    .filter(Boolean)
}
```

**Step 4: Run to verify all pass**

Run: `npx vitest run api/_scrapers/custom/judge-business-school.test.js`
Expected: All tests PASS (10 total)

**Step 5: Commit**

```bash
git add api/_scrapers/custom/judge-business-school.js api/_scrapers/custom/judge-business-school.test.js
git commit -m "feat: add excerpt and isAccelerateCambridge flag to filterAndParseApiEvents"
```

---

### Task 2: Improve `parseDetailPage` description extraction (TDD)

**Files:**
- Modify: `api/_scrapers/custom/judge-business-school.js:49-67`
- Test: `api/_scrapers/custom/judge-business-school.test.js`

**Step 1: Write failing tests**

Add these two tests inside the existing `describe('parseDetailPage', ...)` block:

```js
it('includes li text from wp-block-group', () => {
  const $ = cheerio.load(`
    <div class="cjbs-event">
      <div class="cjbs-event-top-container"></div>
      <div class="wp-block-group">
        <p>Introduction paragraph text for context.</p>
        <ul>
          <li>Session one: deep dive into product-market fit</li>
          <li>Session two: investor readiness frameworks</li>
        </ul>
      </div>
    </div>
  `)
  const detail = parseDetailPage($)
  expect(detail.description).toContain('product-market fit')
  expect(detail.description).toContain('investor readiness frameworks')
})

it('description is not pre-truncated (no 500-char limit in parseDetailPage)', () => {
  const longText = 'a'.repeat(600)
  const $ = cheerio.load(`
    <div class="cjbs-event">
      <div class="wp-block-group">
        <p>${longText}</p>
      </div>
    </div>
  `)
  const detail = parseDetailPage($)
  expect(detail.description.length).toBe(600)
})
```

**Step 2: Run to verify they fail**

Run: `npx vitest run api/_scrapers/custom/judge-business-school.test.js`
Expected: FAIL — `li` content not found, and the 600-char test fails because the current slice is 500

**Step 3: Implement**

Replace `parseDetailPage` (lines 49–67) with:

```js
export function parseDetailPage($) {
  const location = $('p.event-address.main.bold').first().text().trim() || null

  const ogImage = $('meta[property="og:image"]').attr('content') || ''
  const imageUrl = ogImage.startsWith('http') && !ogImage.includes('cjbs-logo-with-shield')
    ? ogImage
    : null

  const descParts = []
  $('.cjbs-event > div.wp-block-group').each((_i, el) => {
    $(el).find('p, h3, li').each((_j, child) => {
      const text = $(child).text().trim()
      if (text.length > 10) descParts.push(text)
    })
  })
  const description = descParts.join(' ').replace(/\s+/g, ' ').trim()

  return { location, imageUrl, description }
}
```

Note: the `slice(0, 500)` is removed — truncation is now handled by `assembleDescription` in Task 4.

**Step 4: Run to verify all pass**

Run: `npx vitest run api/_scrapers/custom/judge-business-school.test.js`
Expected: All tests PASS (12 total)

**Step 5: Commit**

```bash
git add api/_scrapers/custom/judge-business-school.js api/_scrapers/custom/judge-business-school.test.js
git commit -m "feat: add li support and remove pre-truncation from parseDetailPage"
```

---

### Task 3: Add `parseAcEventListings` for the AC programme page (TDD)

**Files:**
- Create: `api/_scrapers/custom/_fixtures/ac-programme-events.html`
- Modify: `api/_scrapers/custom/judge-business-school.js`
- Test: `api/_scrapers/custom/judge-business-school.test.js`

**Step 1: Create the HTML fixture**

Create `api/_scrapers/custom/_fixtures/ac-programme-events.html` with this content:

```html
<!DOCTYPE html>
<html><body>
<div class="b06Wrapper">
  <div class="b06Box">
    <div class="titleWrapper">
      <div class="b06EventDate">05 March</div>
      <h3 class="b06EventTitle"><a href="https://www.jbs.cam.ac.uk/events/female-founders-day/">Female Founders Day: Build, Grow, Scale</a></h3>
    </div>
    <p class="b06EventExcerpt">A flagship Accelerate Cambridge event celebrating female-led ventures with mentoring sessions and investor pitches.</p>
  </div>
  <div class="b06Box">
    <div class="titleWrapper">
      <div class="b06EventDate">22 April</div>
      <h3 class="b06EventTitle"><a href="https://www.jbs.cam.ac.uk/events/pitch-and-judge-5/">Pitch and Judge #5 – Spring 2026</a></h3>
    </div>
    <p class="b06EventExcerpt">Cohort teams pitch to a panel of Cambridge angels and receive structured feedback on investment readiness.</p>
  </div>
</div>
</body></html>
```

**Step 2: Write failing tests**

Add this new `describe` block to `judge-business-school.test.js`.

First, update the import at line 7 to add `parseAcEventListings`:

```js
import { filterAndParseApiEvents, parseDetailPage, parseAcEventListings } from './judge-business-school.js'
```

Add a fixture loader after `apiFixture`:

```js
const acFixture = readFileSync(resolve(__dirname, '_fixtures/ac-programme-events.html'), 'utf-8')
```

Add the describe block:

```js
describe('parseAcEventListings', () => {
  it('builds a lowercase title→excerpt map from .b06Box cards', () => {
    const $ = cheerio.load(acFixture)
    const map = parseAcEventListings($)
    expect(map.size).toBe(2)
    expect(map.get('female founders day: build, grow, scale')).toBe(
      'A flagship Accelerate Cambridge event celebrating female-led ventures with mentoring sessions and investor pitches.'
    )
  })

  it('lowercases keys for case-insensitive lookup', () => {
    const $ = cheerio.load(acFixture)
    const map = parseAcEventListings($)
    expect(map.has('pitch and judge #5 – spring 2026')).toBe(true)
  })

  it('returns empty map when page has no b06Box cards', () => {
    const $ = cheerio.load('<div>Nothing here</div>')
    expect(parseAcEventListings($).size).toBe(0)
  })
})
```

**Step 3: Run to verify they fail**

Run: `npx vitest run api/_scrapers/custom/judge-business-school.test.js`
Expected: FAIL — `parseAcEventListings is not a function`

**Step 4: Implement**

Add this constant near the top of `judge-business-school.js`, after `ACCELERATE_CATEGORY_ID`:

```js
const ACCELERATE_EVENTS_URL = 'https://www.jbs.cam.ac.uk/entrepreneurship/programmes/accelerate-cambridge/events/'
```

Add the new exported function after `parseDetailPage`:

```js
export function parseAcEventListings($) {
  const map = new Map()
  $('.b06Box').each((_i, el) => {
    const title = $(el).find('.b06EventTitle').text().trim()
    const excerpt = $(el).find('.b06EventExcerpt').text().trim()
    if (title && excerpt) map.set(title.toLowerCase(), excerpt)
  })
  return map
}
```

**Step 5: Run to verify all pass**

Run: `npx vitest run api/_scrapers/custom/judge-business-school.test.js`
Expected: All tests PASS (15 total)

**Step 6: Commit**

```bash
git add api/_scrapers/custom/judge-business-school.js api/_scrapers/custom/judge-business-school.test.js api/_scrapers/custom/_fixtures/ac-programme-events.html
git commit -m "feat: add parseAcEventListings for Accelerate Cambridge programme page"
```

---

### Task 4: Add `assembleDescription` pure helper (TDD)

**Files:**
- Modify: `api/_scrapers/custom/judge-business-school.js`
- Test: `api/_scrapers/custom/judge-business-school.test.js`

This function takes all description sources and returns the best combined result, truncated to 800 chars.

**Step 1: Write failing tests**

Update the import at the top of `judge-business-school.test.js` to add `assembleDescription`:

```js
import { filterAndParseApiEvents, parseDetailPage, parseAcEventListings, assembleDescription } from './judge-business-school.js'
```

Add the describe block:

```js
describe('assembleDescription', () => {
  it('returns detailDescription for non-AC events', () => {
    expect(assembleDescription('Detail text here.', 'API excerpt', false, '', new Map())).toBe('Detail text here.')
  })

  it('falls back to excerpt for non-AC events when detail is empty', () => {
    expect(assembleDescription('', 'API excerpt fallback', false, '', new Map())).toBe('API excerpt fallback')
  })

  it('prepends AC excerpt to detail description for AC events', () => {
    const map = new Map([['my event', 'AC programme excerpt.']])
    const result = assembleDescription('Full detail text here.', 'API excerpt', true, 'My Event', map)
    expect(result).toBe('AC programme excerpt. Full detail text here.')
  })

  it('uses AC excerpt alone when detail is empty for AC events', () => {
    const map = new Map([['my event', 'AC excerpt only.']])
    expect(assembleDescription('', 'API excerpt', true, 'My Event', map)).toBe('AC excerpt only.')
  })

  it('falls back to API excerpt for AC events when both detail and AC map have no match', () => {
    expect(assembleDescription('', 'API excerpt fallback', true, 'Unknown Event', new Map())).toBe('API excerpt fallback')
  })

  it('truncates the combined result to 800 chars', () => {
    const map = new Map([['ev', 'x'.repeat(200)]])
    const result = assembleDescription('y'.repeat(700), '', true, 'ev', map)
    expect(result.length).toBe(800)
  })
})
```

**Step 2: Run to verify they fail**

Run: `npx vitest run api/_scrapers/custom/judge-business-school.test.js`
Expected: FAIL — `assembleDescription is not a function`

**Step 3: Implement**

Add the new exported function after `parseAcEventListings` in `judge-business-school.js`:

```js
export function assembleDescription(detailDescription, excerpt, isAccelerateCambridge, eventTitle, acMap) {
  if (isAccelerateCambridge) {
    const acExcerpt = acMap.get(eventTitle.toLowerCase()) || ''
    if (acExcerpt && detailDescription) {
      return (acExcerpt + ' ' + detailDescription).slice(0, 800)
    }
    return (acExcerpt || detailDescription || excerpt).slice(0, 800)
  }
  return (detailDescription || excerpt).slice(0, 800)
}
```

**Step 4: Run to verify all pass**

Run: `npx vitest run api/_scrapers/custom/judge-business-school.test.js`
Expected: All tests PASS (21 total)

**Step 5: Commit**

```bash
git add api/_scrapers/custom/judge-business-school.js api/_scrapers/custom/judge-business-school.test.js
git commit -m "feat: add assembleDescription helper for JBS + AC description enrichment"
```

---

### Task 5: Wire enrichment into `scrapeJudgeBusinessSchool`

**Files:**
- Modify: `api/_scrapers/custom/judge-business-school.js:69-118` (the scrape function)

No new tests — this is the orchestration layer. Behavior is verified by running the full suite.

**Step 1: Replace `scrapeJudgeBusinessSchool`**

Replace the entire `scrapeJudgeBusinessSchool` function with:

```js
export async function scrapeJudgeBusinessSchool() {
  log.info(SOURCE, 'starting scrape')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  const res = await fetch(API_URL, {
    headers: { 'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)' },
    signal: controller.signal,
  }).finally(() => clearTimeout(timer))
  if (!res.ok) throw new Error(`JBS Events API fetch failed: ${res.status}`)
  const data = await res.json()
  if (!data.post || !Array.isArray(data.post)) {
    throw new Error('JBS Events API returned unexpected shape — missing post array')
  }

  const listings = filterAndParseApiEvents(data.post)
  log.info(SOURCE, `found ${listings.length} non-admissions events, fetching details`)

  let acMap = new Map()
  if (listings.some(l => l.isAccelerateCambridge)) {
    const ac$ = await fetchPage(ACCELERATE_EVENTS_URL)
    acMap = parseAcEventListings(ac$)
    log.info(SOURCE, 'fetched AC programme page', { acEntries: acMap.size })
  }

  const results = await Promise.allSettled(
    listings.map(async (evt) => {
      const detail$ = await fetchPage(evt.sourceUrl)
      const detail = parseDetailPage(detail$)
      const description = assembleDescription(
        detail.description,
        evt.excerpt,
        evt.isAccelerateCambridge,
        evt.title,
        acMap,
      )
      return normalizeEvent({
        title: evt.title,
        description,
        date: evt.date,
        source: SOURCE,
        sourceUrl: evt.sourceUrl,
        categories: evt.categories,
        imageUrl: detail.imageUrl,
        time: evt.time,
        location: detail.location,
        access: evt.access,
      })
    })
  )

  const events = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter(Boolean)

  const rejected = results.filter((r) => r.status === 'rejected')
  if (rejected.length > 0) {
    log.warn(SOURCE, `${rejected.length} detail page fetches failed`)
  }

  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
```

**Step 2: Run full test suite**

Run: `npx vitest run api/_scrapers/custom/judge-business-school.test.js`
Expected: All 21 tests PASS

Run: `npx vitest run`
Expected: Same pass/fail count as before this branch (4 pre-existing failures in `dates.test.js` and `cambridge-network.test.js` are unrelated)

**Step 3: Commit**

```bash
git add api/_scrapers/custom/judge-business-school.js
git commit -m "feat: wire AC programme page enrichment and excerpt fallback into scrapeJudgeBusinessSchool"
```
