# Add CRASSH Scraper & Expand Eventbrite Coverage — Design

## Problem

Two gaps in our event coverage:
1. CRASSH (Centre for Research in the Arts, Social Sciences and Humanities) runs academic seminars, lectures, and workshops at the Alison Richard Building in Cambridge. Not currently scraped. Their events page loads via AJAX, but the endpoint is public and returns structured HTML fragments.
2. Our Eventbrite scraper only searches for "innovation" events, missing business networking events like Collective Advantage Network's "Hot Stories" at The Red Lion Cambridge.

## Change 1: New CRASSH scraper

**Source:** `crassh`
**Endpoint:** `POST https://www.crassh.cam.ac.uk/wp-admin/admin-ajax.php`
**Parameters:** `action=screen_events&args[page]=1&args[range]=all`

The endpoint returns JSON with an `html` field containing pre-rendered event cards, plus `nextpage` for pagination (null when done).

Each event card in the HTML has this structure:
```html
<div class="events-item" id="event-{ID}-{INSTANCE}" data-date="{UNIX_TS}">
  <div class="events-image">
    <img src="..." alt="...">
    <div class="events-type">Seminar</div>
  </div>
  <div class="events-body">
    <p>4 Mar 2026</p>
    <h3><a href="https://www.crassh.cam.ac.uk/events/{ID}/">Title</a></h3>
  </div>
</div>
```

**Scraper approach:**
1. POST to the AJAX endpoint, paginate until `nextpage` is null
2. Parse each `.events-item` with Cheerio to extract: title, date (from `data-date` unix timestamp), sourceUrl, imageUrl, event type
3. Fetch each detail page for description and location (same enrichment pattern as JBS)
4. Deduplicate recurring events by event ID (same event, different instances share the same ID)
5. Location is always "CRASSH, Alison Richard Building, 7 West Road, Cambridge" unless the detail page says otherwise

**Files:**
- Create: `api/_scrapers/custom/crassh.js`
- Create: `api/_scrapers/custom/crassh.test.js`
- Modify: `api/_scrapers/_shared/config.js` — add `crassh` source + batch assignment
- Modify: `api/_scrapers/index.js` — register scraper

## Change 2: Expand Eventbrite scraper with multiple search keywords

**Current:** Searches `/d/united-kingdom--cambridge/innovation/` only.
**New:** Also search `/d/united-kingdom--cambridge/business-networking/`.

**Changes to `eventbrite-cambridge.js`:**
1. Define an array of search URLs instead of a single URL
2. Fetch all search URLs
3. Deduplicate results by Eventbrite event ID (events may appear in multiple searches)
4. Filter to Cambridge-area venues only: check `primary_venue.address.city` contains "Cambridge" (the business-networking search returns Stevenage, Bishop's Stortford, etc.)

**Files:**
- Modify: `api/_scrapers/eventbrite/eventbrite-cambridge.js`
- Modify: `api/_scrapers/eventbrite/eventbrite-cambridge.test.js` (if exists, or create)
