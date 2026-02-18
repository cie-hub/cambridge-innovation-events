# Contributing

By submitting a pull request you agree that your contribution is licensed under the [Apache 2.0 licence](LICENSE).

## Adding a New Scraper

This guide walks you through adding a new event source to the Cambridge Innovation Event Links Hub.

## Prerequisites

- Node.js 20+
- `npm install` to get dependencies
- Read an existing scraper (e.g., `api/_scrapers/custom/st-johns.js`) to see the pattern

## Step-by-Step

### 1. Choose your source

Pick an event source in the Cambridge innovation ecosystem. Check `api/_scrapers/_shared/config.js` to make sure it's not already scraped.

### 2. Pick the right folder

| Folder | When to use |
|--------|------------|
| `eventbrite/` | Source uses Eventbrite (organizer pages or search) |
| `luma/` | Source uses lu.ma calendars |
| `meetup/` | Source uses Meetup.com groups |
| `tribe-events/` | Source uses The Events Calendar WordPress plugin |
| `custom/` | Everything else (HTML scraping, custom APIs, RSS) |

### 3. Copy the template

```bash
cp api/_scrapers/_template/scraper-template.js api/_scrapers/custom/your-source.js
cp api/_scrapers/_template/scraper-template.test.js api/_scrapers/custom/your-source.test.js
```

### 4. Capture a fixture

```bash
curl -s "https://your-source.com/events" > api/_scrapers/custom/_fixtures/your-source.html
```

For JSON APIs:
```bash
curl -s "https://api.your-source.com/events" > api/_scrapers/custom/_fixtures/your-source.json
```

### 5. Write your test first

Update the test file to import your parse function and load your fixture. Add assertions for:
- Event count matches fixture
- Required fields present (title, date, sourceUrl)
- First event matches expected values

### 6. Implement the parser

Update your scraper to:
- Use `fetchPage(url)` from `../_shared/utils.js` for HTML sources
- Use `normalizeEvent({...})` to normalize every event
- Extract all fields: **title**, **date**, **time**, **location**, **description**, **imageUrl**, **sourceUrl**
- Use `log.info/warn/error` from `../_shared/log.js`

### 7. Register the source

Add to `api/_scrapers/_shared/config.js`:

```js
// In sources:
'your-source': {
  name: 'Your Source Name',
  url: 'https://your-source.com',
  description: 'One-line description',
},

// In batches — pick the batch with the fewest sources:
```

Add to `api/_scrapers/index.js`:
```js
import { scrapeYourSource } from './custom/your-source.js'
// ... in the scrapers object:
'your-source': scrapeYourSource,
```

### 8. Run tests

```bash
npx vitest run api/_scrapers/custom/your-source.test.js
```

### 9. Submit a PR

Include:
- Your scraper file
- Your test file
- Your fixture file
- Updated config.js and index.js

## Event Field Reference

| Field | Required | Notes |
|-------|----------|-------|
| `title` | Yes | Event name |
| `date` | Yes | YYYY-MM-DD string |
| `source` | Yes | Your source slug |
| `sourceUrl` | Yes | Link to original event page |
| `description` | Recommended | Max 500 chars |
| `location` | Recommended | Venue name and/or address |
| `time` | Recommended | e.g., "17:30 - 20:00" |
| `imageUrl` | Recommended | og:image, event thumbnail, etc. |
| `cost` | Optional | "Free" or price string |
| `access` | Optional | "Open to All", "Open to Members", etc. |

## Batch Assignment

Batches run on separate cron ticks. Pick the batch with the fewest sources to balance load. Check current batch sizes in `_shared/config.js`.
