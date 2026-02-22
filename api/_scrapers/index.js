import { scrapeCambridgeNetwork } from './custom/cambridge-network.js'
import { scrapeKingsElab } from './custom/kings-elab.js'
import { scrapeJudgeBusinessSchool } from './custom/judge-business-school.js'
import { scrapeBradfieldCentre } from './tribe-events/bradfield-centre.js'
import { scrapeStJohns } from './custom/st-johns.js'
import { scrapeInnovateCambridge } from './custom/innovate-cambridge.js'
import { scrapeCambridgeSciencePark } from './custom/cambridge-science-park.js'
import { scrapeQueensCollege } from './custom/queens-college.js'
import { scrapeEagleLabs } from './eventbrite/eagle-labs.js'
import { scrapeIdeaspace } from './custom/ideaspace.js'
import { scrapeVentureCafe } from './tribe-events/venture-cafe.js'
import { scrapeAllia } from './tribe-events/allia.js'
import { scrapeCambridgeWireless } from './custom/cambridge-wireless.js'

import { scrapeLumaCffn } from './luma/luma-cffn.js'
import { scrapeLumaCue } from './luma/luma-cue.js'
import { scrapeLumaCament } from './luma/luma-cament.js'
import { scrapeTalksCam } from './custom/talks-cam.js'
import { scrapeCrukLectures } from './custom/cruk-lectures.js'
import { scrapeEventbriteCambridge } from './eventbrite/eventbrite-cambridge.js'
import { scrapeMakespace } from './meetup/makespace.js'
import { scrapeCamPublicEvents } from './custom/cam-public-events.js'
import { scrapeIfmEvents } from './custom/ifm-events.js'
import { scrapeCambridgeEnterprise } from './custom/cambridge-enterprise.js'
import { scrapeMeetupCambridge } from './meetup/meetup-cambridge.js'
import { scrapeWolfsonCollege } from './custom/wolfson-college.js'
import { scrapeCambridgeThinklab } from './ajax/cambridge-thinklab.js'
import { scrapeHistoryEconomics } from './custom/history-economics.js'

export const scrapers = {
  'cambridge-network': scrapeCambridgeNetwork,
  'kings-elab': scrapeKingsElab,
  'judge-business-school': scrapeJudgeBusinessSchool,
  'bradfield-centre': scrapeBradfieldCentre,
  'st-johns': scrapeStJohns,
  'innovate-cambridge': scrapeInnovateCambridge,
  'cambridge-science-park': scrapeCambridgeSciencePark,
  'queens-college': scrapeQueensCollege,
  'eagle-labs': scrapeEagleLabs,
  'ideaspace': scrapeIdeaspace,
  'venture-cafe': scrapeVentureCafe,
  'allia': scrapeAllia,
  'cambridge-wireless': scrapeCambridgeWireless,

  'luma-cffn': scrapeLumaCffn,
  'luma-cue': scrapeLumaCue,
  'luma-cament': scrapeLumaCament,
  'talks-cam': scrapeTalksCam,
  'cruk-lectures': scrapeCrukLectures,
  'eventbrite-cambridge': scrapeEventbriteCambridge,
  'makespace': scrapeMakespace,
  'cam-public-events': scrapeCamPublicEvents,
  'ifm-events': scrapeIfmEvents,
  'cambridge-enterprise': scrapeCambridgeEnterprise,
  'meetup-cambridge': scrapeMeetupCambridge,
  'wolfson-college': scrapeWolfsonCollege,
  'cambridge-thinklab': scrapeCambridgeThinklab,
  'history-economics': scrapeHistoryEconomics,
}
