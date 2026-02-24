export function trackClick(eventId) {
  const body = JSON.stringify({ eventId })
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/track', body)
    return
  }
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  })
}
