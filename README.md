# Cambridge Innovation Event Links Hub

One page of links to every innovation, startup, and research event in Cambridge.

This is not an event platform. We don't host, organise, or own any events. This is a curated collection of links, scraped from 25 sources across the Cambridge innovation ecosystem and presented on a single, filterable page.

**Live:** [events.chepaldin.com](https://events.chepaldin.com)

## The Channellable Design Principles

*If a non-technical events organiser such as Channelle can use it, it ships. If they can't, it doesn't.*

Everything on this site is designed to be intuitive enough that anyone, regardless of technical background, can open it, find what they need, and get on with their day. No logins, no accounts, no onboarding. Just links.

The frontend is the product. Every feature must pass through the lens of simplicity and usability before it gets built. We will always prioritise clarity over cleverness.

## Non-Profit & Open Source

This project is a volunteer, non-profit effort. No events are monetised, promoted, or prioritised. Every source is scraped equally.

If you are an event organiser and want your page removed from this hub, open an issue on this repository and we'll take it down, no questions asked.

## Scraping & Data

This project scrapes publicly available event metadata (titles, dates, links, descriptions) from the websites listed below. It is a non-commercial, volunteer community effort.

- No copyrighted content is reproduced. We store only metadata and link back to the original source.
- Scrapers identify themselves with a custom `User-Agent` header (`CambridgeInnovationEvents/1.0`).
- Scrapers run once per day with low request volume (one request per source).
- If you are an event organiser and would like your page removed, open an issue and we will remove it promptly.

The scraped data is provided as-is with no guarantees of accuracy or completeness.

## Tech Stack

- **Frontend:** React 19, Vite, vanilla CSS with dark mode support
- **Backend:** Vercel Serverless Functions
- **Database:** MongoDB Atlas (free tier)
- **Scrapers:** 25 source-specific scrapers using cheerio, REST APIs, and Luma/Meetup integrations
- **Classification:** TF-IDF cosine similarity classifier with a 12-category taxonomy

## Event Sources

| Source | Description |
|--------|-------------|
| King's E-Lab | Student and founder focused entrepreneurship hub |
| Cambridge Judge Business School | Accelerate Cambridge, EnterpriseTECH, talks, panels, demo days |
| The Bradfield Centre | Tech and startup hub with talks, panels, and networking |
| St John's Innovation Centre | Business events, workshops, and scale-up support |
| Innovate Cambridge | Ecosystem connector for partnerships and programmes |
| Cambridge Science Park | Corporate, science, and deep-tech focused events |
| Queen's Entrepreneurship Society | QES entrepreneurship events, competitions, and alumni talks |
| Eagle Labs Cambridge | Startup support, mentoring, and events by Barclays |
| Cambridge Network | Business, tech, and innovation events across sectors |
| IdeaSpace | Early-stage ventures, Start-up Stories, and community events |
| Venture Cafe Cambridge Connect | Monthly open networking for founders |
| Allia Future Business Centre | Social impact, sustainability, and purpose-led events |
| Cambridge Wireless | Telecoms, connectivity, and wireless technology events |
| IfM Engage | Institute for Manufacturing events, conferences, and workshops |
| Cambridge Female Founders Network | Events for female founders and women in tech |
| CUE | Cambridge University Entrepreneurs events and workshops |
| CAMentrepreneurs | Cambridge alumni entrepreneurship network events |
| Talks.cam | University of Cambridge talks and lectures directory |
| CRUK Lectures | Cancer Research UK Cambridge Centre lectures |
| Eventbrite Cambridge | Innovation events in Cambridge listed on Eventbrite |
| Makespace | Community workshop and maker space events |
| Cambridge Public Events | University of Cambridge public engagement events |
| IfM Events | Institute for Manufacturing conferences, forums, and innovation events |
| Cambridge Enterprise | University commercialisation, training, and networking events |
| Meetup Cambridge | Cambridge tech, startup, and founder meetup groups |

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (free tier works): [atlas.mongodb.com](https://www.mongodb.com/atlas)

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your MongoDB URI
4. Start the dev server: `npm run dev`

The frontend runs at `http://localhost:5173`. It fetches events from the production API by default. To scrape into your own database, deploy the `api/` functions to Vercel.

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run lint` | Lint with ESLint |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add a new event source or fix a bug.

## License

Apache 2.0. See [LICENSE](LICENSE).
