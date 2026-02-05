/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import App from './App';

// Mock data
const mockEvents = [
  {
    id: 1,
    eventId: 'demo-2026',
    mainTitle: 'Demo Event',
    subTitle: null,
    location: 'Prague',
    startDate: '2026-02-05',
    endDate: '2026-02-06',
    status: 'running',
  },
];

const mockEventDetails = {
  event: {
    id: 1,
    eventId: 'demo-2026',
    mainTitle: 'Demo Event',
    subTitle: null,
    location: 'Prague',
    facility: null,
    startDate: '2026-02-05',
    endDate: '2026-02-06',
    discipline: null,
    status: 'running',
  },
  classes: [],
  races: [
    {
      raceId: 'k1m-final',
      classId: 'K1M',
      disId: 'SL',
      raceOrder: 1,
      startTime: null,
      raceStatus: 4,
    },
  ],
};

const mockResults = {
  race: {
    raceId: 'k1m-final',
    classId: 'K1M',
    disId: 'SL',
    raceStatus: 4,
  },
  results: [],
};

// Setup fetch mock
beforeEach(() => {
  global.fetch = vi.fn((url: string | URL | Request) => {
    const urlString = typeof url === 'string' ? url : url.toString();

    if (urlString.includes('/events/demo-2026/results/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResults),
      } as Response);
    }

    if (urlString.includes('/events/demo-2026')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockEventDetails),
      } as Response);
    }

    if (urlString.includes('/events')) {
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

  it('displays event title after loading', async () => {
    render(<App />);

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Demo Event')).toBeTruthy();
    });
  });

  it('displays live indicator when event is running', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for events list to load
    await waitFor(() => {
      expect(screen.getByText('Demo Event')).toBeTruthy();
    });

    // Click on the event to select it
    await user.click(screen.getByText('Demo Event'));

    // Wait for Live indicator to appear
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeTruthy();
    });
  });

  it('shows no results state when race has empty results', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for events list to load
    await waitFor(() => {
      expect(screen.getByText('Demo Event')).toBeTruthy();
    });

    // Click on the event to select it
    await user.click(screen.getByText('Demo Event'));

    // Wait for empty results state
    await waitFor(() => {
      expect(screen.getByText('No results yet')).toBeTruthy();
    });
  });

  it('shows loading state initially', () => {
    render(<App />);
    expect(screen.getByText('Loading events...')).toBeTruthy();
  });
});
