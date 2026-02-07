import { v4 as uuidv4 } from 'uuid';
import { DiceEngine } from './DiceEngine.js';
import type {
    GamePhase,
    GameSettings,
    PublicPlayer,
    Bid,
    PublicGameState,
    PrivateGameState,
    RoundResult,
    DEFAULT_SETTINGS,
} from '../../../shared/types.js';

interface Player {
    id: string;
    socketId: string;
    displayName: string;
    diceCount: number;
    dice: number[];
    isEliminated: boolean;
    isConnected: boolean;
    isHost: boolean;
}

/**
 * GameRoom manages the state of a single game room
 */
export class GameRoom {
    public readonly id: string;
    public readonly roomCode: string;
    public phase: GamePhase = 'LOBBY';
    public roundNumber: number = 0;
    public settings: GameSettings;
    public currentBid: Bid | null = null;
    public activePlayerIndex: number = 0;
    public lastRoundResult: RoundResult | null = null;

    private players: Map<string, Player> = new Map();
    private playerOrder: string[] = []; // Player IDs in turn order
    private hostId: string | null = null;

    constructor(roomCode?: string) {
        this.id = uuidv4();
        this.roomCode = roomCode || DiceEngine.generateRoomCode();
        this.settings = { startingDiceCount: 5, wildOnes: false, maxPlayers: 8 };
    }

    // ============ Player Management ============

    addPlayer(socketId: string, displayName: string): { success: boolean; playerId?: string; error?: string } {
        // Check if room is full
        if (this.players.size >= this.settings.maxPlayers) {
            return { success: false, error: 'Room is full' };
        }

        // Check for duplicate names
        for (const player of this.players.values()) {
            if (player.displayName.toLowerCase() === displayName.toLowerCase()) {
                return { success: false, error: 'That name is already taken' };
            }
        }

        const playerId = uuidv4();
        const isHost = this.players.size === 0;

        const player: Player = {
            id: playerId,
            socketId,
            displayName,
            diceCount: this.settings.startingDiceCount,
            dice: [],
            isEliminated: false,
            isConnected: true,
            isHost,
        };

        this.players.set(playerId, player);
        this.playerOrder.push(playerId);

        if (isHost) {
            this.hostId = playerId;
        }

        return { success: true, playerId };
    }

    removePlayer(playerId: string): void {
        this.players.delete(playerId);
        this.playerOrder = this.playerOrder.filter(id => id !== playerId);

        // If host left, assign new host
        if (this.hostId === playerId && this.playerOrder.length > 0) {
            this.hostId = this.playerOrder[0];
            const newHost = this.players.get(this.hostId);
            if (newHost) {
                newHost.isHost = true;
            }
        }
    }

    reconnectPlayer(playerId: string, newSocketId: string): boolean {
        const player = this.players.get(playerId);
        if (player) {
            player.socketId = newSocketId;
            player.isConnected = true;
            return true;
        }
        return false;
    }

    disconnectPlayer(playerId: string): void {
        const player = this.players.get(playerId);
        if (player) {
            player.isConnected = false;
        }
    }

    getPlayerBySocketId(socketId: string): Player | undefined {
        for (const player of this.players.values()) {
            if (player.socketId === socketId) {
                return player;
            }
        }
        return undefined;
    }

    getPlayerById(playerId: string): Player | undefined {
        return this.players.get(playerId);
    }

    isHost(playerId: string): boolean {
        return this.hostId === playerId;
    }

    getPlayerCount(): number {
        return this.players.size;
    }

    getAllSocketIds(): string[] {
        return Array.from(this.players.values()).map(p => p.socketId);
    }

    // ============ Settings ============

    updateSettings(settings: Partial<GameSettings>): void {
        if (this.phase !== 'LOBBY') return;
        this.settings = { ...this.settings, ...settings };
    }

    // ============ Game Flow ============

    resetGame(): void {
        this.phase = 'LOBBY';
        this.currentBid = null;
        this.lastRoundResult = null;
        this.roundNumber = 0;

        // Reset players
        for (const player of this.players.values()) {
            player.diceCount = this.settings.startingDiceCount;
            player.dice = [];
            player.isEliminated = false;
        }

        // Randomize starting player
        this.activePlayerIndex = Math.floor(Math.random() * this.playerOrder.length);
    }

    startGame(): { success: boolean; error?: string } {
        if (this.phase !== 'LOBBY') {
            return { success: false, error: 'Game already started' };
        }

        if (this.players.size < 2) {
            return { success: false, error: 'Need at least 2 players' };
        }

        // Initialize all players with starting dice count
        for (const player of this.players.values()) {
            player.diceCount = this.settings.startingDiceCount;
            player.isEliminated = false;
        }

        this.roundNumber = 1;
        this.startRoll();

        return { success: true };
    }

    private startRoll(): void {
        this.phase = 'ROLL';
        this.currentBid = null;
        this.lastRoundResult = null;

        // Roll dice for all active players
        for (const player of this.players.values()) {
            if (!player.isEliminated) {
                player.dice = DiceEngine.rollDice(player.diceCount);
            }
        }

        // Transition to bidding after a short delay (handled by caller)
        this.phase = 'BIDDING';
    }

    makeBid(playerId: string, quantity: number, faceValue: number): { success: boolean; error?: string } {
        if (this.phase !== 'BIDDING') {
            return { success: false, error: 'Not in bidding phase' };
        }

        if (!this.isActivePlayer(playerId)) {
            return { success: false, error: 'Not your turn' };
        }

        const newBid: Bid = { quantity, faceValue, playerId };

        if (!DiceEngine.isValidBid(newBid, this.currentBid)) {
            return { success: false, error: 'Invalid bid - must be higher than current bid' };
        }

        this.currentBid = newBid;
        this.advanceToNextPlayer();

        return { success: true };
    }

    callLiar(challengerId: string): { success: boolean; error?: string; result?: RoundResult } {
        if (this.phase !== 'BIDDING') {
            return { success: false, error: 'Not in bidding phase' };
        }

        if (!this.currentBid) {
            return { success: false, error: 'No bid to challenge' };
        }

        // Removed isActivePlayer check to allow anyone to call liar


        // Can't call liar on yourself
        if (this.currentBid.playerId === challengerId) {
            return { success: false, error: 'Cannot challenge your own bid' };
        }

        this.phase = 'REVEAL';

        // Gather all dice for reveal
        const allDice: Record<string, number[]> = {};
        for (const player of this.players.values()) {
            if (!player.isEliminated) {
                allDice[player.id] = [...player.dice];
            }
        }

        // Evaluate the challenge
        const { bidWasCorrect, totalMatchingDice } = DiceEngine.evaluateChallenge(
            this.currentBid,
            allDice,
            this.settings
        );

        // Determine loser
        const loserId = bidWasCorrect ? challengerId : this.currentBid.playerId;

        const result: RoundResult = {
            challengerId,
            challengedPlayerId: this.currentBid.playerId,
            bid: this.currentBid,
            totalMatchingDice,
            bidWasCorrect,
            loserId,
            allDice,
        };

        this.lastRoundResult = result;

        // Loser loses a die
        const loser = this.players.get(loserId);
        if (loser) {
            loser.diceCount--;
            if (loser.diceCount <= 0) {
                loser.isEliminated = true;
            }
        }

        return { success: true, result };
    }

    proceedToNextRound(): { gameOver: boolean; winnerId?: string } {
        // Check for game end
        const activePlayers = Array.from(this.players.values()).filter(p => !p.isEliminated);

        if (activePlayers.length <= 1) {
            this.phase = 'GAME_END';
            return { gameOver: true, winnerId: activePlayers[0]?.id };
        }

        // Set starting player to the loser of last round (if still in game)
        if (this.lastRoundResult) {
            const loserIndex = this.playerOrder.indexOf(this.lastRoundResult.loserId);
            if (loserIndex !== -1) {
                const loser = this.players.get(this.lastRoundResult.loserId);
                if (loser && !loser.isEliminated) {
                    this.activePlayerIndex = loserIndex;
                } else {
                    // Loser was eliminated, move to next player
                    this.advanceToNextActivePlayer();
                }
            }
        }

        this.roundNumber++;
        this.startRoll();

        return { gameOver: false };
    }

    // ============ Turn Management ============

    private isActivePlayer(playerId: string): boolean {
        const activePlayerId = this.getActivePlayerId();
        return activePlayerId === playerId;
    }

    getActivePlayerId(): string | null {
        if (this.playerOrder.length === 0) return null;

        // Find the next non-eliminated player starting from activePlayerIndex
        for (let i = 0; i < this.playerOrder.length; i++) {
            const index = (this.activePlayerIndex + i) % this.playerOrder.length;
            const playerId = this.playerOrder[index];
            const player = this.players.get(playerId);
            if (player && !player.isEliminated) {
                this.activePlayerIndex = index;
                return playerId;
            }
        }
        return null;
    }

    private advanceToNextPlayer(): void {
        this.activePlayerIndex = (this.activePlayerIndex + 1) % this.playerOrder.length;
        this.advanceToNextActivePlayer();
    }

    private advanceToNextActivePlayer(): void {
        // Skip eliminated players
        for (let i = 0; i < this.playerOrder.length; i++) {
            const playerId = this.playerOrder[this.activePlayerIndex];
            const player = this.players.get(playerId);
            if (player && !player.isEliminated) {
                return;
            }
            this.activePlayerIndex = (this.activePlayerIndex + 1) % this.playerOrder.length;
        }
    }

    // ============ State Getters ============

    getPublicState(): PublicGameState {
        const players: PublicPlayer[] = this.playerOrder.map(id => {
            const player = this.players.get(id)!;
            return {
                id: player.id,
                displayName: player.displayName,
                diceCount: player.diceCount,
                isEliminated: player.isEliminated,
                isConnected: player.isConnected,
                isHost: player.isHost,
            };
        });

        const state: PublicGameState = {
            phase: this.phase,
            roomCode: this.roomCode,
            roomId: this.id,
            roundNumber: this.roundNumber,
            settings: this.settings,
            currentBid: this.currentBid,
            activePlayerId: this.getActivePlayerId(),
            players,
        };

        if (this.phase === 'REVEAL' && this.lastRoundResult) {
            state.revealedDice = this.lastRoundResult.allDice;
            state.lastRoundResult = this.lastRoundResult;
        }

        if (this.phase === 'GAME_END') {
            const winner = Array.from(this.players.values()).find(p => !p.isEliminated);
            if (winner) {
                state.winnerId = winner.id;
            }
        }

        return state;
    }

    getPrivateState(playerId: string): PrivateGameState {
        const player = this.players.get(playerId);
        const isMyTurn = this.getActivePlayerId() === playerId;
        const canBid = this.phase === 'BIDDING' && isMyTurn;
        // Allow calling liar if it's bidding phase, there's a bid, and you didn't make the bid
        const canCallLiar = this.phase === 'BIDDING' && this.currentBid !== null && this.currentBid.playerId !== playerId;

        return {
            myDice: player?.dice || [],
            isMyTurn,
            canBid,
            canCallLiar,
        };
    }
}
