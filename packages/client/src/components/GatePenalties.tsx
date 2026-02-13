/**
 * GatePenalties Component
 *
 * Displays gate-by-gate penalty visualization using compact badges.
 * Each gate shows: number, type (normal/reverse), and penalty status (clean/touch/miss).
 *
 * Visual coding:
 * - Green: 0 (clean gate)
 * - Yellow: 2 (touch penalty)
 * - Red: 50 (missed gate)
 * - Gray: null (not yet passed)
 */

import { Badge } from '@czechcanoe/rvp-design-system';
import type { PublicGate } from '@c123-live-mini/shared';

interface GatePenaltiesProps {
  gates: PublicGate[];
}

/**
 * Determine badge variant based on penalty value
 */
function getPenaltyVariant(penalty: number | null): 'success' | 'warning' | 'error' | 'default' {
  if (penalty === null) return 'default'; // Not yet passed
  if (penalty === 0) return 'success'; // Clean
  if (penalty === 2) return 'warning'; // Touch
  return 'error'; // Missed (50)
}

/**
 * Format gate label with number and type indicator
 */
function getGateLabel(gate: PublicGate): string {
  const typeIndicator = gate.type === 'reverse' ? 'R' : '';
  return `${gate.number}${typeIndicator}`;
}

export function GatePenalties({ gates }: GatePenaltiesProps) {
  if (gates.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
      {gates.map((gate) => (
        <Badge
          key={gate.number}
          variant={getPenaltyVariant(gate.penalty)}
          size="sm"
          title={`Gate ${gate.number} (${gate.type}): ${gate.penalty === null ? 'Not passed' : gate.penalty === 0 ? 'Clean' : `+${gate.penalty}s`}`}
        >
          {getGateLabel(gate)}
        </Badge>
      ))}
    </div>
  );
}
