/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import App from './App';

afterEach(() => {
  cleanup();
});

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('c123-live-mini')).toBeTruthy();
  });

  it('shows shared package version in footer', () => {
    render(<App />);
    expect(screen.getByText(/Powered by c123-live-mini/)).toBeTruthy();
  });

  it('displays sample event title', () => {
    render(<App />);
    expect(screen.getByText('Demo Event')).toBeTruthy();
  });

  it('displays live indicator when event is running', () => {
    render(<App />);
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('shows results section', () => {
    render(<App />);
    expect(screen.getByText('Results')).toBeTruthy();
  });

  it('shows empty state when no results', () => {
    render(<App />);
    expect(screen.getByText('No results available yet')).toBeTruthy();
  });
});
