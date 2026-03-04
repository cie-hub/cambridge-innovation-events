# Add CRASSH Scraper & Expand Eventbrite Coverage — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a new CRASSH events scraper (AJAX endpoint + detail page enrichment) and expand the Eventbrite scraper to search multiple keywords with deduplication and Cambridge venue filtering.

**Architecture:** CRASSH scraper POSTs to `admin-ajax.php` with `action=screen_events`, paginates HTML fragments, parses with Cheerio, and enriches from detail pages. Eventbrite scraper gains an array of search URLs, deduplicates by event ID, and filters to Cambridge venues.

**Tech Stack:** Node.js ESM, Cheerio, Vitest, fetch API

---

### Task 1: CRASSH listing parser — parse AJAX HTML response

Build and test the pure function that parses the AJAX HTML response into structured event objects.

**Files:**
- Create: `api/_scrapers/custom/crassh.js`
- Create: `api/_scrapers/custom/crassh.test.js`

**Step 1: Write the failing tests**

Create `api/_scrapers/custom/crassh.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { parseListingHtml } from './crassh.js'

const SAMPLE_HTML = `
<div class="events-item" id="event-50260-1" data-date="1772582400">
  <div class="events-image">
    <img src="https://www.crassh.cam.ac.uk/wp-content/uploads/2025/01/geopolitics-540x540.png" alt="Milei talk" loading="lazy">
    <div class="events-type">Talk</div>
  </div>
  <div class="events-body">
    <p>4 Mar 2026</p>
    <h3><a href="https://www.crassh.cam.ac.uk/events/50260/">Milei&#8217;s Economics: Signpost or warning?</a></h3>
  </div>
</div>
<div class="events-item" id="event-48670-7" data-date="1772582400">
  <div class="events-image">
    <img src="https://www.crassh.cam.ac.uk/wp-content/uploads/2025/10/AI-540x540.png" alt="AI workshop" loading="lazy">
    <div class="events-type">Hybrid Event, Seminar</div>
  </div>
  <div class="events-body">
    <p>4 Mar 2026</p>
    <h3><a href="https://www.crassh.cam.ac.uk/events/48670/">AI for Sustainability workshop series</a></h3>
  </div>
</div>
<div class="events-item" id="event-48670-8" data-date="1772668800">
  <div class="events-image">
    <img src="https://www.crassh.cam.ac.uk/wp-content/uploads/2025/10/AI-540x540.png" alt="AI workshop" loading="lazy">
    <div class="events-type">Hybrid Event, Seminar</div>
  </div>
  <div class="events-body">
    <p>5 Mar 2026</p>
    <h3><a href="https://www.crassh.cam.ac.uk/events/48670/">AI for Sustainability workshop series</a></h3>
  </div>
</div>
`

describe('parseListingHtml', () => {
  it('extracts title, date, sourceUrl, imageUrl, eventType from each event', () => {
    const events = parseListingHtml(SAMPLE_HTML)
    expect(events[0]).toEqual({
      eventId: '50260',
      title: "Milei\u2019s Economics: Signpost or warning?",
      date: '2026-03-04',
      sourceUrl: 'https://www.crassh.cam.ac.uk/events/50260/',
      imageUrl: 'https://www.crassh.cam.ac.uk/wp-content/uploads/2025/01/geopolitics-540x540.png',
      eventType: 'Talk',
    })
  })

  it('deduplicates recurring events by eventId, keeping earliest date', () => {
    const events = parseListingHtml(SAMPLE_HTML)
    const aiEvents = events.filter(e => e.eventId === '48670')
    expect(aiEvents).toHaveLength(1)
    expect(aiEvents[0].date).toBe('2026-03-04')
  })

  it('converts unix timestamp to ISO date', () => {
    const events = parseListingHtml(SAMPLE_HTML)
    expect(events[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns empty array for empty HTML', () => {
    expect(parseListingHtml('')).toEqual([])
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run api/_scrapers/custom/crassh.test.js
```

Expected: FAIL — `parseListingHtml` not found.

**Step 3: Write minimal implementation**

Create `api/_scrapers/custom/crassh.js`:

```js
import * as cheerio from 'cheerio'
import { normalizeEvent, fetchPage } from '../_shared/utils.js'
import { log } from '../_shared/log.js'

const AJAX_URL = 'https://www.crassh.cam.ac.uk/wp-admin/admin-ajax.php'
const SOURCE = 'crassh'

export function parseListingHtml(html) {
  const $ = cheerio.load(html)
  const seen = new Map()

  $('.events-item').each((_i, el) => {
    const item = $(el)
    const idAttr = item.attr('id') || ''
    const match = idAttr.match(/^event-(\d+)-/)
    if (!match) return
    const eventId = match[1]

    if (seen.has(eventId)) return

    const unixTs = parseInt(item.attr('data-date'), 10)
    if (!unixTs) return
    const date = new Date(unixTs * 1000).toISOString().split('T')[0]

    const linkEl = item.find('.events-body h3 a')
    const title = linkEl.text().trim()
    const sourceUrl = linkEl.attr('href') || ''
    if (!title || !sourceUrl) return

    const imageUrl = item.find('.events-image img').attr('src') || null
    const eventType = item.find('.events-type').text().trim()

    seen.set(eventId, { eventId, title, date, sourceUrl, imageUrl, eventType })
  })

  return [...seen.values()]
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run api/_scrapers/custom/crassh.test.js
```

Expected: All 4 tests pass.

**Step 5: Commit**

```bash
git add api/_scrapers/custom/crassh.js api/_scrapers/custom/crassh.test.js
git commit -m "feat: add CRASSH listing parser with deduplication"
```

---

### Task 2: CRASSH detail page parser

Parse the detail page for description, time, and location.

**Files:**
- Modify: `api/_scrapers/custom/crassh.js`
- Modify: `api/_scrapers/custom/crassh.test.js`

**Step 1: Write the failing tests**

Append to `crassh.test.js`:

```js
import { parseDetailPage } from './crassh.js'

describe('parseDetailPage', () => {
  it('extracts time, location, and description from detail page', () => {
    const $ = cheerio.load(`
      <article class="page-article pagebuilder">
        <table class="table table--dates">
          <tbody>
            <tr>
              <td class="date">4 Mar 2026</td>
              <td class="time">17:30 - 19:00</td>
              <td class="location" colspan="2">Trinity Hall Lecture Theatre, Trinity Lane, CB2 1TJ</td>
            </tr>
          </tbody>
        </table>
        <section class="tabs">
          <div class="tabs-content tabs-content--current contentArea" id="tab-1">
            <h2 class="tabs-subheading">Description</h2>
            <p>This talk will explore the dramatic economic experiment unfolding in Argentina.</p>
            <h3>About the speaker</h3>
            <p>Dr Irene Mia is Senior Fellow at the International Institute for Strategic Studies.</p>
          </div>
        </section>
      </article>
    `)
    const detail = parseDetailPage($)
    expect(detail.time).toBe('17:30 - 19:00')
    expect(detail.location).toBe('Trinity Hall Lecture Theatre, Trinity Lane, CB2 1TJ')
    expect(detail.description).toContain('dramatic economic experiment')
    expect(detail.description).toContain('Dr Irene Mia')
  })

  it('returns null for missing time and location', () => {
    const $ = cheerio.load(`
      <article class="page-article pagebuilder">
        <table class="table table--dates">
          <tbody><tr><td class="date">4 Mar 2026</td></tr></tbody>
        </table>
        <section class="tabs">
          <div class="tabs-content tabs-content--current contentArea" id="tab-1">
            <p>Short event description text here for the test.</p>
          </div>
        </section>
      </article>
    `)
    const detail = parseDetailPage($)
    expect(detail.time).toBeNull()
    expect(detail.location).toBeNull()
    expect(detail.description).toContain('Short event description')
  })

  it('truncates description to 800 chars', () => {
    const longText = 'a'.repeat(1000)
    const $ = cheerio.load(`
      <article class="page-article pagebuilder">
        <table class="table table--dates"><tbody><tr><td class="date">4 Mar 2026</td></tr></tbody></table>
        <section class="tabs">
          <div class="tabs-content tabs-content--current contentArea" id="tab-1">
            <p>${longText}</p>
          </div>
        </section>
      </article>
    `)
    const detail = parseDetailPage($)
    expect(detail.description.length).toBe(800)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run api/_scrapers/custom/crassh.test.js
```

Expected: FAIL — `parseDetailPage` not exported.

**Step 3: Write implementation**

Add to `api/_scrapers/custom/crassh.js`:

```js
export function parseDetailPage($) {
  const time = $('td.time').first().text().trim() || null
  const location = $('td.location').first().text().trim() || null

  const descParts = []
  $('.tabs-content.contentArea').first().find('p, h3').each((_i, el) => {
    const text = $(el).text().trim()
    if (text.length > 10) descParts.push(text)
  })
  const description = descParts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 800)

  return { time, location, description }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run api/_scrapers/custom/crassh.test.js
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add api/_scrapers/custom/crassh.js api/_scrapers/custom/crassh.test.js
git commit -m "feat: add CRASSH detail page parser for time, location, description"
```

---

### Task 3: CRASSH main scraper function + registration

Wire up the AJAX fetch, pagination, detail page enrichment, and register in config/index.

**Files:**
- Modify: `api/_scrapers/custom/crassh.js`
- Modify: `api/_scrapers/_shared/config.js`
- Modify: `api/_scrapers/index.js`

**Step 1: Write the main scraper function**

Add to `api/_scrapers/custom/crassh.js`:

```js
export async function scrapeCrassh() {
  log.info(SOURCE, 'starting scrape')

  let page = 1
  let allListings = []

  while (page) {
    const res = await fetch(AJAX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)',
      },
      body: `action=screen_events&args[page]=${page}&args[range]=all`,
    })
    if (!res.ok) throw new Error(`CRASSH AJAX failed: ${res.status}`)
    const data = await res.json()

    const listings = parseListingHtml(data.html || '')
    allListings.push(...listings)

    page = data.nextpage || null
  }

  log.info(SOURCE, 'fetched listings', { count: allListings.length })

  const events = []
  for (const listing of allListings) {
    const $ = await fetchPage(listing.sourceUrl)
    const detail = parseDetailPage($)

    events.push(normalizeEvent({
      title: listing.title,
      description: detail.description,
      date: listing.date,
      source: SOURCE,
      sourceUrl: listing.sourceUrl,
      time: detail.time,
      location: detail.location || 'CRASSH, Alison Richard Building, 7 West Road, Cambridge',
      imageUrl: listing.imageUrl,
      access: 'Public',
    }))
  }

  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events.filter(Boolean)
}
```

**Step 2: Register in config.js**

In `api/_scrapers/_shared/config.js`:

Add `'crassh'` to batch 7 (currently only has `meetup-cambridge`):

```js
7: ['meetup-cambridge', 'crassh'],
```

Add to `sources` object:

```js
'crassh': {
  name: 'CRASSH',
  url: 'https://www.crassh.cam.ac.uk/events/',
  description: 'Centre for Research in the Arts, Social Sciences and Humanities — seminars, lectures, and workshops',
},
```

**Step 3: Register in index.js**

Add import at top of `api/_scrapers/index.js`:

```js
import { scrapeCrassh } from './custom/crassh.js'
```

Add to `scrapers` object:

```js
'crassh': scrapeCrassh,
```

**Step 4: Run all tests**

```bash
npm run test:run
```

Expected: All tests pass (pre-existing date timezone failures excluded).

**Step 5: Commit**

```bash
git add api/_scrapers/custom/crassh.js api/_scrapers/_shared/config.js api/_scrapers/index.js
git commit -m "feat: wire up CRASSH scraper with AJAX pagination and detail enrichment"
```

---

### Task 4: Expand Eventbrite scraper — multi-keyword search with dedup and city filter

**Files:**
- Modify: `api/_scrapers/eventbrite/eventbrite-cambridge.js`
- Create: `api/_scrapers/eventbrite/eventbrite-cambridge.test.js`

**Step 1: Write the failing tests**

Create `api/_scrapers/eventbrite/eventbrite-cambridge.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { extractEvents, deduplicateById } from './eventbrite-cambridge.js'

describe('extractEvents', () => {
  it('extracts event data from __SERVER_DATA__ results array', () => {
    const results = [{
      id: '123',
      name: 'Test Event',
      summary: 'A test event description',
      start_date: '2026-03-11T00:00:00',
      start_time: '18:00',
      end_time: '20:00',
      url: 'https://www.eventbrite.co.uk/e/test-123',
      primary_venue: { name: 'The Red Lion', address: { city: 'Cambridge' } },
      image: { url: 'https://img.evbuc.com/test.jpg' },
      is_free: true,
    }]
    const events = extractEvents(results)
    expect(events).toHaveLength(1)
    expect(events[0].id).toBe('123')
    expect(events[0].title).toBe('Test Event')
    expect(events[0].date).toBe('2026-03-11')
    expect(events[0].city).toBe('Cambridge')
  })

  it('filters out events not in Cambridge', () => {
    const results = [
      { id: '1', name: 'Cambridge Event', start_date: '2026-03-11T00:00:00', primary_venue: { address: { city: 'Cambridge' } } },
      { id: '2', name: 'Stevenage Event', start_date: '2026-03-11T00:00:00', primary_venue: { address: { city: 'Stevenage' } } },
      { id: '3', name: 'No Venue Event', start_date: '2026-03-11T00:00:00' },
    ]
    const events = extractEvents(results)
    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Cambridge Event')
  })

  it('skips events with missing name or start_date', () => {
    const results = [
      { id: '1', start_date: '2026-03-11T00:00:00', primary_venue: { address: { city: 'Cambridge' } } },
      { id: '2', name: 'Good Event', primary_venue: { address: { city: 'Cambridge' } } },
    ]
    expect(extractEvents(results)).toHaveLength(0)
  })
})

describe('deduplicateById', () => {
  it('removes duplicate events by id', () => {
    const events = [
      { id: '1', title: 'Event A' },
      { id: '2', title: 'Event B' },
      { id: '1', title: 'Event A duplicate' },
    ]
    const deduped = deduplicateById(events)
    expect(deduped).toHaveLength(2)
    expect(deduped[0].title).toBe('Event A')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run api/_scrapers/eventbrite/eventbrite-cambridge.test.js
```

Expected: FAIL — `extractEvents` and `deduplicateById` not found.

**Step 3: Refactor eventbrite-cambridge.js**

Rewrite `api/_scrapers/eventbrite/eventbrite-cambridge.js`:

```js
import { normalizeEvent } from '../_shared/utils.js'
import { log } from '../_shared/log.js'

const SEARCH_URLS = [
  'https://www.eventbrite.co.uk/d/united-kingdom--cambridge/innovation/',
  'https://www.eventbrite.co.uk/d/united-kingdom--cambridge/business-networking/',
]
const SOURCE = 'eventbrite-cambridge'

function parseServerData(html) {
  const marker = 'window.__SERVER_DATA__ = '
  const idx = html.indexOf(marker)
  if (idx === -1) return null

  const start = idx + marker.length
  let depth = 0
  let end = start
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++
    else if (html[i] === '}') { depth--; if (depth === 0) { end = i + 1; break } }
  }

  return JSON.parse(html.slice(start, end))
}

export function extractEvents(results) {
  const events = []
  for (const evt of results) {
    if (!evt.name || !evt.start_date) continue

    const city = evt.primary_venue?.address?.city || ''
    if (!city.toLowerCase().includes('cambridge')) continue

    const startDate = new Date(evt.start_date)
    if (isNaN(startDate.getTime())) continue

    let time = null
    if (evt.start_time && evt.end_time) {
      time = `${evt.start_time} - ${evt.end_time}`
    }

    let cost = null
    if (evt.ticket_availability?.minimum_ticket_price?.major_value === '0' || evt.is_free) {
      cost = 'Free'
    } else if (evt.ticket_availability?.minimum_ticket_price?.display) {
      cost = evt.ticket_availability.minimum_ticket_price.display
    }

    events.push({
      id: evt.id,
      title: evt.name,
      description: evt.summary || '',
      date: startDate.toISOString().split('T')[0],
      time,
      location: evt.primary_venue?.name || city,
      city,
      imageUrl: evt.image?.url || null,
      sourceUrl: evt.url || `https://www.eventbrite.co.uk/e/${evt.id}`,
      cost,
    })
  }
  return events
}

export function deduplicateById(events) {
  const seen = new Map()
  for (const evt of events) {
    if (!seen.has(evt.id)) seen.set(evt.id, evt)
  }
  return [...seen.values()]
}

export async function scrapeEventbriteCambridge() {
  log.info(SOURCE, 'starting scrape')

  let allRaw = []
  for (const url of SEARCH_URLS) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)' },
    })
    if (!res.ok) {
      log.warn(SOURCE, `Failed to fetch ${url}: ${res.status}`)
      continue
    }
    const html = await res.text()
    const serverData = parseServerData(html)
    const results = serverData?.search_data?.events?.results
    if (Array.isArray(results)) {
      allRaw.push(...extractEvents(results))
    }
  }

  const unique = deduplicateById(allRaw)
  log.info(SOURCE, 'deduplicated events', { raw: allRaw.length, unique: unique.length })

  const events = unique.map(evt => normalizeEvent({
    title: evt.title,
    description: evt.description,
    date: evt.date,
    source: SOURCE,
    sourceUrl: evt.sourceUrl,
    location: evt.location,
    time: evt.time,
    imageUrl: evt.imageUrl,
    cost: evt.cost,
    access: 'Registration Required',
    categories: ['Innovation'],
  }))

  log.info(SOURCE, 'scrape complete', { events: events.length })
  return events
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run api/_scrapers/eventbrite/eventbrite-cambridge.test.js
```

Expected: All 5 tests pass.

**Step 5: Run full suite to verify no regressions**

```bash
npm run test:run
```

Expected: All tests pass (pre-existing date timezone failures excluded).

**Step 6: Commit**

```bash
git add api/_scrapers/eventbrite/eventbrite-cambridge.js api/_scrapers/eventbrite/eventbrite-cambridge.test.js
git commit -m "feat: expand Eventbrite scraper with business-networking search, dedup, and Cambridge city filter"
```
