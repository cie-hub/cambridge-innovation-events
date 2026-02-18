import { useState } from 'react'
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
