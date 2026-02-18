import { memo } from 'react'
import { INTENSITY_BASE, INTENSITY_RANGE } from '../../config/constants'

function DayCell({ day, events, maxCount, isSelected, isToday, onSelect }) {
  const count = events.length
  const hasEvents = count > 0
  const intensity = hasEvents ? INTENSITY_BASE + (count / maxCount) * INTENSITY_RANGE : 0

  return (
    <button
      className={[
        'calendar__cell',
        hasEvents && 'calendar__cell--has-events',
        isSelected && 'calendar__cell--selected',
        isToday && 'calendar__cell--today',
      ].filter(Boolean).join(' ')}
      style={hasEvents ? { '--cell-intensity': intensity } : undefined}
      onClick={() => onSelect(isSelected ? null : day)}
    >
      <div className="calendar__cell-top">
        <span className="calendar__day-number">{day}</span>
        {hasEvents && (
          <span className="calendar__count-badge">{count}</span>
        )}
      </div>
      {hasEvents && (
        <div className="calendar__cell-previews">
          {events.slice(0, 2).map((e) => (
            <span key={e._id} className="calendar__cell-preview">{e.title}</span>
          ))}
        </div>
      )}
    </button>
  )
}

export default memo(DayCell)
