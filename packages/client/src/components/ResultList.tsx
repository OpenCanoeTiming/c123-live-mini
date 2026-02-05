import type { ResultEntry, ResultsResponse } from '../services/api';

/**
 * Format time from hundredths to display format (e.g., 8520 -> "85.20")
 */
function formatTime(hundredths: number | null): string {
  if (hundredths === null) return '-';
  const seconds = hundredths / 100;
  return seconds.toFixed(2);
}

/**
 * Format penalty from hundredths (e.g., 200 -> "2")
 */
function formatPenalty(hundredths: number | null): string {
  if (hundredths === null || hundredths === 0) return '';
  return String(hundredths / 100);
}

interface ResultRowProps {
  result: ResultEntry;
}

/**
 * Single result row
 */
function ResultRow({ result }: ResultRowProps) {
  const hasStatus = result.status !== null;

  return (
    <tr className={hasStatus ? 'result-row--status' : ''}>
      <td className="result-cell result-cell--rnk">
        {result.rnk ?? '-'}
      </td>
      <td className="result-cell result-cell--bib">
        {result.bib ?? '-'}
      </td>
      <td className="result-cell result-cell--name">
        <div className="result-name">
          <span className="result-name-main">{result.name}</span>
          {result.club && (
            <span className="result-name-club">{result.club}</span>
          )}
        </div>
      </td>
      <td className="result-cell result-cell--time">
        {hasStatus ? result.status : formatTime(result.time)}
      </td>
      <td className="result-cell result-cell--pen">
        {!hasStatus && formatPenalty(result.pen)}
      </td>
      <td className="result-cell result-cell--total">
        {!hasStatus && formatTime(result.total)}
      </td>
      <td className="result-cell result-cell--behind">
        {result.totalBehind ?? ''}
      </td>
    </tr>
  );
}

interface ResultListProps {
  data: ResultsResponse;
}

/**
 * Display race results in a table
 */
export function ResultList({ data }: ResultListProps) {
  const { race, results } = data;

  if (results.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3 className="empty-state-title">No results yet</h3>
          <p className="empty-state-description">
            Results will appear here when the race starts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="result-header">
          <span className="result-header-race">Race: {race.raceId}</span>
          <span className="result-header-class">
            {race.classId ?? 'All classes'}
          </span>
          <span className="result-header-dis">{race.disId}</span>
        </div>
      </div>
      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th className="result-header-cell">Rnk</th>
              <th className="result-header-cell">Bib</th>
              <th className="result-header-cell result-header-cell--name">Name</th>
              <th className="result-header-cell">Time</th>
              <th className="result-header-cell">Pen</th>
              <th className="result-header-cell">Total</th>
              <th className="result-header-cell">Behind</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <ResultRow key={result.participantId} result={result} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
