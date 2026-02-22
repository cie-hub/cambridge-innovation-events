/**
 * Scrape batches -- each batch runs on a separate cron tick to spread load.
 * Keys are batch indices, values are arrays of source slugs.
 */
export const batches = {
  0: ['kings-elab', 'judge-business-school', 'queens-college', 'cambridge-thinklab'],
  1: ['bradfield-centre', 'st-johns', 'cambridge-science-park', 'eagle-labs'],
  2: ['innovate-cambridge', 'cambridge-network', 'ideaspace'],
  3: ['venture-cafe', 'allia', 'cambridge-wireless'],
  4: ['luma-cffn', 'luma-cue', 'luma-cament'],
  5: ['talks-cam', 'cruk-lectures', 'eventbrite-cambridge', 'makespace', 'cam-public-events'],
  6: ['ifm-events', 'cambridge-enterprise', 'wolfson-college', 'history-economics'],
  7: ['meetup-cambridge'],
}

/**
 * Source registry -- metadata for every scrapeable source.
 * Keys are slugs used throughout the system (batches, hashes, DB docs).
 */
export const sources = {
  'kings-elab': {
    name: "King's E-Lab",
    url: 'https://www.kingselab.org',
    description: 'Student and founder focused entrepreneurship hub',
  },
  'judge-business-school': {
    name: 'Cambridge Judge Business School',
    url: 'https://www.jbs.cam.ac.uk/events/',
    description: 'Research seminars, entrepreneurship events, and workshops (excludes admissions)',
  },
  'bradfield-centre': {
    name: 'The Bradfield Centre',
    url: 'https://www.bradfieldcentre.com',
    description: 'Tech and startup hub with talks, panels, and networking',
  },
  'st-johns': {
    name: "St John's Innovation Centre",
    url: 'https://www.stjohns.co.uk/events',
    description: 'Business events, workshops, and scale-up support',
  },
  'innovate-cambridge': {
    name: 'Innovate Cambridge',
    url: 'https://www.innovatecambridge.com',
    description: 'Ecosystem connector for partnerships and programmes',
  },
  'cambridge-science-park': {
    name: 'Cambridge Science Park',
    url: 'https://www.cambridgesciencepark.co.uk/news-events',
    description: 'Corporate, science, and deep-tech focused events',
  },
  'queens-college': {
    name: "Queen's Entrepreneurship Society",
    url: 'https://www.qescambridge.com',
    description: 'QES entrepreneurship events, competitions, and alumni talks',
  },
  'eagle-labs': {
    name: 'Eagle Labs Cambridge',
    url: 'https://labs.uk.barclays/locations/cambridge',
    description: 'Startup support, mentoring, and events by Barclays',
  },
  'cambridge-network': {
    name: 'Cambridge Network',
    url: 'https://www.cambridgenetwork.co.uk/events',
    description: 'Business, tech, and innovation events across sectors',
  },
  'ideaspace': {
    name: 'IdeaSpace',
    url: 'https://ideaspace.cam.ac.uk/getting-involved/',
    description: 'Early-stage ventures, Start-up Stories, and community events',
  },
  'venture-cafe': {
    name: 'Venture Cafe Cambridge Connect',
    url: 'https://venturecafecambridgeconnect.org',
    description: 'Monthly open networking for founders, hosted by Innovate Cambridge',
  },
  'allia': {
    name: 'Allia Future Business Centre',
    url: 'https://www.allia.org.uk/future-business-centres/cambridge',
    description: 'Social impact, sustainability, and purpose-led events',
  },
  'cambridge-wireless': {
    name: 'Cambridge Wireless',
    url: 'https://www.cambridgewireless.co.uk',
    description: 'Telecoms, connectivity, and wireless technology events',
  },
  'luma-cffn': {
    name: 'Cambridge Female Founders Network',
    url: 'https://luma.com/cffn',
    description: 'Events for female founders and women in tech',
  },
  'luma-cue': {
    name: 'CUE',
    url: 'https://luma.com/calendar/cal-MzlTbMD9szD8luR',
    description: 'Cambridge University Entrepreneurs events and workshops',
  },
  'luma-cament': {
    name: 'CAMentrepreneurs',
    url: 'https://luma.com/calendar/cal-l9LcwWCujMeozTm',
    description: 'Cambridge alumni entrepreneurship network events',
  },
  'talks-cam': {
    name: 'Talks.cam',
    url: 'https://talks.cam.ac.uk',
    description: 'University of Cambridge talks and lectures directory',
  },
  'cruk-lectures': {
    name: 'CRUK Lectures',
    url: 'https://crukcambridgecentre.org.uk',
    description: 'Cancer Research UK Cambridge Centre lectures on cancer biology and medicine',
  },
  'eventbrite-cambridge': {
    name: 'Eventbrite Cambridge',
    url: 'https://www.eventbrite.co.uk/d/united-kingdom--cambridge/innovation/',
    description: 'Innovation events in Cambridge listed on Eventbrite',
  },
  'makespace': {
    name: 'Makespace',
    url: 'https://web.makespace.org/calendar/',
    description: 'Community workshop and maker space events',
  },
  'cam-public-events': {
    name: 'Cambridge Public Events',
    url: 'https://www.admin.cam.ac.uk/whatson/',
    description: "University of Cambridge public engagement events",
  },
  'ifm-events': {
    name: 'IfM Events',
    url: 'https://www.ifm.eng.cam.ac.uk/events/',
    description: 'Institute for Manufacturing conferences, forums, and innovation events',
  },
  'cambridge-enterprise': {
    name: 'Cambridge Enterprise',
    url: 'https://www.enterprise.cam.ac.uk/our-events/',
    description: 'University commercialisation, training, and networking events at the Hauser Forum',
  },
  'meetup-cambridge': {
    name: 'Meetup Cambridge',
    url: 'https://www.meetup.com/cities/gb/c3/cambridge/tech/',
    description: 'Cambridge tech, startup, and founder meetup groups',
  },
  'wolfson-college': {
    name: 'Wolfson College Entrepreneurship Hub',
    url: 'https://www.wolfson.cam.ac.uk/whats/events-feed',
    description: 'Wolfson Entrepreneurship Society workshops, competitions, and venture events',
  },
  'cambridge-thinklab': {
    name: 'Cambridge ThinkLab',
    url: 'https://www.thinklab.strategic-partnerships.admin.cam.ac.uk/events/',
    description: 'University of Cambridge ThinkLab research impact events and talks',
  },
  'history-economics': {
    name: 'History and Economics Seminar',
    url: 'https://www.hist.cam.ac.uk/event-series/history-and-economics',
    description: 'Cambridge History and Economics seminars and Joint Harvard Center online seminars',
  },
}
