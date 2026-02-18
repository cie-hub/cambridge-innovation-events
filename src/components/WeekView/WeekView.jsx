import { useState, useCallback, useRef, useEffect } from 'react'
import EventCard from '../EventCard/EventCard'
import EventPopup from '../EventPopup/EventPopup'
import { WEEKDAYS, getMonday } from '../../utils/dateUtils'
import { useDragScroll } from '../../hooks/useDragScroll'
import { TIME_SLOTS, HOUR_HEIGHT, START_HOUR } from '../../config/constants'
import { addDays, sameDay, formatDateShort, formatHour, layoutColumn } from '../../utils/layoutUtils'
import './WeekView.css'

export default function WeekView({ events }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [now, setNow] = useState(() => new Date())
  const bodyRef = useRef(null)
  useDragScroll(bodyRef)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const totalHeight = TIME_SLOTS.length * HOUR_HEIGHT

  const weekDays = WEEKDAYS.map((label, i) => {
    const date = addDays(weekStart, i)
    const dayEvents = events.filter((e) => sameDay(new Date(e.date), date))
    return { label, date, events: dayEvents }
  })

  const isCurrentWeek = weekDays.some(({ date }) => sameDay(date, now))
  const nowTop = (now.getHours() - START_HOUR + now.getMinutes() / 60) * HOUR_HEIGHT
  const nowVisible = isCurrentWeek && now.getHours() >= START_HOUR && now.getHours() < START_HOUR + TIME_SLOTS.length

  useEffect(() => {
    if (nowVisible && bodyRef.current) {
      bodyRef.current.scrollTop = Math.max(0, nowTop - 150)
    }
  }, [])

  const rangeLabel = `${formatDateShort(weekStart)} — ${formatDateShort(addDays(weekStart, 6))}`

  const handleSelect = useCallback((event) => {
    setSelectedEvent(event)
  }, [])

  return (
    <div className="week-view">
      <div className="week-view__header">
        <button className="week-view__nav" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          &lt;
        </button>
        <h2 className="week-view__range">{rangeLabel}</h2>
        <button className="week-view__nav" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          &gt;
        </button>
      </div>

      <div className="week-view__body" ref={bodyRef}>
        <div className="week-view__time-axis">
          <div className="week-view__time-axis-header">Time</div>
          {TIME_SLOTS.map((hour) => (
            <div key={hour} className="week-view__time-slot">
              {formatHour(hour)}
            </div>
          ))}
        </div>

        <div className="week-view__grid-body">
          <div className="week-view__headers-row">
            {weekDays.map(({ label, date }) => {
              const isToday = sameDay(date, new Date())
              return (
                <div
                  key={label}
                  className={`week-view__day-header ${isToday ? 'week-view__day-header--today' : ''}`}
                >
                  <span className="week-view__day-label">{label}</span>
                  <span className="week-view__day-date">{date.getDate()}</span>
                </div>
              )
            })}
          </div>

          <div className="week-view__columns" style={{ height: totalHeight, position: 'relative' }}>
            {nowVisible && (
              <div className="week-view__now-line" style={{ top: nowTop }}>
                <span className="week-view__now-label">
                  {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
            )}
            {weekDays.map(({ label, events: dayEvents }) => {
              const { positioned, untimed } = layoutColumn(dayEvents)
              return (
                <div key={label} className="week-view__event-column">
                  {positioned.map(({ event, top, colIndex, colCount }) => {
                    const widthPct = 100 / colCount
                    const leftPct = colIndex * widthPct
                    return (
                      <div
                        key={event._id}
                        className="week-view__event-slot"
                        style={{
                          position: 'absolute',
                          top,
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                      >
                        <EventCard
                          event={event}
                          onSelect={handleSelect}
                        />
                      </div>
                    )
                  })}
                  {untimed.map((event) => (
                    <div
                      key={event._id}
                      className="week-view__event-slot"
                      style={{ position: 'relative' }}
                    >
                      <EventCard
                        event={event}
                        onSelect={handleSelect}
                      />
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {selectedEvent && (
        <EventPopup event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  )
}
