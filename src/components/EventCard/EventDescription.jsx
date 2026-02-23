import { truncateAtSentence, trimToLastSentence } from '../../utils/truncateText'
import { MAX_DESC_LENGTH } from '../../config/constants'
import { linkify } from '../../utils/linkify'

export default function EventDescription({ text, truncate }) {
  if (!text) return null

  const processed = truncate
    ? truncateAtSentence(text, MAX_DESC_LENGTH)
    : trimToLastSentence(text)

  return (
    <p className="event-card__desc">
      {linkify(processed || text)}
      {processed && <span className="event-card__more">...</span>}
    </p>
  )
}
