const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g

export function linkify(text) {
  const parts = text.split(URL_RE)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
      : part
  )
}
