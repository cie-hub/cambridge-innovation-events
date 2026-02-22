// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { parseCambridgeSciencePark, parseDetailPage } from './cambridge-science-park.js'

describe('parseCambridgeSciencePark', () => {
  const listingHtml = `
    <article class="post">
      <h2 class="entry-title"><a href="https://cambridgesciencepark.co.uk/events/wildlife-walk/">Wildlife Walk with The Wildlife Trust</a></h2>
      <a href="https://cambridgesciencepark.co.uk/events/wildlife-walk/">
        <img src="https://cambridgesciencepark.co.uk/wp-content/uploads/2026/01/hedgehog.webp" class="wp-post-image" />
      </a>
      <p>Thursday 26 February | The Bradfield Centre | 12:30 – 13:30 We have been working closely with The Wildlife Trust to host monthly walks for our Park members.</p>
    </article>
    <article class="post">
      <h2 class="entry-title"><a href="https://cambridgesciencepark.co.uk/events/climate-tech-club/">Climate Tech Club</a></h2>
      <a href="https://cambridgesciencepark.co.uk/events/climate-tech-club/">
        <img src="https://cambridgesciencepark.co.uk/wp-content/uploads/2026/02/climatetech.webp" class="wp-post-image" />
      </a>
      <p>Monthly networking event for Climate Tech doers and enablers in Cambridge. Come ready to connect, learn, and spark innovation.</p>
    </article>
  `

  it('extracts all listings including those without dates', () => {
    const $ = cheerio.load(listingHtml)
    const events = parseCambridgeSciencePark($)
    expect(events).toHaveLength(2)
  })

  it('parses date when present in listing text', () => {
    const $ = cheerio.load(listingHtml)
    const events = parseCambridgeSciencePark($)
    const wildlife = events.find(e => e.title.includes('Wildlife'))
    expect(wildlife.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns null date when no date in listing text', () => {
    const $ = cheerio.load(listingHtml)
    const events = parseCambridgeSciencePark($)
    const climate = events.find(e => e.title.includes('Climate'))
    expect(climate.date).toBeNull()
  })

  it('extracts sourceUrl and imageUrl', () => {
    const $ = cheerio.load(listingHtml)
    const events = parseCambridgeSciencePark($)
    for (const ev of events) {
      expect(ev.sourceUrl).toMatch(/^https:\/\/cambridgesciencepark\.co\.uk\//)
      expect(ev.imageUrl).toMatch(/^https:\/\//)
    }
  })

  it('returns empty array for page with no articles', () => {
    const $ = cheerio.load('<div>No events here</div>')
    const events = parseCambridgeSciencePark($)
    expect(events).toHaveLength(0)
  })
})

describe('parseDetailPage', () => {
  it('extracts date from jet-listing-dynamic-field__content', () => {
    const $ = cheerio.load(`
      <div class="jet-listing-dynamic-field__content">25 February, 2026</div>
      <div class="jet-listing-dynamic-field__content">The Bradfield Centre</div>
      <p>Monthly networking event for Climate Tech doers.</p>
    `)
    const detail = parseDetailPage($)
    expect(detail.date).toBe('2026-02-25')
  })

  it('extracts time from paragraph text', () => {
    const $ = cheerio.load(`
      <div class="jet-listing-dynamic-field__content">26 February, 2026</div>
      <p>Thursday 26 February | The Bradfield Centre | 12:30 – 13:30</p>
      <p>Join us for a walk around the park.</p>
    `)
    const detail = parseDetailPage($)
    expect(detail.time).toBe('12:30 - 13:30')
  })

  it('extracts access from detail page text', () => {
    const $ = cheerio.load(`
      <div class="jet-listing-dynamic-field__content">26 February, 2026</div>
      <p>We host monthly walks for our Park members.</p>
      <p>This is an event open to tenant staff only - please use your work email.</p>
    `)
    const detail = parseDetailPage($)
    expect(detail.access).not.toBeNull()
  })

  it('extracts cost when present', () => {
    const $ = cheerio.load(`
      <div class="jet-listing-dynamic-field__content">12 March, 2026</div>
      <p>Tickets cost £25 per person for this workshop.</p>
    `)
    const detail = parseDetailPage($)
    expect(detail.cost).toBe('£25 per person')
  })

  it('returns null date when no date in dynamic fields', () => {
    const $ = cheerio.load(`
      <div class="jet-listing-dynamic-field__content">The Bradfield Centre</div>
      <p>An event with no date information available.</p>
    `)
    const detail = parseDetailPage($)
    expect(detail.date).toBeNull()
  })

  it('filters out nav/footer paragraphs from description', () => {
    const $ = cheerio.load(`
      <div class="jet-listing-dynamic-field__content">3 March, 2026</div>
      <p>Discover Our Story and Explore The Park</p>
      <p>This is the actual event description about climate tech innovation.</p>
      <p>By submitting this form, you consent to us processing your personal data.</p>
    `)
    const detail = parseDetailPage($)
    expect(detail.description).toContain('climate tech innovation')
    expect(detail.description).not.toContain('submitting this form')
  })
})
