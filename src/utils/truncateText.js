export function truncateAtSentence(text, maxLen) {
  if (text.length <= maxLen) return null
  const trimmed = text.slice(0, maxLen)
  const lastDot = trimmed.lastIndexOf('.')
  const lastExcl = trimmed.lastIndexOf('!')
  const lastQ = trimmed.lastIndexOf('?')
  const cutPoint = Math.max(lastDot, lastExcl, lastQ)
  if (cutPoint > maxLen * 0.3) {
    return text.slice(0, cutPoint)
  }
  const lastSpace = trimmed.lastIndexOf(' ')
  return text.slice(0, lastSpace > 0 ? lastSpace : maxLen)
}

export function trimToLastSentence(text) {
  const trimmed = text.trimEnd()
  if (/[.!?]$/.test(trimmed)) return null
  const lastDot = trimmed.lastIndexOf('.')
  const lastExcl = trimmed.lastIndexOf('!')
  const lastQ = trimmed.lastIndexOf('?')
  const cutPoint = Math.max(lastDot, lastExcl, lastQ)
  if (cutPoint > trimmed.length * 0.3) {
    return trimmed.slice(0, cutPoint)
  }
  return null
}
