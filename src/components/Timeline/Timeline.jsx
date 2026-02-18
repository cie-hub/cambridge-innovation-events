import { useRef, useState, useEffect, useCallback } from 'react'
import EventCard from '../EventCard/EventCard'
import TimelineScrubber from './TimelineScrubber'
import MobileDateStrip from './MobileDateStrip'
import { compareEventTime } from '../../utils/dateUtils'
import { HEADER_HEIGHT } from '../../config/constants'
import './Timeline.css'

function groupByDate(events) {
  const groups = {}
  for (const event of events) {
    const key = new Date(event.date).toISOString().split('T')[0]
    if (!groups[key]) groups[key] = { date: new Date(event.date), events: [] }
    groups[key].events.push(event)
  }
  for (const group of Object.values(groups)) {
    group.events.sort(compareEventTime)
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}

function formatGroupDate(date) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function Timeline({ events }) {
  const groupRefs = useRef({})
  const [activeKey, setActiveKey] = useState(null)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = events.filter((e) => new Date(e.date) >= today)
  const groups = groupByDate(upcoming)
  const stripDates = groups.map(([, { date }]) => date)

  useEffect(() => {
    if (groups.length === 0) return
    function onScroll() {
      const keys = Object.keys(groupRefs.current)
      if (keys.length === 0) return
      let closest = null
      let closestDist = Infinity
      for (const key of keys) {
        const el = groupRefs.current[key]
        if (!el) continue
        const dist = Math.abs(el.getBoundingClientRect().top - HEADER_HEIGHT)
        if (dist < closestDist) {
          closestDist = dist
          closest = key
        }
      }
      if (closest) setActiveKey(closest)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [groups.length])

  const handleStripClick = useCallback((dateKey) => {
    const el = groupRefs.current[dateKey]
    if (el) {
      setActiveKey(dateKey)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  if (upcoming.length === 0) {
    return <p className="timeline__empty">No events found.</p>
  }

  return (
    <div className="timeline">
      <TimelineScrubber events={upcoming} groupRefs={groupRefs} />
      <div className="timeline__content">
        {groups.map(([key, { date, events: dayEvents }]) => (
          <section
            key={key}
            className="timeline__group"
            ref={(el) => { groupRefs.current[key] = el }}
          >
            <h2 className="timeline__date">{formatGroupDate(date)}</h2>
            <div className="timeline__events">
              {dayEvents.map((event) => (
                <EventCard
                  key={event._id}
                  event={event}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      <MobileDateStrip dates={stripDates} activeKey={activeKey} onDateClick={handleStripClick} />
    </div>
  )
}
