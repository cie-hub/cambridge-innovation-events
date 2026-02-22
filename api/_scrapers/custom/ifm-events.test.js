// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseDetailPage } from './ifm-events.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const detailHtml = readFileSync(resolve(__dirname, '_fixtures/ifm-events-detail.html'), 'utf-8')

describe('parseDetailPage (IFM Events)', () => {
  it('extracts access from "Register your place" text', () => {
    const $ = cheerio.load(detailHtml)
    const result = parseDetailPage($)
    expect(result.access).toBe('Registration Required')
  })

  it('extracts description from detail page', () => {
    const $ = cheerio.load(detailHtml)
    const result = parseDetailPage($)
    expect(result.description).toContain('battery technology')
  })

  it('returns null cost when no price mentioned', () => {
    const $ = cheerio.load(detailHtml)
    const result = parseDetailPage($)
    expect(result.cost).toBeNull()
  })
})
