/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
import { useBookmarks } from '../hooks/useBookmarks'

const BookmarkContext = createContext(null)

export function BookmarkProvider({ children }) {
  const value = useBookmarks()
  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>
}

export function useBookmarkContext() {
  const ctx = useContext(BookmarkContext)
  if (!ctx) throw new Error('useBookmarkContext must be used within BookmarkProvider')
  return ctx
}
