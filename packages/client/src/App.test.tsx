/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import App from './App'

afterEach(() => {
  cleanup()
})

describe('App', () => {
  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByText('c123-live-mini')).toBeTruthy()
  })

  it('shows shared package version', () => {
    render(<App />)
    expect(screen.getByText(/Shared package version:/)).toBeTruthy()
  })

  it('displays sample event', () => {
    render(<App />)
    expect(screen.getByText(/Demo Event/)).toBeTruthy()
  })
})
