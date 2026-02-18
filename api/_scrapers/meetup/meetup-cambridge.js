import { fetchMeetupGroups } from './_meetup.js'

const SOURCE = 'meetup-cambridge'

// Active Cambridge UK meetup groups relevant to founders/tech/startup ecosystem
const GROUPS = [
  // Startup / Founder / Entrepreneur
  'campitchmix',                          // Cambridge Pitch & Mix
  'cambridge-entrepreneur-group',          // Cambridge Entrepreneur's Group
  'cambridgefounders',                     // UK Entrepreneurs - Cambridge
  'opencoffeecambridgeuk',                 // Open Coffee Cambridge
  'Silicon-Drinkabout-Cambridge',          // Silicon Drinkabout (tech networking)

  // AI / Data
  'meetup-group-mdhxintw',                // Cambridge AI
  'cambridge-ai-reading-group',            // Cambridge AI Reading Group
  'pydata-cambridge-meetup',               // PyData Cambridge
  'tech-bio-innovators-cambridge',         // Tech-Bio Innovators

  // Software / Engineering
  'cambridge-software-crafters',           // Software Crafters Cambridge
  'cambridge-programmers-study-group',     // Cambridge Programmers' Study Group
  'cambridge-rust-meetup',                 // Cambridge Rust
  'accu-cambridge',                        // ACCU Cambridge
  'Cambridge-AWS-User-Group',              // Cambridge AWS User Group

  // Product
  'cambridge-product-management-network',  // Product Management Network
  'producttank-cambridge',                 // ProductTank Cambridge
]

export async function scrapeMeetupCambridge() {
  return fetchMeetupGroups(GROUPS, SOURCE)
}
