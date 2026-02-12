/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import App from './App';

// Mock data — updated for Feature #6 types (no id, no disId, uses raceType)
const mockEvents = [
  {
    eventId: 'demo-2026',
    mainTitle: 'Demo Event',
    subTitle: null,
    location: 'Prague',
    startDate: '2026-02-05',
    endDate: '2026-02-06',
    discipline: null,
    status: 'running',
  },
];

// Setup fetch mock
beforeEach(() => {
  // Reset hash to home route before each test
  window.location.hash = '#/';

  global.fetch = vi.fn((url: string | URL | Request) => {
    const urlString = typeof url === 'string' ? url : url.toString();

    if (urlString.includes('/events') && !urlString.includes('/events/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents }),
      } as Response);
    }

    return Promise.reject(new Error('Unknown URL'));
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
});

describe('App', () => {
  it('renders the app title in header', () => {
    render(<App />);
    expect(screen.getByText('c123-live-mini')).toBeTruthy();
  });

  it('shows shared package version in footer', () => {
    render(<App />);
    expect(screen.getByText(/Powered by c123-live-mini/)).toBeTruthy();
  });

  it('displays event title after loading', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Demo Event')).toBeTruthy();
    });
  });

  it('shows Czech status label for running events', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('probíhá')).toBeTruthy();
    });
  });

  it('shows live indicator for running events', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Demo Event')).toBeTruthy();
    });

    // LiveIndicator renders with csk-live-indicator class
    expect(document.querySelector('.csk-live-indicator')).toBeTruthy();
  });

  it('shows loading state initially', () => {
    const { container } = render(<App />);
    // SkeletonCard renders with csk-skeleton-card class
    expect(container.querySelector('.csk-skeleton-card')).toBeTruthy();
  });

  it('shows Czech section header', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Závody')).toBeTruthy();
    });
  });
});
