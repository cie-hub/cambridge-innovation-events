// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { log } from './log.js'

describe('log', () => {
  it('log.info outputs JSON with level, source, and message', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    log.info('test-source', 'scraped events', { count: 5 })
    expect(spy).toHaveBeenCalledOnce()
    const output = JSON.parse(spy.mock.calls[0][0])
    expect(output.level).toBe('info')
    expect(output.source).toBe('test-source')
    expect(output.msg).toBe('scraped events')
    expect(output.count).toBe(5)
    expect(output.ts).toBeDefined()
    spy.mockRestore()
  })

  it('log.warn outputs JSON with level warn', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    log.warn('test-source', 'missing field', { field: 'location' })
    const output = JSON.parse(spy.mock.calls[0][0])
    expect(output.level).toBe('warn')
    spy.mockRestore()
  })

  it('log.error outputs JSON with error message', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    log.error('test-source', 'fetch failed', new Error('404 Not Found'))
    const output = JSON.parse(spy.mock.calls[0][0])
    expect(output.level).toBe('error')
    expect(output.error).toBe('404 Not Found')
    spy.mockRestore()
  })
})
