# Google Indexing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the three blockers preventing camevents.org from being indexed by Google, and add JSON-LD structured data to strengthen content signals.

**Architecture:** Static file fixes (canonical, robots.txt, sitemap.xml) remove the indexing blockers. A `useEffect` in `AppContent` in `src/App.jsx` injects a JSON-LD `ItemList` of `Event` schema objects into the document head after events load — no library needed.

**Tech Stack:** Plain HTML edits, React `useEffect`, schema.org JSON-LD

---

### Task 1: Fix canonical and OG URLs in index.html

**Files:**
- Modify: `index.html:9,11,17,18,19,27`

**Step 1: Make the changes**

In `index.html`, replace every `events.chepaldin.com` reference and update the meta description:

Change line 9:
```html
<meta name="description" content="All Cambridge innovation and startup event links in one place" />
```
To:
```html
<meta name="description" content="camevents.org aggregates innovation, startup, and research events across Cambridge — scraped daily from 26 sources including Judge Business School, Cambridge Science Park, Eventbrite, and more." />
```

Change line 11:
```html
<link rel="canonical" href="https://events.chepaldin.com" />
```
To:
```html
<link rel="canonical" href="https://camevents.org" />
```

Change line 17:
```html
<meta property="og:description" content="All Cambridge innovation and startup event links in one place" />
```
To:
```html
<meta property="og:description" content="camevents.org aggregates innovation, startup, and research events across Cambridge — scraped daily from 26 sources including Judge Business School, Cambridge Science Park, Eventbrite, and more." />
```

Change line 18:
```html
<meta property="og:url" content="https://events.chepaldin.com" />
```
To:
```html
<meta property="og:url" content="https://camevents.org" />
```

Change line 19:
```html
<meta property="og:image" content="https://events.chepaldin.com/og.png" />
```
To:
```html
<meta property="og:image" content="https://camevents.org/og.png" />
```

Change line 27:
```html
<meta name="twitter:image" content="https://events.chepaldin.com/og.png" />
```
To:
```html
<meta name="twitter:image" content="https://camevents.org/og.png" />
```

Also update twitter:description (line 26) to match:
```html
<meta name="twitter:description" content="camevents.org aggregates innovation, startup, and research events across Cambridge — scraped daily from 26 sources including Judge Business School, Cambridge Science Park, Eventbrite, and more." />
```

**Step 2: Verify no chepaldin.com references remain**

Run: `grep -r "chepaldin" index.html`
Expected: no output

**Step 3: Commit**

```bash
git add index.html
git commit -m "fix: update canonical and OG URLs to camevents.org"
```

---

### Task 2: Add robots.txt

**Files:**
- Create: `public/robots.txt`

**Step 1: Create the file**

```
User-agent: *
Allow: /
Sitemap: https://camevents.org/sitemap.xml
```

**Step 2: Verify it will be served**

Run: `npx vite build && ls dist/robots.txt`
Expected: `dist/robots.txt` exists (Vite copies everything from `public/` to `dist/`)

**Step 3: Commit**

```bash
git add public/robots.txt
git commit -m "feat: add robots.txt"
```

---

### Task 3: Add sitemap.xml

**Files:**
- Create: `public/sitemap.xml`

**Step 1: Create the file**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://camevents.org/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

**Step 2: Verify it will be served**

Run: `ls dist/sitemap.xml`
Expected: `dist/sitemap.xml` exists

**Step 3: Commit**

```bash
git add public/sitemap.xml
git commit -m "feat: add sitemap.xml"
```

---

### Task 4: Inject JSON-LD structured data

**Files:**
- Modify: `src/App.jsx`

**Step 1: Add the useEffect to AppContent**

`AppContent` in `src/App.jsx` already has access to `events` from `useEvents()`. Add a `useEffect` import and the injection logic.

Change line 1:
```js
import { useState } from 'react'
```
To:
```js
import { useState, useEffect } from 'react'
```

Add this block inside `AppContent`, after the existing state/hook declarations (after line 24, before the `return`):

```js
  useEffect(() => {
    if (!events.length) return

    const existing = document.getElementById('ld-json')
    if (existing) existing.remove()

    const script = document.createElement('script')
    script.id = 'ld-json'
    script.type = 'application/ld+json'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Cambridge Innovation Events',
      description: 'Innovation, startup, and research events across Cambridge scraped from 26 sources.',
      url: 'https://camevents.org',
      itemListElement: events.slice(0, 100).map((event, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Event',
          name: event.title,
          startDate: event.date,
          url: event.sourceUrl,
          location: event.location
            ? { '@type': 'Place', name: event.location }
            : undefined,
          organizer: {
            '@type': 'Organization',
            name: event.source,
          },
        },
      })),
    })
    document.head.appendChild(script)

    return () => {
      document.getElementById('ld-json')?.remove()
    }
  }, [events])
```

Note: `slice(0, 100)` — keep the JSON-LD payload reasonable. The full event list can be 200+ items and a very large JSON-LD block adds no SEO value.

**Step 2: Verify build succeeds**

Run: `npx vite build`
Expected: Build succeeds with no errors

**Step 3: Verify JSON-LD appears in browser**

Run: `npm run dev`

Open browser dev tools → Elements → `<head>`. After events load (~1s), a `<script id="ld-json" type="application/ld+json">` tag should appear with the ItemList JSON.

**Step 4: Validate the schema**

Copy the JSON from the script tag and paste into: https://validator.schema.org/
Expected: No errors on Event and ItemList types.

**Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: inject JSON-LD Event structured data after events load"
```

---

### Task 5: Deploy and resubmit to Google

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Build**

Run: `npx vite build`
Expected: Build succeeds

**Step 3: Deploy**

Run: `npx vercel --prod`
Expected: Deployment URL printed, production updated

**Step 4: Verify live files**

Check these URLs in the browser:
- `https://camevents.org/robots.txt` — should show robots content
- `https://camevents.org/sitemap.xml` — should show XML
- `https://camevents.org` → view source → canonical should be `https://camevents.org`

**Step 5: Resubmit in Google Search Console**

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. URL inspection → enter `https://camevents.org/`
3. Click "Request indexing"
4. Check back in 3–7 days
