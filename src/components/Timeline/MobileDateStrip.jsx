import { useRef, useEffect } from 'react'
import { dayKey } from '../../utils/dateUtils'
import './MobileDateStrip.css'

function formatPill(date) {
  const day = date.getUTCDate()
  const month = date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
  return `${day} ${month}`
}

export default function MobileDateStrip({ dates, activeKey, onDateClick }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!activeKey || !containerRef.current) return
    const activeEl = containerRef.current.querySelector(`[data-strip="${activeKey}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    }
  }, [activeKey])

  if (dates.length < 2) return null

  return (
    <div className="date-strip" ref={containerRef}>
      {dates.map((date) => {
        const dateStr = dayKey(date)
        return (
          <button
            key={dateStr}
            data-strip={dateStr}
            className={`date-strip__pill${dateStr === activeKey ? ' date-strip__pill--active' : ''}`}
            onClick={() => onDateClick(dateStr)}
          >
            {formatPill(date)}
          </button>
        )
      })}
    </div>
  )
}
