/**
 * Gate Transformation Utility
 *
 * Transforms positional penalty arrays + gate_config into self-describing
 * PublicGate[] objects. Used during ingest to store abstracted data.
 *
 * Reference: specs/006-client-api/research.md R2
 */

import type { PublicGate, PublicGateType } from '@c123-live-mini/shared';

/**
 * Map gate config character to gate type
 */
function charToGateType(char: string): PublicGateType {
  switch (char) {
    case 'N':
      return 'normal';
    case 'R':
      return 'reverse';
    case 'S':
      // S = Start gate, treat as normal
      return 'normal';
    default:
      return 'unknown';
  }
}

/**
 * Transform positional penalty array + gate config into self-describing objects
 *
 * @param penalties - Array of penalty values (0, 2, 50) or positional string
 * @param gateConfig - Gate config string (e.g., "NNRNSNNRNSRNNNSRNNNSRRNS")
 * @returns Array of self-describing gate objects
 */
export function transformGates(
  penalties: number[] | string | null,
  gateConfig: string | null
): PublicGate[] {
  if (!penalties) {
    return [];
  }

  // Parse penalties if string (legacy format: "0 2 0 50" or "000200050")
  let penaltyArray: number[];
  if (typeof penalties === 'string') {
    // Check if it's whitespace-separated
    if (penalties.includes(' ')) {
      penaltyArray = penalties.split(/\s+/).map((p) => parseInt(p, 10) || 0);
    } else {
      // Legacy format: single digits per gate (0, 2, 5 for 50)
      penaltyArray = penalties.split('').map((p) => {
        const val = parseInt(p, 10);
        // 5 in this format means 50 (missed gate)
        return val === 5 ? 50 : val || 0;
      });
    }
  } else {
    penaltyArray = penalties;
  }

  // Get gate types from config (excluding 'S' markers from count)
  const configChars = gateConfig?.split('') ?? [];
  // Filter out 'S' (start) markers for gate numbering
  const gateChars = configChars.filter((c) => c !== 'S');

  // Build self-describing gate objects
  const gates: PublicGate[] = [];
  for (let i = 0; i < penaltyArray.length; i++) {
    const gateType = i < gateChars.length ? charToGateType(gateChars[i]) : 'unknown';
    gates.push({
      number: i + 1,
      type: gateType,
      penalty: penaltyArray[i] ?? null,
    });
  }

  return gates;
}

/**
 * Transform gate data from TCP/JSON format to self-describing objects
 * TCP format: [{gate: 1, time: ..., pen: 0}, {gate: 2, time: ..., pen: 2}, ...]
 *
 * @param tcpGates - Array of gate data from TCP
 * @param gateConfig - Gate config string from course
 * @returns Array of self-describing gate objects
 */
export function transformTcpGates(
  tcpGates: Array<{ gate: number; time?: number; pen?: number }> | null,
  gateConfig: string | null
): PublicGate[] {
  if (!tcpGates || tcpGates.length === 0) {
    return [];
  }

  // Filter out 'S' (start) markers from config
  const gateChars = gateConfig?.split('').filter((c) => c !== 'S') ?? [];

  // Build self-describing gate objects from TCP data
  return tcpGates.map((g) => ({
    number: g.gate,
    type: g.gate <= gateChars.length ? charToGateType(gateChars[g.gate - 1]) : 'unknown',
    penalty: g.pen ?? null,
  }));
}

/**
 * Parse legacy gate string format to self-describing objects
 * This handles the seed data format where gates is stored as a string of digits
 * Example: "0000000000000000020" -> gates with penalties at position 18
 *
 * @param gatesString - String of single-digit penalties
 * @param gateConfig - Gate config string
 * @returns Array of self-describing gate objects
 */
export function parseGateString(
  gatesString: string | null,
  gateConfig: string | null
): PublicGate[] {
  if (!gatesString) {
    return [];
  }
  return transformGates(gatesString, gateConfig);
}

/**
 * Convert self-describing gates back to JSON string for storage
 */
export function gatesToJson(gates: PublicGate[]): string {
  return JSON.stringify(gates);
}

/**
 * Parse stored JSON gates string to PublicGate array
 */
export function parseStoredGates(gatesJson: string | null): PublicGate[] | null {
  if (!gatesJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(gatesJson);
    // Check if it's already in the new format
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && 'number' in parsed[0]) {
      return parsed as PublicGate[];
    }
    // Legacy format: array of numbers
    if (Array.isArray(parsed) && (parsed.length === 0 || typeof parsed[0] === 'number')) {
      // This is legacy format, can't transform without gate config
      return null;
    }
    return null;
  } catch {
    return null;
  }
}
