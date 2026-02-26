import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Header from './components/Header/Header'
import Filters from './components/Filters/Filters'
import Timeline from './components/Timeline/Timeline'
import Calendar from './components/Calendar/Calendar'
import WeekView from './components/WeekView/WeekView'
import ParticleNetwork from './components/ParticleNetwork/ParticleNetwork'
import AboutModal from './components/AboutModal/AboutModal'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import { useEvents } from './hooks/useEvents'
import { useFilters } from './hooks/useFilters'
import { BookmarkProvider, useBookmarkContext } from './context/BookmarkContext'
import './components/ParticleNetwork/ParticleNetwork.css'

function AppContent() {
  const [view, setView] = useState('timeline')
  const { events, loading, error } = useEvents()
  const { bookmarks } = useBookmarkContext()
  const { filters, setFilters, applyFilters, clearFilters, allSources, allCategories, activeFilterCount } =
    useFilters(events)

  const filtered = applyFilters(events, bookmarks)

  useEffect(() => {
    if (!events.length) return

    const existing = document.getElementById('ld-json')
    if (existing) existing.remove()

    const script = document.createElement('script')
    script.id = 'ld-json'
    script.type = 'application/ld+json'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Cambridge Innovation Events',
      description: 'Innovation, startup, and research events across Cambridge scraped from 26 sources.',
      url: 'https://camevents.org',
      itemListElement: events.slice(0, 100).map((event, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Event',
          name: event.title,
          startDate: event.date,
          url: event.sourceUrl,
          location: event.location
            ? { '@type': 'Place', name: event.location }
            : undefined,
          organizer: {
            '@type': 'Organization',
            name: event.source,
          },
        },
      })),
    })
    document.head.appendChild(script)

    return () => {
      document.getElementById('ld-json')?.remove()
    }
  }, [events])

  return (
    <div className="app">
      <div className="app-background" />
      <ParticleNetwork />
      <Header view={view} onViewChange={setView} />
      <main className="main">
        <ErrorBoundary>
          {error && <p className="main__error">{error}</p>}
          {loading ? (
            <p className="main__loading">Loading events...</p>
          ) : (
            <>
              <Filters
                filters={filters}
                onFilterChange={setFilters}
                onClear={clearFilters}
                activeCount={activeFilterCount}
                sources={allSources}
                categories={allCategories}
              />
              {view === 'timeline' && <Timeline events={filtered} />}
              {view === 'week' && <WeekView events={filtered} />}
              {view === 'calendar' && <Calendar events={filtered} />}
            </>
          )}
        </ErrorBoundary>
      </main>
      <AboutModal />
      <Analytics />
      <SpeedInsights />
    </div>
  )
}

export default function App() {
  return (
    <BookmarkProvider>
      <AppContent />
    </BookmarkProvider>
  )
}
