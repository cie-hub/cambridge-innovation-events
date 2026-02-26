# JBS + Accelerate Cambridge Enhancement Design

## Overview

Two problems to fix: (1) The JBS scraper discards the API `excerpt` field and uses a narrow description selector, producing weak event descriptions. (2) Accelerate Cambridge events are indistinguishable from general JBS events and lack programme-specific enrichment. Additionally, deploy the existing `fix-CRUK` normalizeEvent entity-decoding fix and re-scrape all sources to update stale MongoDB records.

## Bug 1: Weak JBS event descriptions

**Root cause:** `filterAndParseApiEvents` discards the `excerpt` field from each API post. `parseDetailPage` only picks up paragraphs from `.cjbs-event > div.wp-block-group` and caps at 500 chars, missing intro paragraphs in `.cjbs-event-top-container` and bullet-list agenda items in `li` elements. When the detail page yields little text, the stored description is empty.

**Fix:**
- Add `excerpt` to the `filterAndParseApiEvents` return object (it's a clean one-liner already in the API response).
- In `scrapeJudgeBusinessSchool`, use `excerpt` as the description fallback when the detail page returns empty, or prepend it as a lead sentence when both exist (`excerpt + '. ' + detailDesc`).
- In `parseDetailPage`, expand the selector to also match `.cjbs-event-top-container p` (intro text) and `li` elements (bullet agendas).
- Raise the description slice from 500 → 800 chars.

## Bug 2: Accelerate Cambridge events lack programme-specific enrichment

**Root cause:** The JBS API returns Accelerate Cambridge events (category `3285`) mixed with all other JBS events. They pass through the same enrichment path and get the individual event permalink as `sourceUrl`, giving no indication they belong to the Accelerate Cambridge programme.

**Fix:**
- In `filterAndParseApiEvents`, detect category `3285` and set an `isAccelerateCambridge: true` flag.
- For flagged events, set `sourceUrl` to `https://www.jbs.cam.ac.uk/entrepreneurship/programmes/accelerate-cambridge/events/`.
- Fetch the AC programme page **once** per scrape run. Parse `.b06Box` cards to build a `title → acExcerpt` map from the `.b06EventExcerpt` text. When enriching an AC event, use the AC page excerpt as a higher-priority description source (combined with detail page content).
- All events remain under `source: 'judge-business-school'` — no new source slug.

## Task 3: HTML entity fix in existing MongoDB data

The `fix-CRUK` branch already adds `decodeEntities` to `normalizeEvent`, applied to `title` and `description`. Deploying that branch and re-running all scraper batches is sufficient — the `scrape.js` upsert matches by `hash` (computed from the raw pre-decoded title), so each re-scrape overwrites existing records with decoded field values. No migration script needed.
