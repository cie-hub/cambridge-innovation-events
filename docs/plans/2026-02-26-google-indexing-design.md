# Google Indexing Design

## Problem

camevents.org is "crawled but not indexed" in Google Search Console. Root cause: canonical URL points to the old domain `events.chepaldin.com`, causing Google to treat camevents.org as a duplicate and defer indexing to the old URL.

## Goal

Homepage ranks for discovery searches like "Cambridge innovation events". No individual event pages needed.

## Approach B: Fix Blockers + Structured Data

### Part 1: Fix the Blockers

**`index.html` changes:**
- Canonical: `https://events.chepaldin.com` → `https://camevents.org`
- OG URL: same fix
- OG image URL: same fix
- Meta description: replace thin copy with:
  > "camevents.org aggregates innovation, startup, and research events across Cambridge — scraped daily from 26 sources including Judge Business School, Cambridge Science Park, Eventbrite, and more."

**`public/robots.txt`** (new file):
```
User-agent: *
Allow: /
Sitemap: https://camevents.org/sitemap.xml
```

**`public/sitemap.xml`** (new file):
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

### Part 2: Structured Data (JSON-LD)

A `useEffect` in `App.jsx` injects a `<script type="application/ld+json">` tag after events load.

Schema: `ItemList` containing `Event` objects:

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Cambridge Innovation Events",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "Event",
        "name": "Event Title",
        "startDate": "2026-03-04T15:00:00",
        "location": { "@type": "Place", "name": "Maxwell Centre" },
        "url": "https://source-url",
        "organizer": { "@type": "Organization", "name": "Maxwell Centre" }
      }
    }
  ]
}
```

**Implementation:** Single `useEffect` watching the `events` array. Removes any existing JSON-LD script tag, then injects the new one. No library needed.

## After Deploy

1. Resubmit `https://camevents.org/` in Google Search Console URL inspection → Request indexing
2. Check back in 3–7 days
