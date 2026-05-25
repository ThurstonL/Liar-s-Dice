import { describe, it, expect } from 'vitest';
import { DiceEngine } from './DiceEngine.js';

describe('rollDice', () => {
  it('returns the requested number of dice', () => {
    expect(DiceEngine.rollDice(5)).toHaveLength(5);
    expect(DiceEngine.rollDice(1)).toHaveLength(1);
    expect(DiceEngine.rollDice(0)).toHaveLength(0);
  });

  it('only produces values between 1 and 6', () => {
    const dice = DiceEngine.rollDice(100);
    expect(dice.every((d) => d >= 1 && d <= 6)).toBe(true);
  });
});

describe('isValidBid', () => {
  it('accepts any valid first bid', () => {
    expect(DiceEngine.isValidBid({ quantity: 1, faceValue: 3, playerId: 'x' }, null)).toBe(true);
    expect(DiceEngine.isValidBid({ quantity: 5, faceValue: 6, playerId: 'x' }, null)).toBe(true);
  });

  it('rejects a first bid with quantity less than 1', () => {
    expect(DiceEngine.isValidBid({ quantity: 0, faceValue: 3, playerId: 'x' }, null)).toBe(false);
  });

  it('rejects a first bid with faceValue out of range', () => {
    expect(DiceEngine.isValidBid({ quantity: 1, faceValue: 0, playerId: 'x' }, null)).toBe(false);
    expect(DiceEngine.isValidBid({ quantity: 1, faceValue: 7, playerId: 'x' }, null)).toBe(false);
  });

  it('accepts a higher quantity regardless of face value', () => {
    const current = { quantity: 2, faceValue: 6, playerId: 'x' };
    expect(DiceEngine.isValidBid({ quantity: 3, faceValue: 1, playerId: 'y' }, current)).toBe(true);
  });

  it('accepts the same quantity with a higher face value', () => {
    const current = { quantity: 2, faceValue: 4, playerId: 'x' };
    expect(DiceEngine.isValidBid({ quantity: 2, faceValue: 5, playerId: 'y' }, current)).toBe(true);
  });

  it('rejects the same quantity and same face value', () => {
    const current = { quantity: 2, faceValue: 4, playerId: 'x' };
    expect(DiceEngine.isValidBid({ quantity: 2, faceValue: 4, playerId: 'y' }, current)).toBe(false);
  });

  it('rejects the same quantity with a lower face value', () => {
    const current = { quantity: 2, faceValue: 4, playerId: 'x' };
    expect(DiceEngine.isValidBid({ quantity: 2, faceValue: 3, playerId: 'y' }, current)).toBe(false);
  });

  it('rejects a lower quantity', () => {
    const current = { quantity: 3, faceValue: 4, playerId: 'x' };
    expect(DiceEngine.isValidBid({ quantity: 2, faceValue: 6, playerId: 'y' }, current)).toBe(false);
  });
});

describe('countMatchingDice', () => {
  it('counts exact face value matches', () => {
    const allDice = { a: [1, 2, 3], b: [3, 4, 5] };
    expect(DiceEngine.countMatchingDice(allDice, 3, false)).toBe(2);
  });

  it('returns 0 when no dice match', () => {
    const allDice = { a: [1, 2, 4], b: [5, 6, 4] };
    expect(DiceEngine.countMatchingDice(allDice, 3, false)).toBe(0);
  });

  it('counts 1s as wildcards when wildOnes is enabled', () => {
    const allDice = { a: [1, 1, 3], b: [3, 5, 6] };
    // 2 literal 3s + 2 wild 1s = 4
    expect(DiceEngine.countMatchingDice(allDice, 3, true)).toBe(4);
  });

  it('does not wildcard 1s when bidding on 1s', () => {
    const allDice = { a: [1, 1, 3] };
    expect(DiceEngine.countMatchingDice(allDice, 1, true)).toBe(2);
  });

  it('does not use wildcards when wildOnes is disabled', () => {
    const allDice = { a: [1, 1, 3] };
    expect(DiceEngine.countMatchingDice(allDice, 3, false)).toBe(1);
  });

  it('returns 0 for empty dice', () => {
    expect(DiceEngine.countMatchingDice({}, 3, false)).toBe(0);
    expect(DiceEngine.countMatchingDice({ a: [] }, 3, false)).toBe(0);
  });
});

describe('evaluateChallenge', () => {
  const settings = { startingDiceCount: 5, wildOnes: false, maxPlayers: 8 };

  it('bid is correct when matching count meets the quantity', () => {
    const allDice = { a: [3, 3, 1], b: [3, 2, 5] };
    const bid = { quantity: 3, faceValue: 3, playerId: 'a' };
    const { bidWasCorrect, totalMatchingDice } = DiceEngine.evaluateChallenge(bid, allDice, settings);
    expect(bidWasCorrect).toBe(true);
    expect(totalMatchingDice).toBe(3);
  });

  it('bid is wrong when matching count falls short', () => {
    const allDice = { a: [1, 2, 4], b: [5, 6, 2] };
    const bid = { quantity: 3, faceValue: 3, playerId: 'a' };
    const { bidWasCorrect } = DiceEngine.evaluateChallenge(bid, allDice, settings);
    expect(bidWasCorrect).toBe(false);
  });

  it('applies wildOnes when enabled', () => {
    const wildSettings = { ...settings, wildOnes: true };
    const allDice = { a: [1, 1, 3] };
    // bid on 3s: 1 literal + 2 wild 1s = 3 matching → bid correct
    const bid = { quantity: 3, faceValue: 3, playerId: 'a' };
    const { bidWasCorrect } = DiceEngine.evaluateChallenge(bid, allDice, wildSettings);
    expect(bidWasCorrect).toBe(true);
  });
});

describe('generateRoomCode', () => {
  const ALLOWED = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');

  it('returns a 5-character code', () => {
    expect(DiceEngine.generateRoomCode()).toHaveLength(5);
  });

  it('only uses allowed characters', () => {
    for (let i = 0; i < 20; i++) {
      const code = DiceEngine.generateRoomCode();
      expect([...code].every((c) => ALLOWED.has(c))).toBe(true);
    }
  });
});
