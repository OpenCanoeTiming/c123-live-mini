/**
 * @vitest-environment jsdom
 *
 * Unit tests for the RunDetailExpand header (#159) — verifies the four
 * variants of the "St.č. [bib], N. CAT" header per the spec.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { RunDetailExpand } from './RunDetailExpand';

const detail = {
  time: 8500,
  pen: 0,
  total: 8500,
  gates: null,
  prevTime: null,
  prevPen: null,
  prevTotal: null,
  prevGates: null,
};

function header(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[class*="detailHeader"]');
}

describe('RunDetailExpand — header (#159)', () => {
  afterEach(() => cleanup());

  it('renders "St.č. [25], 3. DM" when bib, catRnk, and catId are all set', () => {
    const { container } = render(
      <RunDetailExpand detail={detail} isLoading={false} bib={25} catRnk={3} catId="DM" />
    );
    const h = header(container);
    expect(h).not.toBeNull();
    expect(h!.textContent).toContain('St.č.');
    expect(h!.textContent).toContain('25');
    expect(h!.textContent).toContain('3. DM');
  });

  it('renders "St.č. [25], DM" when catId is set but catRnk is null', () => {
    const { container } = render(
      <RunDetailExpand detail={detail} isLoading={false} bib={25} catRnk={null} catId="DM" />
    );
    const h = header(container);
    expect(h!.textContent).toContain('25');
    expect(h!.textContent).toContain('DM');
    // No rank prefix like "3. DM"
    expect(h!.textContent).not.toMatch(/\d+\.\s+DM/);
  });

  it('renders just "St.č. [25]" when catId is missing, even if catRnk is set', () => {
    const { container } = render(
      <RunDetailExpand detail={detail} isLoading={false} bib={25} catRnk={3} catId={null} />
    );
    const h = header(container);
    expect(h!.textContent).toContain('25');
    // Rank without category is suppressed — no ", 3." suffix
    expect(h!.textContent).not.toMatch(/,\s*3\./);
  });

  it('falls back to "-" when bib is null', () => {
    const { container } = render(
      <RunDetailExpand detail={detail} isLoading={false} bib={null} catRnk={null} catId={null} />
    );
    const h = header(container);
    expect(h).not.toBeNull();
    expect(h!.textContent).toContain('-');
  });
});
