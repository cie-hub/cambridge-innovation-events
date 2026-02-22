/**
 * Cambridge Innovation Event Links Hub - Scraper Utilities
 *
 * NOTICE: These scrapers collect publicly available event metadata
 * (titles, dates, links) for non-commercial community use. No copyrighted
 * content is reproduced. Each request identifies itself via a custom
 * User-Agent header. If a source owner wishes to be removed, they may
 * open a GitHub issue and we will comply promptly.
 */

import { createHash } from 'crypto'
import * as cheerio from 'cheerio'
import { classify } from './classifier.js'
import { inferAccess } from './access.js'
import { validateEvent } from './validate.js'

/**
 * Generates a deterministic 16-char hex hash from event identity fields.
 * Used to deduplicate events across scrape runs.
 * @param {string} title - Event title
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} source - Source identifier slug
 * @returns {string} 16-character hex hash
 */
export function hashEvent(title, date, source) {
  return createHash('sha256')
    .update(`${title}|${date}|${source}`)
    .digest('hex')
    .slice(0, 16)
}

/**
 * Generates a source-independent hash from title + date only.
 * Used to detect the same event scraped from different sources.
 * @param {string} title - Event title
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {string} 16-character hex hash
 */
export function contentHashEvent(title, date) {
  return createHash('sha256')
    .update(`${title}|${date}`)
    .digest('hex')
    .slice(0, 16)
}

function convertToken(token) {
  const t = token.trim()
  if (/^\d{1,2}:\d{2}$/.test(t)) return t.padStart(5, '0')
  const m = t.match(/^(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)$/i)
  if (!m) return t
  let h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  const period = m[3].toLowerCase()
  if (period === 'pm' && h !== 12) h += 12
  if (period === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function normalizeTime(time) {
  if (!time) return null
  const parts = time.split(/\s*[-–]\s*/)
  if (parts.length === 2) {
    return `${convertToken(parts[0])} - ${convertToken(parts[1])}`
  }
  return convertToken(time)
}

function sanitizeLocation(str) {
  return str
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(code))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[\t\n\r]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Normalizes raw scraped event data into a consistent shape with a dedup hash.
 * @param {Object} raw - Raw event fields from a scraper
 * @param {string} raw.title - Event title
 * @param {string} [raw.description] - Event description
 * @param {string} raw.date - ISO 8601 date string
 * @param {string} [raw.endDate] - ISO 8601 end date string
 * @param {string} raw.source - Source identifier slug
 * @param {string} raw.sourceUrl - Original event URL
 * @param {string} [raw.location] - Event venue
 * @param {string} [raw.cost] - Cost description
 * @param {string} [raw.access] - Access/registration info
 * @param {string} [raw.time] - Event time (e.g. "17:30 - 20:00")
 * @param {string} [raw.imageUrl] - Event image URL
 * @returns {Object|null} Normalized event object, or null if validation fails
 */
export function normalizeEvent({
  title,
  description,
  date,
  endDate,
  source,
  sourceUrl,
  location,
  cost,
  access,
  time,
  imageUrl,
}) {
  const validated = validateEvent({ title, description, date, source, location, time, imageUrl, sourceUrl, access }, source)
  if (!validated) return null

  const dateStr = typeof date === 'string' ? date.split('T')[0] : date
  return {
    title,
    description: description || '',
    date: new Date(date),
    endDate: endDate ? new Date(endDate) : null,
    source,
    sourceUrl,
    location: location ? sanitizeLocation(location) : '',
    categories: classify(title, description || ''),
    cost: cost || null,
    access: access || inferAccess(description || ''),
    time: normalizeTime(time),
    imageUrl: imageUrl || null,
    scrapedAt: new Date(),
    hash: hashEvent(title, dateStr, source),
    contentHash: contentHashEvent(title, dateStr),
  }
}

/**
 * Fetches a page and returns a cheerio-loaded DOM for scraping.
 * @param {string} url - URL to fetch
 * @returns {Promise<import('cheerio').CheerioAPI>} Loaded cheerio instance
 */
const FETCH_TIMEOUT_MS = 15_000

export async function fetchPage(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'CambridgeInnovationEvents/1.0 (community aggregator)',
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timer))

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`)
  }
  const html = await res.text()
  return cheerio.load(html)
}
