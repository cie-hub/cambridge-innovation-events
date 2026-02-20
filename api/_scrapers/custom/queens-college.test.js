// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { parseQueensCollege } from './queens-college.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, '_fixtures/queens-college.html'), 'utf-8')

describe('parseQueensCollege', () => {
  it('throws when fixture HTML is missing appsWarmupData marker', () => {
    const $ = cheerio.load(html)
    expect(() => parseQueensCollege($)).toThrow('appsWarmupData')
  })

  it('throws on empty HTML without Wix warmup data', () => {
    const $ = cheerio.load('<html><body></body></html>')
    expect(() => parseQueensCollege($)).toThrow('appsWarmupData')
  })

  it('throws when Wix app ID is missing from warmup data', () => {
    const fakeHtml = '<html><script>"appsWarmupData":{"other-app":{}}</script></html>'
    const $ = cheerio.load(fakeHtml)
    expect(() => parseQueensCollege($)).toThrow('Wix app ID')
  })
})
