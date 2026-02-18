export const log = {
  info(source, msg, data = {}) {
    console.log(JSON.stringify({ level: 'info', source, msg, ...data, ts: new Date().toISOString() }))
  },
  warn(source, msg, data = {}) {
    console.log(JSON.stringify({ level: 'warn', source, msg, ...data, ts: new Date().toISOString() }))
  },
  error(source, msg, err) {
    console.log(JSON.stringify({
      level: 'error',
      source,
      msg,
      error: err instanceof Error ? err.message : String(err),
      ts: new Date().toISOString(),
    }))
  },
}
