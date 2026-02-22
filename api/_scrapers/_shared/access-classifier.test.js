// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { inferAccess } from './access.js'

describe('inferAccess (n-gram TF-IDF classifier)', () => {
  // ── True positives: must detect correctly ──

  it('detects "register your place" as Registration Required', () => {
    expect(inferAccess('Register your place via Eventbrite')).toBe('Registration Required')
  })

  it('detects "book your place" as Registration Required', () => {
    expect(inferAccess('Please book your place via our website')).toBe('Registration Required')
  })

  it('detects "book your spot" as Registration Required', () => {
    expect(inferAccess('Book your spot for this workshop')).toBe('Registration Required')
  })

  it('detects "sign up now" as Registration Required', () => {
    expect(inferAccess('Sign up now to reserve your seat')).toBe('Registration Required')
  })

  it('detects "get tickets" as Registration Required', () => {
    expect(inferAccess('Get tickets on Eventbrite')).toBe('Registration Required')
  })

  it('detects "booking essential" as Registration Required', () => {
    expect(inferAccess('Booking essential via the website')).toBe('Registration Required')
  })

  it('detects "secure your place" as Registration Required', () => {
    expect(inferAccess('Secure your place at this event')).toBe('Registration Required')
  })

  it('detects "members only" as Members Only', () => {
    expect(inferAccess('This event is for members only')).toBe('Members Only')
  })

  it('detects "member exclusive" as Members Only', () => {
    expect(inferAccess('A member exclusive networking dinner')).toBe('Members Only')
  })

  it('detects "invitation only" as Invite Only', () => {
    expect(inferAccess('By invitation only for CEOs on the Park')).toBe('Invite Only')
  })

  it('detects "invite only" as Invite Only', () => {
    expect(inferAccess('This is an invite only briefing')).toBe('Invite Only')
  })

  it('detects "invited guests only" as Invite Only', () => {
    expect(inferAccess('Open to invited guests only')).toBe('Invite Only')
  })

  it('detects "RSVP" as RSVP Required', () => {
    expect(inferAccess('Please RSVP to confirm your attendance')).toBe('RSVP Required')
  })

  it('detects "open to all" as Open to All', () => {
    expect(inferAccess('This event is open to all and free to attend')).toBe('Public')
  })

  it('detects "everyone welcome" as Open to All', () => {
    expect(inferAccess('Everyone welcome at this public event')).toBe('Public')
  })

  it('detects "students only" as Students Only', () => {
    expect(inferAccess('Open to students only')).toBe('Students Only')
  })

  it('detects "for students" as Students Only', () => {
    expect(inferAccess('This workshop is designed for students at Cambridge')).toBe('Students Only')
  })

  it('detects "university staff and students" as University Only', () => {
    expect(inferAccess('Open to university staff and students')).toBe('Cambridge University')
  })

  it('detects "faculty only" as University Only', () => {
    expect(inferAccess('This seminar is for faculty only')).toBe('Cambridge University')
  })

  it('detects "park tenants only" as Industry Partners', () => {
    expect(inferAccess('Open to park tenants only')).toBe('Industry Partners')
  })

  it('detects "network members only" as Industry Partners', () => {
    expect(inferAccess('Exclusive to network members only')).toBe('Industry Partners')
  })

  // ── True negatives: must NOT match ──

  it('returns null for "Registration desk opens at 9am"', () => {
    expect(inferAccess('Registration desk opens at 9am')).toBeNull()
  })

  it('returns null for "Monthly Book Club meeting"', () => {
    expect(inferAccess('Monthly Book Club meeting at the Science Park')).toBeNull()
  })

  it('returns null for "Team members presented their findings"', () => {
    expect(inferAccess('Team members presented their findings on AI')).toBeNull()
  })

  it('returns null for generic event text with no signals', () => {
    expect(inferAccess('Join us for a great event about AI')).toBeNull()
  })

  it('returns null for "Freestyle swimming competition"', () => {
    expect(inferAccess('Freestyle swimming competition')).toBeNull()
  })

  it('returns null for "The student presented research"', () => {
    expect(inferAccess('The student presented research on climate change')).toBeNull()
  })

  it('returns null for "Open source software workshop"', () => {
    expect(inferAccess('Open source software workshop on Kubernetes')).toBeNull()
  })

  // ── Edge cases ──

  it('returns null for null input', () => {
    expect(inferAccess(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(inferAccess(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(inferAccess('')).toBeNull()
  })

  // ── Signal in longer text (context extraction) ──

  it('finds access signal buried in long description', () => {
    const text = 'Join us for an exciting workshop on machine learning and neural networks. We will explore deep learning architectures and their applications in healthcare. Register your place via Eventbrite to attend this free event.'
    expect(inferAccess(text)).toBe('Registration Required')
  })

  it('returns null when no access signal in long description', () => {
    const text = 'Join us for an exciting workshop on machine learning and neural networks. We will explore deep learning architectures and their applications in healthcare. Refreshments will be provided.'
    expect(inferAccess(text)).toBeNull()
  })
})
