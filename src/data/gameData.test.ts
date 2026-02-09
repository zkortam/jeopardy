import { describe, it, expect } from 'vitest';
import { gameData } from './gameData';

describe('gameData', () => {
  it('has at least one category', () => {
    expect(gameData.length).toBeGreaterThanOrEqual(1);
  });

  it('each category has id, name, and questions array', () => {
    for (const cat of gameData) {
      expect(cat).toHaveProperty('id');
      expect(typeof cat.id).toBe('string');
      expect(cat).toHaveProperty('name');
      expect(typeof cat.name).toBe('string');
      expect(Array.isArray(cat.questions)).toBe(true);
    }
  });

  it('each question has id, question, answer, value, answered', () => {
    for (const cat of gameData) {
      for (const q of cat.questions) {
        expect(q).toHaveProperty('id');
        expect(q).toHaveProperty('question');
        expect(q).toHaveProperty('answer');
        expect(typeof q.value).toBe('number');
        expect(typeof q.answered).toBe('boolean');
      }
    }
  });
});
