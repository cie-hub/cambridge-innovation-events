import { useState, useCallback } from 'react'
import { formatSource } from '../../utils/formatSource'
import BookmarkIcon from '../BookmarkIcon'
import './Filters.css'

export default function Filters({
  filters,
  onFilterChange,
  onClear,
  activeCount,
  sources,
  categories,
}) {
  const [expanded, setExpanded] = useState(null)

  const toggleSource = useCallback((source) => {
    const current = filters.sources
    const next = current.includes(source) ? current.filter((existing) => existing !== source) : [...current, source]
    onFilterChange({ ...filters, sources: next })
  }, [filters, onFilterChange])

  const toggleCategory = useCallback((category) => {
    const current = filters.categories
    const next = current.includes(category) ? current.filter((existing) => existing !== category) : [...current, category]
    onFilterChange({ ...filters, categories: next })
  }, [filters, onFilterChange])

  const toggleSection = useCallback((section) => {
    setExpanded((prev) => (prev === section ? null : section))
  }, [])

  const sourceCount = filters.sources.length
  const catCount = filters.categories.length

  return (
    <div className="filters">
      <div className="filters__search-row">
        <div className="filters__search-wrap">
          <span className="filters__search-icon" aria-hidden="true">&#x2315;</span>
          <input
            className="filters__search"
            type="text"
            placeholder="Search events..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <button
              className="filters__search-clear"
              onClick={() => onFilterChange({ ...filters, search: '' })}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>

        {sources.length > 0 && (
          <button
            className={`filters__toggle ${expanded === 'sources' ? 'filters__toggle--open' : ''} ${sourceCount > 0 ? 'filters__toggle--has-active' : ''}`}
            onClick={() => toggleSection('sources')}
          >
            Sources{sourceCount > 0 && <span className="filters__badge">{sourceCount}</span>}
          </button>
        )}

        {categories.length > 0 && (
          <button
            className={`filters__toggle ${expanded === 'topics' ? 'filters__toggle--open' : ''} ${catCount > 0 ? 'filters__toggle--has-active' : ''}`}
            onClick={() => toggleSection('topics')}
          >
            Topics{catCount > 0 && <span className="filters__badge">{catCount}</span>}
          </button>
        )}

        <button
          className={`filters__chip filters__chip--bookmark ${filters.bookmarkedOnly ? 'filters__chip--active' : ''}`}
          onClick={() => onFilterChange({ ...filters, bookmarkedOnly: !filters.bookmarkedOnly })}
        >
          <BookmarkIcon filled={filters.bookmarkedOnly} size={14} style={{ verticalAlign: '-2px' }} /> Saved
        </button>

        {activeCount > 0 && (
          <button className="filters__clear" onClick={onClear}>
            Clear ({activeCount})
          </button>
        )}
      </div>

      {expanded === 'sources' && sources.length > 0 && (
        <div className="filters__dropdown">
          <div className="filters__chips">
            {sources.map((source) => (
              <button
                key={source}
                className={`filters__chip ${filters.sources.includes(source) ? 'filters__chip--active' : ''}`}
                onClick={() => toggleSource(source)}
              >
                {formatSource(source)}
              </button>
            ))}
          </div>
        </div>
      )}

      {expanded === 'topics' && categories.length > 0 && (
        <div className="filters__dropdown">
          <div className="filters__chips">
            {categories.map((category) => (
              <button
                key={category}
                className={`filters__chip ${filters.categories.includes(category) ? 'filters__chip--active' : ''}`}
                onClick={() => toggleCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
