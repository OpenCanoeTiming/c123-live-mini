/**
 * GatePenalties Component
 *
 * Displays gate-by-gate penalty visualization using compact badges.
 * Each gate shows: number and penalty status (clean/touch/miss).
 * Reverse gates are styled with italic + underlined number.
 *
 * Visual coding:
 * - Green: 0 (clean gate)
 * - Yellow: 2 (touch penalty)
 * - Red: 50 (missed gate)
 * - Gray: null (not yet passed)
 */

import { Badge } from '@czechcanoe/rvp-design-system';
import type { PublicGate } from '@c123-live-mini/shared';
import styles from './GatePenalties.module.css';

interface GatePenaltiesProps {
  gates: PublicGate[];
}

function getPenaltyVariant(penalty: number | null): 'success' | 'warning' | 'error' | 'default' {
  if (penalty === null) return 'default';
  if (penalty === 0) return 'success';
  if (penalty === 2) return 'warning';
  return 'error';
}

function GateLabel({ gate }: { gate: PublicGate }) {
  const isReverse = gate.type === 'reverse';
  return (
    <span className={isReverse ? styles.reverseGate : undefined}>
      {gate.number}
    </span>
  );
}

export function GatePenalties({ gates }: GatePenaltiesProps) {
  if (gates.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {gates.map((gate) => (
        <Badge
          key={gate.number}
          variant={getPenaltyVariant(gate.penalty)}
          size="sm"
          title={`Gate ${gate.number} (${gate.type}): ${gate.penalty === null ? 'Not passed' : gate.penalty === 0 ? 'Clean' : `+${gate.penalty}s`}`}
        >
          <GateLabel gate={gate} />
        </Badge>
      ))}
    </div>
  );
}
