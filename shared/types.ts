// Game phases (FSM states)
export type GamePhase = 'LOBBY' | 'ROLL' | 'BIDDING' | 'REVEAL' | 'ROUND_END' | 'GAME_END';

// Game settings (configured by host in lobby)
export interface GameSettings {
    startingDiceCount: number; // Default: 5
    wildOnes: boolean;         // 1s count as wild
    maxPlayers: number;        // Suggested: 8, no hard cap
}

// Public player info (visible to all)
export interface PublicPlayer {
    id: string;
    displayName: string;
    diceCount: number;
    isEliminated: boolean;
    isConnected: boolean;
    isHost: boolean;
}

// Current bid
export interface Bid {
    quantity: number;
    faceValue: number; // 1-6
    playerId: string;
}

// Public state (broadcast to all)
export interface PublicGameState {
    phase: GamePhase;
    roomCode: string;
    roomId: string;
    roundNumber: number;
    settings: GameSettings;
    currentBid: Bid | null;
    activePlayerId: string | null;
    players: PublicPlayer[];
    revealedDice?: Record<string, number[]>; // Only during REVEAL
    winnerId?: string; // Set during GAME_END
    lastRoundResult?: RoundResult; // Result of last challenge
}

// Private state (per player)
export interface PrivateGameState {
    myDice: number[];
    isMyTurn: boolean;
    canBid: boolean;
    canCallLiar: boolean;
}

// Result of a challenge
export interface RoundResult {
    challengerId: string;
    challengedPlayerId: string;
    bid: Bid;
    totalMatchingDice: number;
    bidWasCorrect: boolean;
    loserId: string;
    allDice: Record<string, number[]>;
}

// Socket event types
export interface ClientToServerEvents {
    CREATE_ROOM: (data: { playerName: string }) => void;
    JOIN_ROOM: (data: { roomCode: string; playerName: string }) => void;
    UPDATE_SETTINGS: (data: Partial<GameSettings>) => void;
    START_GAME: () => void;
    MAKE_BID: (data: { quantity: number; faceValue: number }) => void;
    CALL_LIAR: () => void;
    LEAVE_ROOM: () => void;
}

export interface ServerToClientEvents {
    PUBLIC_STATE_UPDATE: (state: PublicGameState) => void;
    PRIVATE_STATE_UPDATE: (state: PrivateGameState) => void;
    ROOM_CREATED: (data: { roomCode: string; playerId: string }) => void;
    ROOM_JOINED: (data: { playerId: string }) => void;
    ERROR: (data: { message: string; code: string }) => void;
}

// Default game settings
export const DEFAULT_SETTINGS: GameSettings = {
    startingDiceCount: 5,
    wildOnes: false,
    maxPlayers: 8,
};
