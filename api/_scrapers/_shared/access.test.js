// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { inferCostAccess } from './access.js'

describe('inferCostAccess', () => {
  it('detects "Free" in text', () => {
    const result = inferCostAccess('This event is free to attend')
    expect(result.cost).toBe('Free')
  })

  it('detects "complimentary" as free', () => {
    const result = inferCostAccess('Join us for a complimentary breakfast')
    expect(result.cost).toBe('Free')
  })

  it('detects £ price', () => {
    const result = inferCostAccess('Tickets: £25 per person')
    expect(result.cost).toBe('£25')
  })

  it('detects multi-digit £ price', () => {
    const result = inferCostAccess('Registration fee: £495')
    expect(result.cost).toBe('£495')
  })

  it('detects "members only" access', () => {
    const result = inferCostAccess('This event is for Park members only')
    expect(result.access).toBe('Members Only')
  })

  it('detects "Wolfson College members" as members only', () => {
    const result = inferCostAccess('We invite all Wolfson College members')
    expect(result.access).toBe('Members Only')
  })

  it('detects "register" as registration required', () => {
    const result = inferCostAccess('Please register via Eventbrite')
    expect(result.access).toBe('Registration Required')
  })

  it('detects "book" as registration required', () => {
    const result = inferCostAccess('Booking via Eventbrite is essential')
    expect(result.access).toBe('Registration Required')
  })

  it('detects "RSVP" as RSVP required', () => {
    const result = inferCostAccess('Please RSVP to confirm your place')
    expect(result.access).toBe('RSVP Required')
  })

  it('detects "open to all" access', () => {
    const result = inferCostAccess('This event is open to all and free to attend')
    expect(result.cost).toBe('Free')
    expect(result.access).toBe('Open to All')
  })

  it('detects "invitation only" as members only', () => {
    const result = inferCostAccess('By invitation only for CEOs on the Park')
    expect(result.access).toBe('Members Only')
  })

  it('returns nulls for text with no signals', () => {
    const result = inferCostAccess('Join us for a great event about AI')
    expect(result.cost).toBeNull()
    expect(result.access).toBeNull()
  })

  it('returns nulls for empty string', () => {
    const result = inferCostAccess('')
    expect(result.cost).toBeNull()
    expect(result.access).toBeNull()
  })

  it('does not match "free" inside other words like "freestyle"', () => {
    const result = inferCostAccess('Freestyle swimming competition')
    expect(result.cost).toBeNull()
  })

  it('returns nulls for null input', () => {
    const result = inferCostAccess(null)
    expect(result.cost).toBeNull()
    expect(result.access).toBeNull()
  })

  it('returns nulls for undefined input', () => {
    const result = inferCostAccess(undefined)
    expect(result.cost).toBeNull()
    expect(result.access).toBeNull()
  })

  it('detects decimal £ price', () => {
    const result = inferCostAccess('Early bird: £9.99 per ticket')
    expect(result.cost).toBe('£9.99')
  })
})
