import { useState, memo } from 'react'
import { formatSource } from '../../utils/formatSource'
import { formatFullDate } from '../../utils/dateUtils'
import { useBookmarkContext } from '../../context/BookmarkContext'
import BookmarkIcon from '../BookmarkIcon'
import EventDescription from './EventDescription'
import './EventCard.css'

function EventCard({ event, onSelect }) {
  const { bookmarks, toggleBookmark } = useBookmarkContext()
  const bookmarked = bookmarks.has(event._id)
  const [expanded, setExpanded] = useState(false)

  const date = new Date(event.date)
  const dateStr = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  function handleCardClick(e) {
    if (e.target.closest('a') || e.target.closest('button')) return
    if (onSelect) {
      onSelect(event)
      return
    }
    setExpanded((prev) => !prev)
  }

  const hasDetail = event.description || event.location || event.endDate || event.imageUrl || event.time

  return (
    <article
      className={`event-card ${expanded ? 'event-card--expanded' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setExpanded((prev) => !prev)
        }
      }}
    >
      <div className="event-card__body">
        <div className="event-card__content">
          <div className="event-card__top">
            <a
              className="event-card__title"
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {event.title}
            </a>
            <div className="event-card__actions">
              <button
                className={`event-card__bookmark ${bookmarked ? 'event-card__bookmark--active' : ''}`}
                onClick={() => toggleBookmark(event._id)}
                aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                <BookmarkIcon filled={bookmarked} />
              </button>
              <span className={`event-card__chevron ${expanded ? 'event-card__chevron--open' : ''}`} aria-hidden="true">
                &#x25BE;
              </span>
            </div>
          </div>
          <div className="event-card__meta">
            <span className="event-card__date">{dateStr}</span>
            {event.time && <span className="event-card__time">{event.time}</span>}
            {event.location && <span className="event-card__location">{event.location}</span>}
            <span className="event-card__source">{formatSource(event.source)}</span>
            {/* Needs improvement — cost & access disabled for now */}
          </div>
          {!expanded && <EventDescription text={event.description} truncate />}
          {!expanded && event.categories?.length > 0 && (
            <div className="event-card__tags">
              {event.categories.map((cat) => (
                <span key={cat} className="event-card__tag">{cat}</span>
              ))}
            </div>
          )}
        </div>

        {!expanded && event.imageUrl && (
          <div className="event-card__thumb">
            <img src={event.imageUrl} alt="" loading="lazy" />
            <div className="event-card__thumb-fade" />
          </div>
        )}
      </div>

      {expanded && hasDetail && (
        <div className="event-card__detail">
          <div className="event-card__detail-info">
            <EventDescription text={event.description} />
            {event.categories?.length > 0 && (
              <div className="event-card__tags">
                {event.categories.map((cat) => (
                  <span key={cat} className="event-card__tag">{cat}</span>
                ))}
              </div>
            )}
            <div className="event-card__detail-fields">
              {event.endDate ? (
                <div className="event-card__detail-row">
                  <span className="event-card__detail-label">Dates</span>
                  <span>{formatFullDate(event.date)} — {formatFullDate(event.endDate)}</span>
                </div>
              ) : (
                <div className="event-card__detail-row">
                  <span className="event-card__detail-label">Date</span>
                  <span>{formatFullDate(event.date)}</span>
                </div>
              )}
              {event.time && (
                <div className="event-card__detail-row">
                  <span className="event-card__detail-label">Time</span>
                  <span>{event.time}</span>
                </div>
              )}
              {event.location && (
                <div className="event-card__detail-row">
                  <span className="event-card__detail-label">Location</span>
                  <span>{event.location}</span>
                </div>
              )}
              {/* Needs improvement — cost & access disabled for now */}
            </div>
            <div className="event-card__detail-row">
              <a
                className="event-card__source-link"
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on {formatSource(event.source)} &rarr;
              </a>
            </div>
            {event.scrapedAt && (
              <div className="event-card__scraped">
                Last updated {new Date(event.scrapedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            )}
          </div>
          {event.imageUrl && (
            <div className="event-card__detail-image">
              <img src={event.imageUrl} alt={event.title} loading="lazy" />
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default memo(EventCard)
