import { useEffect, useRef } from 'react'
import { formatSource } from '../../utils/formatSource'
import { trimToLastSentence } from '../../utils/truncateText'
import { formatFullDate } from '../../utils/dateUtils'
import { useBookmarkContext } from '../../context/BookmarkContext'
import BookmarkIcon from '../BookmarkIcon'
import './EventPopup.css'

export default function EventPopup({ event, onClose }) {
  const { bookmarks, toggleBookmark } = useBookmarkContext()
  const popupRef = useRef(null)
  const bookmarked = bookmarks.has(event._id)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    if (popupRef.current) popupRef.current.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  const description = event.description ? trimToLastSentence(event.description) : null

  return (
    <div className="event-popup__backdrop" onClick={handleBackdropClick}>
      <div className="event-popup" ref={popupRef} tabIndex={-1} role="dialog" aria-label={event.title}>
        <button className="event-popup__close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        {event.imageUrl && (
          <div className="event-popup__image">
            <img src={event.imageUrl} alt={event.title} loading="lazy" />
          </div>
        )}

        <div className="event-popup__content">
          <a
            className="event-popup__title"
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {event.title}
          </a>

          <div className="event-popup__fields">
            <div className="event-popup__field">
              <span className="event-popup__field-label">Date</span>
              <span>
                {formatFullDate(event.date)}
                {event.endDate && ` — ${formatFullDate(event.endDate)}`}
              </span>
            </div>
            {event.time && (
              <div className="event-popup__field">
                <span className="event-popup__field-label">Time</span>
                <span>{event.time}</span>
              </div>
            )}
            {event.location && (
              <div className="event-popup__field">
                <span className="event-popup__field-label">Location</span>
                <span>{event.location}</span>
              </div>
            )}
            {event.cost && event.cost !== 'Free' && (
              <div className="event-popup__field">
                <span className="event-popup__field-label">Cost</span>
                <span>{event.cost}</span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="event-popup__desc">
              {description || event.description}
              {description && <span className="event-popup__more">...</span>}
            </p>
          )}

          {event.categories?.length > 0 && (
            <div className="event-popup__tags">
              {event.categories.map((cat) => (
                <span key={cat} className="event-popup__tag">{cat}</span>
              ))}
            </div>
          )}

          <div className="event-popup__footer">
            <a
              className="event-popup__link"
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on {formatSource(event.source)} &rarr;
            </a>
            <button
              className={`event-popup__bookmark ${bookmarked ? 'event-popup__bookmark--active' : ''}`}
              onClick={() => toggleBookmark(event._id)}
            >
              <BookmarkIcon filled={bookmarked} size={14} style={{ verticalAlign: '-2px' }} /> {bookmarked ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
