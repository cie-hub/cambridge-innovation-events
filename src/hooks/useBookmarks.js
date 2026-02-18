import { useState } from 'react'

const STORAGE_KEY = 'cie-bookmarks'

function loadBookmarks() {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? new Set(JSON.parse(stored)) : new Set()
}

function saveBookmarks(bookmarks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...bookmarks]))
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState(loadBookmarks)

  function toggleBookmark(eventId) {
    setBookmarks((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      saveBookmarks(next)
      return next
    })
  }

  return { bookmarks, toggleBookmark }
}
