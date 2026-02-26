# JBS Description Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix `parseDetailPage` to use a selector that actually matches real JBS event pages, and combine the API excerpt with detail page text for all events.

**Architecture:** Two targeted edits to `judge-business-school.js` — one selector change in `parseDetailPage`, one logic change in `assembleDescription` — plus test updates to replace synthetic `.cjbs-event` wrappers with `<main>` wrappers that reflect real-world HTML.

**Tech Stack:** Cheerio (HTML parsing), Vitest (tests), Node.js ESM

---

### Task 1: Fix `parseDetailPage` selector and update its tests

The selector `.cjbs-event > div.wp-block-group` matches nothing on real JBS pages because the class `cjbs-event` doesn't exist in page HTML. Fix: use `main .wp-block-group` instead. Update tests that use the old wrapper.

**Files:**
- Modify: `api/_scrapers/custom/judge-business-school.js:55-63`
- Modify: `api/_scrapers/custom/judge-business-school.test.js:123-171`

---

**Step 1: Write the failing tests (real-world HTML shape)**

In `judge-business-school.test.js`, replace the three description-related tests (lines 123–171) with updated HTML that uses `<main>` instead of `<div class="cjbs-event">`. The existing location and og:image tests (lines 83–121) do NOT need changing — their selectors don't depend on `.cjbs-event`.

Replace the block at lines 123–171 with:

```js
  it('extracts description from main .wp-block-group paragraphs', () => {
    const $ = cheerio.load(`
      <main>
        <div class="wp-block-group">
          <h3>Speaker: Dr Jane Smith, University of Cambridge</h3>
          <p>This workshop explores advanced methods in supply chain transparency.</p>
        </div>
        <div class="wp-block-group">
          <p>No registration required.</p>
        </div>
      </main>
    `)
    const detail = parseDetailPage($)
    expect(detail.description).toContain('Speaker: Dr Jane Smith')
    expect(detail.description).toContain('supply chain transparency')
  })

  it('includes li text from wp-block-group inside main', () => {
    const $ = cheerio.load(`
      <main>
        <div class="wp-block-group">
          <p>Introduction paragraph text for context.</p>
          <ul>
            <li>Session one: deep dive into product-market fit</li>
            <li>Session two: investor readiness frameworks</li>
          </ul>
        </div>
      </main>
    `)
    const detail = parseDetailPage($)
    expect(detail.description).toContain('product-market fit')
    expect(detail.description).toContain('investor readiness frameworks')
  })

  it('description is not pre-truncated — returns full scraped text', () => {
    const longText = 'a'.repeat(900)
    const $ = cheerio.load(`
      <main>
        <div class="wp-block-group">
          <p>${longText}</p>
        </div>
      </main>
    `)
    const detail = parseDetailPage($)
    expect(detail.description.length).toBe(900)
  })

  it('returns empty description when no main element exists', () => {
    const $ = cheerio.load(`
      <div class="wp-block-group">
        <p>Content not inside main — should not be captured.</p>
      </div>
    `)
    const detail = parseDetailPage($)
    expect(detail.description).toBe('')
  })
```

**Step 2: Run the tests and verify they fail**

```bash
npx vitest run api/_scrapers/custom/judge-business-school.test.js
```

Expected: The three description tests fail with `expected '' to contain 'Speaker: Dr Jane Smith'` (because the selector still uses `.cjbs-event`). The new "no main element" test may pass accidentally. That's fine.

**Step 3: Change the selector in `parseDetailPage`**

In `api/_scrapers/custom/judge-business-school.js`, change line 55:

```js
// Before:
$('.cjbs-event > div.wp-block-group').each((_i, el) => {

// After:
$('main .wp-block-group').each((_i, el) => {
```

The full updated function body (lines 46–64):

```js
export function parseDetailPage($) {
  const location = $('p.event-address.main.bold').first().text().trim() || null

  const ogImage = $('meta[property="og:image"]').attr('content') || ''
  const imageUrl = ogImage.startsWith('http') && !ogImage.includes('cjbs-logo-with-shield')
    ? ogImage
    : null

  const descParts = []
  $('main .wp-block-group').each((_i, el) => {
    $(el).find('p, h3, li').each((_j, child) => {
      const text = $(child).text().trim()
      if (text.length > 10) descParts.push(text)
    })
  })
  const description = descParts.join(' ').replace(/\s+/g, ' ').trim()

  return { location, imageUrl, description }
}
```

**Step 4: Run the tests and verify they pass**

```bash
npx vitest run api/_scrapers/custom/judge-business-school.test.js
```

Expected: All tests in the `parseDetailPage` describe block pass. Overall suite passes.

**Step 5: Commit**

```bash
git add api/_scrapers/custom/judge-business-school.js api/_scrapers/custom/judge-business-school.test.js
git commit -m "fix: use main .wp-block-group selector in parseDetailPage

The .cjbs-event class does not exist in real JBS page HTML — only in the
GTM data layer — so the old selector produced empty descriptions. Switch
to main .wp-block-group which correctly scopes to the event content area.
Update tests to use <main> wrapper to match real-world HTML structure."
```

---

### Task 2: Combine API excerpt with detail text for all events

Currently non-AC events use `(detailDescription || excerpt)` — excerpt is only a fallback when detail is empty. After Task 1, `detailDescription` will always be non-empty, silently discarding the API excerpt. Change `assembleDescription` so non-AC events combine excerpt + detail when both exist, matching the AC pattern.

**Files:**
- Modify: `api/_scrapers/custom/judge-business-school.js:76-85`
- Modify: `api/_scrapers/custom/judge-business-school.test.js:196-225`

---

**Step 1: Write the failing test**

In `judge-business-school.test.js`, add a new test inside the `assembleDescription` describe block (after line 202, "falls back to excerpt for non-AC events when detail is empty"):

```js
  it('combines excerpt and detail for non-AC events when both exist', () => {
    const result = assembleDescription('Full detail text here.', 'API excerpt lead.', false, '', new Map())
    expect(result).toBe('API excerpt lead. Full detail text here.')
  })

  it('truncates combined excerpt+detail to 800 chars for non-AC events', () => {
    const result = assembleDescription('y'.repeat(700), 'x'.repeat(200), false, '', new Map())
    expect(result.length).toBe(800)
  })
```

**Step 2: Run the tests and verify the new tests fail**

```bash
npx vitest run api/_scrapers/custom/judge-business-school.test.js
```

Expected: "combines excerpt and detail for non-AC events when both exist" fails — currently returns `'Full detail text here.'` instead of `'API excerpt lead. Full detail text here.'`.

**Step 3: Update `assembleDescription`**

In `api/_scrapers/custom/judge-business-school.js`, replace the non-AC return at line 84:

```js
// Before:
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

// After:
export function assembleDescription(detailDescription, excerpt, isAccelerateCambridge, eventTitle, acMap) {
  if (isAccelerateCambridge) {
    const acExcerpt = acMap.get(eventTitle.toLowerCase()) || ''
    if (acExcerpt && detailDescription) {
      return (acExcerpt + ' ' + detailDescription).slice(0, 800)
    }
    return (acExcerpt || detailDescription || excerpt).slice(0, 800)
  }
  if (excerpt && detailDescription) {
    return (excerpt + ' ' + detailDescription).slice(0, 800)
  }
  return (detailDescription || excerpt).slice(0, 800)
}
```

**Step 4: Run all tests and verify they pass**

```bash
npx vitest run api/_scrapers/custom/judge-business-school.test.js
```

Expected: All tests pass, including the two new `assembleDescription` tests.

Run the full suite to confirm no regressions:

```bash
npm run test:run
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add api/_scrapers/custom/judge-business-school.js api/_scrapers/custom/judge-business-school.test.js
git commit -m "feat: combine API excerpt with detail page text for all JBS events

Non-AC events now prepend the API excerpt before the detail page
description when both are present, consistent with AC event handling.
This ensures the concise API summary is always included alongside the
richer scraped body text."
```
