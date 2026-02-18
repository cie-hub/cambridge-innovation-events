import { useState, useMemo } from 'react'
import EventCard from '../EventCard/EventCard'
import DayCell from './DayCell'
import { WEEKDAYS, compareEventTime, getDaysInMonth, getMondayOffset, eventsForDay } from '../../utils/dateUtils'
import './Calendar.css'

export default function Calendar({ events }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState(null)

  const daysInMonth = getDaysInMonth(year, month)
  const offset = getMondayOffset(year, month)
  const monthLabel = new Date(year, month).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const todayDay = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : null

  const maxCount = useMemo(() => {
    let max = 1
    for (let d = 1; d <= daysInMonth; d++) {
      const count = eventsForDay(events, year, month, d).length
      if (count > max) max = count
    }
    return max
  }, [events, year, month, daysInMonth])

  const days = []
  for (let i = 0; i < offset; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const selectedEvents = selectedDay
    ? eventsForDay(events, year, month, selectedDay).sort(compareEventTime)
    : []

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
    setSelectedDay(null)
  }

  return (
    <div className={`calendar${selectedDay ? ' calendar--panel-open' : ''}`}>
      <div className="calendar__main">
        <div className="calendar__header">
          <button className="calendar__nav" onClick={prevMonth}>&lt;</button>
          <h2 className="calendar__month">{monthLabel}</h2>
          <button className="calendar__nav" onClick={nextMonth}>&gt;</button>
        </div>

        <div className="calendar__grid">
          {WEEKDAYS.map((d) => (
            <div key={d} className="calendar__weekday">{d}</div>
          ))}
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="calendar__cell calendar__cell--empty" />
            const dayEvents = eventsForDay(events, year, month, day)
            return (
              <DayCell
                key={day}
                day={day}
                events={dayEvents}
                maxCount={maxCount}
                isSelected={selectedDay === day}
                isToday={day === todayDay}
                onSelect={setSelectedDay}
              />
            )
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="calendar__panel">
          <div className="calendar__panel-header">
            <h3 className="calendar__panel-title">
              {new Date(year, month, selectedDay).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
            <button className="calendar__panel-close" onClick={() => setSelectedDay(null)}>
              &times;
            </button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="calendar__no-events">No events on this day.</p>
          ) : (
            <div className="calendar__panel-events">
              {selectedEvents.map((event) => (
                <EventCard
                  key={event._id}
                  event={event}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
