import { describe, it, expect } from 'vitest';
import { normalizeRoomCode, validateRoomCodeFormat } from './roomCode';

describe('normalizeRoomCode', () => {
  it('uppercases and strips non-alphanumeric', () => {
    expect(normalizeRoomCode('abc123')).toBe('ABC123');
    expect(normalizeRoomCode('  xY7  ')).toBe('XY7');
    expect(normalizeRoomCode('a-b_c!')).toBe('ABC');
  });

  it('returns empty string for empty or only symbols', () => {
    expect(normalizeRoomCode('')).toBe('');
    expect(normalizeRoomCode('   ')).toBe('');
    expect(normalizeRoomCode('---')).toBe('');
  });
});

describe('validateRoomCodeFormat', () => {
  it('accepts 4-8 alphanumeric', () => {
    expect(validateRoomCodeFormat('ABC1')).toEqual({ valid: true });
    expect(validateRoomCodeFormat('ABCD1234')).toEqual({ valid: true });
    expect(validateRoomCodeFormat('12345678')).toEqual({ valid: true });
  });

  it('rejects empty', () => {
    expect(validateRoomCodeFormat('')).toEqual({ valid: false, error: 'Enter a room code' });
  });

  it('rejects too short', () => {
    expect(validateRoomCodeFormat('AB1').valid).toBe(false);
    expect(validateRoomCodeFormat('AB1').error).toContain('4–8');
  });

  it('rejects too long', () => {
    expect(validateRoomCodeFormat('ABCD12345').valid).toBe(false);
    expect(validateRoomCodeFormat('ABCD12345').error).toContain('4–8');
  });
});
