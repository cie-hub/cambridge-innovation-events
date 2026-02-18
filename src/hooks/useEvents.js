import { useState, useEffect } from 'react'

export function useEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/events')

      if (!res.ok) {
        setError('Failed to load events')
        setLoading(false)
        return
      }

      const data = await res.json()
      const filtered = data.events.filter(
        (e) => !/^private\s+(meeting|event)$/i.test(e.title?.trim())
      )
      setEvents(filtered)
      setLoading(false)
    }

    load()
  }, [])

  return { events, loading, error }
}
