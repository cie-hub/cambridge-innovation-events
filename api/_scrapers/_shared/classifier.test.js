// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { classify } from './classifier.js'

describe('classify', () => {
  it('classifies an AI event correctly', () => {
    const cats = classify(
      'Deep Learning for Drug Discovery',
      'A talk on applying neural networks and machine learning to pharmaceutical research.'
    )
    expect(cats).toContain('AI & Data')
  })

  it('classifies a networking event correctly', () => {
    const cats = classify(
      'Open Coffee Cambridge',
      'Casual coffee morning for the Cambridge community. Come and connect with fellow founders.'
    )
    expect(cats).toContain('Networking')
  })

  it('classifies a biotech event correctly', () => {
    const cats = classify(
      'Cancer Research Symposium',
      'Latest advances in genomics and therapeutics for clinical oncology.'
    )
    expect(cats).toContain('Biotech & Health')
  })

  it('classifies a startup pitch event correctly', () => {
    const cats = classify(
      'Founder Pitch Night',
      'Early-stage startups pitch to angel investors and VCs for seed funding.'
    )
    expect(cats).toContain('Startups & Founders')
  })

  it('classifies a female founders event correctly', () => {
    const cats = classify(
      'Cambridge Female Founders Network Meetup',
      'Networking event for women entrepreneurs and female founders in tech.'
    )
    expect(cats).toContain('Female Founders')
  })

  it('classifies a product management event correctly', () => {
    const cats = classify(
      "It's not you, it's the system: exploring imposter feelings in Product people",
      'A talk on product management, product leadership, and the challenges product managers face.'
    )
    expect(cats).toContain('Product Management')
  })

  it('assigns multiple categories when appropriate', () => {
    const cats = classify(
      'AI Startup Demo Day',
      'Machine learning startups pitch their products to venture capital investors.'
    )
    expect(cats.length).toBeGreaterThanOrEqual(1)
    expect(cats.length).toBeLessThanOrEqual(2)
  })

  it('returns empty array for empty input', () => {
    const cats = classify('', '')
    expect(cats).toEqual([])
  })

  it('returns at most 2 categories', () => {
    const cats = classify(
      'Innovation Summit',
      'A workshop on AI strategy for sustainable biotech investment with networking.'
    )
    expect(cats.length).toBeLessThanOrEqual(2)
  })

  it('only returns categories from the fixed taxonomy', () => {
    const validCategories = [
      'AI & Data', 'Biotech & Health', 'Startups & Founders',
      'Investment & Finance', 'Networking', 'Workshops & Training',
      'Talks & Lectures', 'Science & Research', 'Sustainability',
      'Technology', 'Policy & Society', 'Innovation & Strategy', 'Female Founders', 'Product Management',
    ]
    const cats = classify(
      'Cambridge Tech Workshop',
      'Hands-on programming session for software developers.'
    )
    for (const cat of cats) {
      expect(validCategories).toContain(cat)
    }
  })
})
