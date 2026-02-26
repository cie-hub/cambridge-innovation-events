# CRUK + HTML Entity Fix Design

## Bug 1: CRUK scraper broken titles

**Root cause:** The scraper walks `div[style*="padding-left"]` elements using a fixed positional offset (`i`, `i+1`, `i+2` = date, speaker, title). When any event block has a different number of divs, the offset cascades — date-header text gets misidentified as a lecture title, producing cards with titles like "Thursday 26 February 9:30am".

**Fix:** Find all date-header divs by content pattern first. For each date div, treat everything between it and the next date div as the event block. Within that block, identify speaker (first short text div) and title (div with `<em>`/`<strong>` or first substantial text). No positional offsets.

## Bug 2: HTML entities in titles and descriptions

**Root cause:** `normalizeEvent` in `_shared/utils.js` applies `sanitizeLocation()` (which decodes `&#NNNN;`, `&amp;`, `&lt;` etc.) to the `location` field only. `title` and `description` pass through raw, so scrapers that return HTML-encoded text produce literal `&#8211;` on screen.

**Fix:** Extract the entity-decoding logic from `sanitizeLocation` into a `decodeEntities(str)` helper. Apply it to `title` and `description` inside `normalizeEvent`. No scraper changes needed.
