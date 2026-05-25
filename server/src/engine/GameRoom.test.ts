import { describe, it, expect, beforeEach } from 'vitest';
import { GameRoom } from './GameRoom.js';

let room: GameRoom;

beforeEach(() => {
  room = new GameRoom('TEST1');
  room.addPlayer('socket-a', 'Alice');
  room.addPlayer('socket-b', 'Bob');
});

// ── addPlayer ────────────────────────────────────────────────────────────────

describe('addPlayer', () => {
  it('makes the first player the host', () => {
    expect(room.isHost(room.getPublicState().players[0].id)).toBe(true);
  });

  it('rejects duplicate display names (case-insensitive)', () => {
    const result = room.addPlayer('socket-c', 'alice');
    expect(result.success).toBe(false);
  });

  it('rejects players when the room is at capacity', () => {
    const fullRoom = new GameRoom();
    for (let i = 0; i < 8; i++) {
      fullRoom.addPlayer(`socket-${i}`, `Player${i}`);
    }
    const result = fullRoom.addPlayer('socket-extra', 'Extra');
    expect(result.success).toBe(false);
  });

  it('assigns a unique playerId to each player', () => {
    const ids = room.getPublicState().players.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── startGame ────────────────────────────────────────────────────────────────

describe('startGame', () => {
  it('requires at least 2 players', () => {
    const solo = new GameRoom();
    solo.addPlayer('s1', 'Solo');
    expect(solo.startGame().success).toBe(false);
  });

  it('transitions phase to BIDDING', () => {
    room.startGame();
    expect(room.phase).toBe('BIDDING');
  });

  it('fails if the game is already in progress', () => {
    room.startGame();
    expect(room.startGame().success).toBe(false);
  });
});

// ── makeBid ──────────────────────────────────────────────────────────────────

describe('makeBid', () => {
  beforeEach(() => room.startGame());

  it('stores a valid bid', () => {
    const activeId = room.getActivePlayerId()!;
    const result = room.makeBid(activeId, 1, 3);
    expect(result.success).toBe(true);
    expect(room.currentBid?.quantity).toBe(1);
    expect(room.currentBid?.faceValue).toBe(3);
  });

  it('advances the turn after a successful bid', () => {
    const firstActive = room.getActivePlayerId()!;
    room.makeBid(firstActive, 1, 3);
    expect(room.getActivePlayerId()).not.toBe(firstActive);
  });

  it('rejects a bid from a non-active player', () => {
    const activeId = room.getActivePlayerId()!;
    const nonActiveId = room.getPublicState().players.find((p) => p.id !== activeId)!.id;
    const result = room.makeBid(nonActiveId, 1, 3);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid bid (not higher than current)', () => {
    const activeId = room.getActivePlayerId()!;
    room.makeBid(activeId, 2, 4);
    const nextActiveId = room.getActivePlayerId()!;
    const result = room.makeBid(nextActiveId, 2, 4); // same bid
    expect(result.success).toBe(false);
  });

  it('rejects a bid when not in BIDDING phase', () => {
    room.phase = 'LOBBY' as any;
    const activeId = room.getActivePlayerId()!;
    expect(room.makeBid(activeId, 1, 3).success).toBe(false);
  });
});

// ── callLiar ─────────────────────────────────────────────────────────────────

describe('callLiar', () => {
  beforeEach(() => room.startGame());

  it('transitions to REVEAL phase', () => {
    const activeId = room.getActivePlayerId()!;
    room.makeBid(activeId, 1, 3);
    const nonActiveId = room.getPublicState().players.find((p) => p.id !== activeId)!.id;
    room.callLiar(nonActiveId);
    expect(room.phase).toBe('REVEAL');
  });

  it('bidder loses a die when the bid is impossible', () => {
    const activeId = room.getActivePlayerId()!;
    room.makeBid(activeId, 99, 6); // impossible bid
    const nonActiveId = room.getPublicState().players.find((p) => p.id !== activeId)!.id;
    room.callLiar(nonActiveId);
    const bidder = room.getPublicState().players.find((p) => p.id === activeId)!;
    expect(bidder.diceCount).toBe(4); // started with 5, lost 1
  });

  it('rejects a liar call when there is no current bid', () => {
    const nonActiveId = room.getPublicState().players[1].id;
    expect(room.callLiar(nonActiveId).success).toBe(false);
  });

  it('rejects self-challenge (cannot challenge your own bid)', () => {
    const activeId = room.getActivePlayerId()!;
    room.makeBid(activeId, 1, 3);
    expect(room.callLiar(activeId).success).toBe(false);
  });

  it('rejects liar call from an eliminated player', () => {
    room.phase = 'LOBBY' as any; // reset to add a third player
    room.addPlayer('socket-c', 'Carol');
    room.startGame();
    const [p1] = room.getPublicState().players;
    room.makeBid(room.getActivePlayerId()!, 1, 3);
    room.removePlayerMidGame(p1.id); // p1 is eliminated
    expect(room.callLiar(p1.id).success).toBe(false);
  });

  it('returns a RoundResult with allDice on success', () => {
    const activeId = room.getActivePlayerId()!;
    room.makeBid(activeId, 99, 6);
    const nonActiveId = room.getPublicState().players.find((p) => p.id !== activeId)!.id;
    const { result } = room.callLiar(nonActiveId);
    expect(result).toBeDefined();
    expect(result!.allDice).toBeDefined();
    expect(Object.keys(result!.allDice)).toHaveLength(2);
  });
});

// ── removePlayerMidGame ──────────────────────────────────────────────────────

describe('removePlayerMidGame', () => {
  beforeEach(() => room.startGame());

  it('ends the game immediately in a 2-player game', () => {
    const [p1, p2] = room.getPublicState().players;
    const result = room.removePlayerMidGame(p1.id);
    expect(result.gameOver).toBe(true);
    expect(result.winnerId).toBe(p2.id);
  });

  it('clears the current bid when the bidder leaves', () => {
    const activeId = room.getActivePlayerId()!;
    room.makeBid(activeId, 1, 3);
    room.removePlayerMidGame(activeId);
    // Game ends immediately (2-player), but bid should have been cleared first
    expect(room.currentBid).toBeNull();
  });

  it('marks the removed player as eliminated', () => {
    // Need 3 players so the game doesn't end
    const threeRoom = new GameRoom();
    threeRoom.addPlayer('s1', 'Alice');
    threeRoom.addPlayer('s2', 'Bob');
    threeRoom.addPlayer('s3', 'Carol');
    threeRoom.startGame();
    const [p1] = threeRoom.getPublicState().players;
    threeRoom.removePlayerMidGame(p1.id);
    const eliminated = threeRoom.getPublicState().players.find((p) => p.id === p1.id)!;
    expect(eliminated.isEliminated).toBe(true);
  });

  it('reassigns the host when the host leaves mid-game', () => {
    const threeRoom = new GameRoom();
    threeRoom.addPlayer('s1', 'Alice');
    threeRoom.addPlayer('s2', 'Bob');
    threeRoom.addPlayer('s3', 'Carol');
    threeRoom.startGame();
    const hostId = threeRoom.getPublicState().players.find((p) => p.isHost)!.id;
    threeRoom.removePlayerMidGame(hostId);
    const newHost = threeRoom.getPublicState().players.find((p) => p.isHost);
    expect(newHost).toBeDefined();
    expect(newHost!.id).not.toBe(hostId);
  });
});

// ── proceedToNextRound ───────────────────────────────────────────────────────

describe('proceedToNextRound', () => {
  it('increments the round number', () => {
    room.startGame();
    expect(room.roundNumber).toBe(1);
    const activeId = room.getActivePlayerId()!;
    room.makeBid(activeId, 99, 6);
    const nonActiveId = room.getPublicState().players.find((p) => p.id !== activeId)!.id;
    room.callLiar(nonActiveId);
    room.proceedToNextRound();
    expect(room.roundNumber).toBe(2);
  });

  it('ends the game when only 1 player remains', () => {
    // Give a player 1 die remaining so they get eliminated on loss
    room.startGame();
    const activeId = room.getActivePlayerId()!;
    room.makeBid(activeId, 99, 6); // impossible bid
    const nonActiveId = room.getPublicState().players.find((p) => p.id !== activeId)!.id;
    room.callLiar(nonActiveId);

    // Force the bidder down to 0 dice to trigger elimination
    const bidderPlayer = (room as any).players.get(activeId);
    bidderPlayer.diceCount = 0;
    bidderPlayer.isEliminated = true;

    const { gameOver, winnerId } = room.proceedToNextRound();
    expect(gameOver).toBe(true);
    expect(winnerId).toBe(nonActiveId);
  });
});

// ── getPrivateState ──────────────────────────────────────────────────────────

describe('getPrivateState', () => {
  beforeEach(() => room.startGame());

  it('returns dice only for the requesting player', () => {
    const [p1] = room.getPublicState().players;
    const privateState = room.getPrivateState(p1.id);
    expect(privateState.myDice).toHaveLength(5);
  });

  it('returns empty dice for an eliminated player', () => {
    const threeRoom = new GameRoom();
    threeRoom.addPlayer('s1', 'Alice');
    threeRoom.addPlayer('s2', 'Bob');
    threeRoom.addPlayer('s3', 'Carol');
    threeRoom.startGame();
    const [p1] = threeRoom.getPublicState().players;
    threeRoom.removePlayerMidGame(p1.id);
    expect(threeRoom.getPrivateState(p1.id).myDice).toHaveLength(0);
  });

  it('canCallLiar is false when no bid exists', () => {
    const [, p2] = room.getPublicState().players;
    expect(room.getPrivateState(p2.id).canCallLiar).toBe(false);
  });

  it('canCallLiar is false for the player who made the bid', () => {
    const activeId = room.getActivePlayerId()!;
    room.makeBid(activeId, 1, 3);
    expect(room.getPrivateState(activeId).canCallLiar).toBe(false);
  });

  it('canCallLiar is true for other players when a bid exists', () => {
    const activeId = room.getActivePlayerId()!;
    room.makeBid(activeId, 1, 3);
    const nonActiveId = room.getPublicState().players.find((p) => p.id !== activeId)!.id;
    expect(room.getPrivateState(nonActiveId).canCallLiar).toBe(true);
  });
});
