import { scrapeLumaPage } from './_luma.js'

const EVENTS_URL = 'https://luma.com/cffn'
const SOURCE = 'luma-cffn'

export async function scrapeLumaCffn() {
  return scrapeLumaPage(EVENTS_URL, SOURCE)
}
