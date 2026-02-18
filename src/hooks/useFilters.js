import { useState, useMemo } from 'react'

export function useFilters(events) {
  const [filters, setFilters] = useState({
    search: '',
    sources: [],
    categories: [],
    bookmarkedOnly: false,
  })

  const allSources = useMemo(() => {
    return [...new Set(events.map((e) => e.source))].sort()
  }, [events])

  const allCategories = useMemo(() => {
    return [...new Set(events.flatMap((e) => e.categories || []))].sort()
  }, [events])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.sources.length > 0) count += filters.sources.length
    if (filters.categories.length > 0) count += filters.categories.length
    if (filters.bookmarkedOnly) count++
    return count
  }, [filters])

  function applyFilters(events, bookmarks) {
    const query = filters.search.toLowerCase().trim()
    return events.filter((e) => {
      if (query) {
        const haystack = `${e.title} ${e.description} ${e.location}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      if (filters.sources.length > 0 && !filters.sources.includes(e.source)) return false
      if (filters.categories.length > 0) {
        const cats = e.categories || []
        if (!filters.categories.some((c) => cats.includes(c))) return false
      }
      if (filters.bookmarkedOnly && !bookmarks.has(e._id)) return false
      return true
    })
  }

  function clearFilters() {
    setFilters({ search: '', sources: [], categories: [], bookmarkedOnly: false })
  }

  return { filters, setFilters, applyFilters, clearFilters, allSources, allCategories, activeFilterCount }
}
