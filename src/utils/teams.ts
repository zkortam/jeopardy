import type { Team } from '../types/game';

/**
 * Parse and validate teams from Firebase (array or object with numeric keys).
 * Only returns objects that have id, name, and score.
 */
export function parseTeamsFromFirebase(value: unknown): Team[] {
  const raw = Array.isArray(value) ? value : Object.values(value || {});
  return raw.filter(
    (t): t is Team =>
      !!t &&
      typeof t === 'object' &&
      typeof (t as Team).id === 'string' &&
      typeof (t as Team).name === 'string' &&
      typeof (t as Team).score === 'number'
  );
}
