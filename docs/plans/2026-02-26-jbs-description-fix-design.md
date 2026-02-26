# JBS Description Fix Design

## Problem

`parseDetailPage` in `judge-business-school.js` produces an empty `description` for every real JBS event page. The selector `.cjbs-event > div.wp-block-group` matches zero elements because the class `cjbs-event` does not exist in JBS page HTML — it only appears in the GTM/analytics data layer (`pagePostType: "cjbs_event"`). Tests pass because they use synthetic HTML with a hand-crafted `.cjbs-event` wrapper, masking the real-world failure.

The `og:image` extraction is unaffected and already works correctly.

## Fix 1: Correct the description selector

**Change:** `.cjbs-event > div.wp-block-group` → `main .wp-block-group`

The `<main>` HTML5 element is present on all JBS event pages and scopes to the main content area, excluding header/footer/nav. The event description paragraphs, headings, and list items live inside `div.wp-block-group` elements within `<main>`.

No truncation is applied inside `parseDetailPage` — description assembly and 800-char capping happen in `assembleDescription`.

## Fix 2: Combine API excerpt with detail page text for all events

**Change to `assembleDescription`:** Apply the same combination logic to non-AC events as already exists for AC events.

Currently non-AC events use `(detailDescription || excerpt)` — excerpt is only a fallback when detail is empty. After Fix 1, `detailDescription` will always be non-empty, so the excerpt is silently discarded. But the API excerpt is a clean, concise one-to-two sentence summary that reads well as a lead sentence.

New logic for non-AC:
- When both exist: `(excerpt + ' ' + detailDescription).slice(0, 800)`
- When only one exists: use whichever is non-empty

## Fix 3: Update tests to reflect real-world HTML

Existing `parseDetailPage` tests wrap content in `<div class="cjbs-event">`. Since we're changing the selector to `main .wp-block-group`, these tests must be updated to wrap content in `<main>` instead. This also makes the tests truthful — they now test against a HTML shape that matches what the scraper actually encounters.

No new fixture file needed. Inline HTML in the test file is sufficient.

## Scope

- `api/_scrapers/custom/judge-business-school.js`: `parseDetailPage` selector + `assembleDescription` logic
- `api/_scrapers/custom/judge-business-school.test.js`: update test HTML wrappers, add combined-description tests
