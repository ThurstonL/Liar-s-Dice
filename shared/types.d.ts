export type GamePhase = 'LOBBY' | 'ROLL' | 'BIDDING' | 'REVEAL' | 'ROUND_END' | 'GAME_END';
export interface GameSettings {
    startingDiceCount: number;
    wildOnes: boolean;
    maxPlayers: number;
}
export interface PublicPlayer {
    id: string;
    displayName: string;
    diceCount: number;
    isEliminated: boolean;
    isConnected: boolean;
    isHost: boolean;
}
export interface Bid {
    quantity: number;
    faceValue: number;
    playerId: string;
}
export interface PublicGameState {
    phase: GamePhase;
    roomCode: string;
    roomId: string;
    roundNumber: number;
    settings: GameSettings;
    currentBid: Bid | null;
    activePlayerId: string | null;
    players: PublicPlayer[];
    revealedDice?: Record<string, number[]>;
    winnerId?: string;
    lastRoundResult?: RoundResult;
}
export interface PrivateGameState {
    myDice: number[];
    isMyTurn: boolean;
    canBid: boolean;
    canCallLiar: boolean;
}
export interface RoundResult {
    challengerId: string;
    challengedPlayerId: string;
    bid: Bid;
    totalMatchingDice: number;
    bidWasCorrect: boolean;
    loserId: string;
    allDice: Record<string, number[]>;
}
export interface ClientToServerEvents {
    CREATE_ROOM: (data: {
        playerName: string;
    }) => void;
    JOIN_ROOM: (data: {
        roomCode: string;
        playerName: string;
    }) => void;
    RECONNECT_SESSION: (data: {
        roomCode: string;
        playerId: string;
    }) => void;
    UPDATE_SETTINGS: (data: Partial<GameSettings>) => void;
    START_GAME: () => void;
    MAKE_BID: (data: {
        quantity: number;
        faceValue: number;
    }) => void;
    CALL_LIAR: () => void;
    CONTINUE_TO_NEXT_ROUND: () => void;
    RESTART_GAME: () => void;
    KICK_PLAYER: (data: {
        targetPlayerId: string;
    }) => void;
    LEAVE_ROOM: () => void;
}
export interface ServerToClientEvents {
    PUBLIC_STATE_UPDATE: (state: PublicGameState) => void;
    PRIVATE_STATE_UPDATE: (state: PrivateGameState) => void;
    ROOM_CREATED: (data: {
        roomCode: string;
        playerId: string;
    }) => void;
    ROOM_JOINED: (data: {
        roomCode: string;
        playerId: string;
    }) => void;
    SESSION_RESTORED: (data: {
        roomCode: string;
        playerId: string;
    }) => void;
    ERROR: (data: {
        message: string;
        code: string;
    }) => void;
}
export declare const DEFAULT_SETTINGS: GameSettings;
