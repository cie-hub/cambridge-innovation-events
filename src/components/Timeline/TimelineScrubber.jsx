import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { dayKey, getMonday } from '../../utils/dateUtils'
import { HEADER_HEIGHT, SCROLL_INTERACTION_DELAY } from '../../config/constants'
import './TimelineScrubber.css'

function buildMonthGrids(dates, eventCounts) {
  const months = new Map()

  for (const date of dates) {
    const dateStr = dayKey(date)
    const key = dateStr.slice(0, 7)
    const year = parseInt(dateStr.slice(0, 4))
    const month = parseInt(dateStr.slice(5, 7)) - 1
    if (!months.has(key)) {
      months.set(key, {
        key,
        label: new Date(year, month, 15).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
        year,
        month,
        weeks: [],
      })
    }
  }

  for (const [, monthData] of months) {
    const firstOfMonth = new Date(monthData.year, monthData.month, 1)
    const lastOfMonth = new Date(monthData.year, monthData.month + 1, 0)
    const weekStart = getMonday(firstOfMonth)
    const weeks = []
    const current = new Date(weekStart)

    while (current <= lastOfMonth) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(current)
        const inMonth = cellDate.getMonth() === monthData.month
        const dateStr = dayKey(cellDate)
        week.push({
          date: cellDate,
          dayKey: dateStr,
          inMonth,
          count: inMonth ? (eventCounts[dateStr] || 0) : 0,
        })
        current.setDate(current.getDate() + 1)
      }
      weeks.push(week)
    }
    monthData.weeks = weeks
  }

  return [...months.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export default function TimelineScrubber({ events, groupRefs }) {
  const containerRef = useRef(null)
  const [activeKey, setActiveKey] = useState(null)
  const interactionRef = useRef(0)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return dayKey(d)
  }, [])

  const { dates, eventCounts } = useMemo(() => {
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    const seen = new Set()
    const result = []
    const counts = {}
    for (const event of events) {
      const d = new Date(event.date)
      if (d < todayDate) continue
      const key = dayKey(d)
      counts[key] = (counts[key] || 0) + 1
      if (!seen.has(key)) {
        seen.add(key)
        result.push(d)
      }
    }
    result.sort((a, b) => a - b)
    return { dates: result, eventCounts: counts }
  }, [events])

  const monthGrids = useMemo(
    () => buildMonthGrids(dates, eventCounts),
    [dates, eventCounts]
  )

  const maxCount = useMemo(
    () => Math.max(1, ...Object.values(eventCounts)),
    [eventCounts]
  )

  // Scroll tracking — update activeKey based on visible timeline section
  useEffect(() => {
    if (dates.length === 0) return
    function onScroll() {
      if (Date.now() - interactionRef.current < SCROLL_INTERACTION_DELAY) return
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
  }, [dates, groupRefs])

  // Auto-scroll minimap to keep active month visible
  useEffect(() => {
    if (!activeKey || !containerRef.current) return
    const activeEl = containerRef.current.querySelector(`[data-day="${activeKey}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeKey])

  const handleDayClick = useCallback((dateStr) => {
    const el = groupRefs.current[dateStr]
    if (el) {
      interactionRef.current = Date.now()
      setActiveKey(dateStr)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [groupRefs])

  if (dates.length < 2) return null

  return (
    <div className="minimap" ref={containerRef}>
      {monthGrids.map((month) => (
        <div key={month.key} className="minimap__month">
          <div className="minimap__month-label">{month.label}</div>
          <div className="minimap__grid">
            {month.weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="minimap__week">
                {week.map((cell) => {
                  const isPast = cell.dayKey < today
                  const isActive = cell.dayKey === activeKey
                  const isToday = cell.dayKey === today
                  const hasEvents = cell.count > 0 && cell.inMonth

                  return (
                    <div
                      key={cell.dayKey}
                      data-day={cell.dayKey}
                      className={[
                        'minimap__cell',
                        !cell.inMonth && 'minimap__cell--outside',
                        isPast && cell.inMonth && 'minimap__cell--past',
                        isActive && 'minimap__cell--active',
                        isToday && 'minimap__cell--today',
                        hasEvents && 'minimap__cell--has-events',
                      ].filter(Boolean).join(' ')}
                      style={hasEvents ? {
                        '--intensity': 0.3 + (cell.count / maxCount) * 0.7,
                      } : undefined}
                      onClick={hasEvents ? () => handleDayClick(cell.dayKey) : undefined}
                    >
                      {cell.inMonth && cell.date.getUTCDate()}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
