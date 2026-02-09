import { describe, it, expect } from 'vitest';
import { parseTeamsFromFirebase } from './teams';

describe('parseTeamsFromFirebase', () => {
  it('returns valid teams from array', () => {
    const input = [
      { id: '1', name: 'Team A', score: 0 },
      { id: '2', name: 'Team B', score: 100 },
    ];
    expect(parseTeamsFromFirebase(input)).toEqual(input);
  });

  it('returns valid teams from object (Firebase numeric keys)', () => {
    const input = {
      0: { id: '1', name: 'Team A', score: 0 },
      1: { id: '2', name: 'Team B', score: 0 },
    };
    expect(parseTeamsFromFirebase(input)).toEqual([
      { id: '1', name: 'Team A', score: 0 },
      { id: '2', name: 'Team B', score: 0 },
    ]);
  });

  it('filters out invalid entries', () => {
    const input = [
      { id: '1', name: 'Team A', score: 0 },
      { id: '2', name: 'Team B' }, // missing score
      null,
      { name: 'NoId', score: 0 }, // missing id
      { id: '3', name: 'Team C', score: 50 },
    ];
    expect(parseTeamsFromFirebase(input)).toEqual([
      { id: '1', name: 'Team A', score: 0 },
      { id: '3', name: 'Team C', score: 50 },
    ]);
  });

  it('returns empty array for null or undefined', () => {
    expect(parseTeamsFromFirebase(null)).toEqual([]);
    expect(parseTeamsFromFirebase(undefined)).toEqual([]);
  });
});
