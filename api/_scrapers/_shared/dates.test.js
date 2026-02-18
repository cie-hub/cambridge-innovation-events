// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  MONTHS,
  parseDayMonthYear,
  parseDdMmYyyy,
  parseNaturalDate,
  parseOrdinalDate,
  parseDayMonthInfer,
  parseDateFromBrHtml,
  formatTime,
  formatTimeRange,
} from './dates.js'

describe('parseDayMonthYear', () => {
  it('parses "25 February 2026"', () => {
    expect(parseDayMonthYear('25 February 2026')).toBe('2026-02-25')
  })

  it('parses "4 March 2026"', () => {
    expect(parseDayMonthYear('4 March 2026')).toBe('2026-03-04')
  })

  it('parses with surrounding text "Thursday 16 April 2026"', () => {
    expect(parseDayMonthYear('Thursday 16 April 2026')).toBe('2026-04-16')
  })

  it('returns null for invalid input', () => {
    expect(parseDayMonthYear('not a date')).toBeNull()
  })
})

describe('parseDdMmYyyy', () => {
  it('parses "03/02/2026"', () => {
    expect(parseDdMmYyyy('03/02/2026')).toBe('2026-02-03')
  })

  it('returns null for invalid format', () => {
    expect(parseDdMmYyyy('2026-02-03')).toBeNull()
  })
})

describe('parseNaturalDate', () => {
  it('parses "Feb 16, 2026"', () => {
    expect(parseNaturalDate('Feb 16, 2026')).toBe('2026-02-16')
  })

  it('parses "17 February 2026"', () => {
    expect(parseNaturalDate('17 February 2026')).toBe('2026-02-17')
  })

  it('returns null for invalid input', () => {
    expect(parseNaturalDate('garbage')).toBeNull()
  })
})

describe('parseOrdinalDate', () => {
  it('parses "24th February 2026"', () => {
    expect(parseOrdinalDate('24th February 2026')).toBe('2026-02-24')
  })

  it('parses "1st March 2026"', () => {
    expect(parseOrdinalDate('1st March 2026')).toBe('2026-03-01')
  })
})

describe('parseDayMonthInfer', () => {
  it('returns YYYY-MM-DD with inferred year', () => {
    const result = parseDayMonthInfer('16 April')
    expect(result).toMatch(/^\d{4}-04-16$/)
  })

  it('handles abbreviated months', () => {
    const result = parseDayMonthInfer('February 12')
    expect(result).toMatch(/^\d{4}-02-12$/)
  })

  it('returns null for invalid input', () => {
    expect(parseDayMonthInfer('hello')).toBeNull()
  })
})

describe('parseDateFromBrHtml', () => {
  it('parses "16<br>Feb" HTML', () => {
    const result = parseDateFromBrHtml('16<br>Feb')
    expect(result).toMatch(/^\d{4}-02-16$/)
  })

  it('parses "3<br />March" HTML', () => {
    const result = parseDateFromBrHtml('3<br />March')
    expect(result).toMatch(/^\d{4}-03-03$/)
  })
})

describe('formatTime', () => {
  it('formats a Date to HH:MM', () => {
    const d = new Date('2026-02-17T17:30:00Z')
    const result = formatTime(d)
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('formatTimeRange', () => {
  it('formats start and end dates to "HH:MM - HH:MM"', () => {
    const start = new Date('2026-02-17T17:30:00Z')
    const end = new Date('2026-02-17T20:00:00Z')
    const result = formatTimeRange(start, end)
    expect(result).toMatch(/^\d{2}:\d{2} - \d{2}:\d{2}$/)
  })

  it('returns single time if no end date', () => {
    const start = new Date('2026-02-17T17:30:00Z')
    const result = formatTimeRange(start, null)
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('MONTHS', () => {
  it('contains all 12 months in full and abbreviated form', () => {
    expect(MONTHS['january']).toBe(0)
    expect(MONTHS['december']).toBe(11)
    expect(MONTHS['jan']).toBe(0)
    expect(MONTHS['dec']).toBe(11)
  })
})
