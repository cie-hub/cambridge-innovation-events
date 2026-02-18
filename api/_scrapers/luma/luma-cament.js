import { scrapeLumaPage } from './_luma.js'

const EVENTS_URL = 'https://luma.com/calendar/cal-l9LcwWCujMeozTm'
const SOURCE = 'luma-cament'

export async function scrapeLumaCament() {
  return scrapeLumaPage(EVENTS_URL, SOURCE)
}
