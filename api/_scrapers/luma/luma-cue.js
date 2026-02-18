import { scrapeLumaPage } from './_luma.js'

const EVENTS_URL = 'https://luma.com/calendar/cal-MzlTbMD9szD8luR'
const SOURCE = 'luma-cue'

export async function scrapeLumaCue() {
  return scrapeLumaPage(EVENTS_URL, SOURCE)
}
