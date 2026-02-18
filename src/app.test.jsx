import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

beforeEach(() => {
  const store = {}
  global.localStorage = {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = val }),
    removeItem: vi.fn((key) => { delete store[key] }),
  }
  global.fetch = vi.fn((url) => {
    if (url === '/api/events') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ events: [] }),
      })
    }
  })
})

describe('App', () => {
  it('renders the header', async () => {
    render(<App />)
    expect(screen.getByText('Cambridge Innovation Events Hub')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('No events found.')).toBeInTheDocument()
    })
  })
})
