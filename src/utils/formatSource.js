const DISPLAY_NAMES = {
  'kings-elab': "King's E-Lab",
  'st-johns': "St John's Innovation Centre",
  'luma-cffn': 'Cambridge Female Founders Network',
  'luma-cue': 'CUE',
  'luma-cament': 'CAMentrepreneurs',
  'ifm-engage': 'IfM Engage',
  'talks-cam': 'Talks.cam',
  'cruk-lectures': 'CRUK Lectures',
  'eventbrite-cambridge': 'Eventbrite Cambridge',
  'cam-public-events': 'Cambridge Public Events',
  'ifm-events': 'Institute for Manufacturing',
  'cambridge-enterprise': 'Cambridge Enterprise',
  'meetup-cambridge': 'Meetup',
  'venture-cafe': 'Venture Cafe Cambridge Connect',
  'queens-college': "Queen's Entrepreneurship Society",
}

export function formatSource(slug) {
  if (DISPLAY_NAMES[slug]) return DISPLAY_NAMES[slug]
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
