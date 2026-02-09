/**
 * Normalize room code: uppercase, alphanumeric only.
 */
export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Validate room code format: 4-8 alphanumeric characters.
 */
export function validateRoomCodeFormat(code: string): { valid: boolean; error?: string } {
  if (!code) return { valid: false, error: 'Enter a room code' };
  if (code.length < 4 || code.length > 8) {
    return { valid: false, error: 'Room code must be 4–8 letters or numbers' };
  }
  return { valid: true };
}
