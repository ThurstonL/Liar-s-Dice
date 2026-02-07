import { create } from 'zustand';
import type { PublicGameState, PrivateGameState, GameSettings } from '../../../shared/types';

interface GameStore {
    // Connection state
    isConnected: boolean;
    playerId: string | null;
    error: string | null;

    // Game state
    publicState: PublicGameState | null;
    privateState: PrivateGameState | null;

    // Actions
    setConnected: (connected: boolean) => void;
    setPlayerId: (id: string | null) => void;
    setError: (error: string | null) => void;
    setPublicState: (state: PublicGameState) => void;
    setPrivateState: (state: PrivateGameState) => void;
    reset: () => void;
}

const initialState = {
    isConnected: false,
    playerId: null,
    error: null,
    publicState: null,
    privateState: null,
};

export const useGameStore = create<GameStore>((set) => ({
    ...initialState,

    setConnected: (connected) => set({ isConnected: connected }),
    setPlayerId: (id) => set({ playerId: id }),
    setError: (error) => set({ error }),
    setPublicState: (state) => set({ publicState: state }),
    setPrivateState: (state) => set({ privateState: state }),
    reset: () => set(initialState),
}));

// Selector hooks for common state
export const useIsMyTurn = () => {
    const privateState = useGameStore((state) => state.privateState);
    return privateState?.isMyTurn ?? false;
};

export const useMyDice = () => {
    const privateState = useGameStore((state) => state.privateState);
    return privateState?.myDice ?? [];
};

export const useGamePhase = () => {
    const publicState = useGameStore((state) => state.publicState);
    return publicState?.phase ?? 'LOBBY';
};

export const useCurrentBid = () => {
    const publicState = useGameStore((state) => state.publicState);
    return publicState?.currentBid ?? null;
};

export const usePlayers = () => {
    const publicState = useGameStore((state) => state.publicState);
    return publicState?.players ?? [];
};

export const useSettings = (): GameSettings => {
    const publicState = useGameStore((state) => state.publicState);
    return publicState?.settings ?? { startingDiceCount: 5, wildOnes: false, maxPlayers: 8 };
};

export const useAmHost = () => {
    const publicState = useGameStore((state) => state.publicState);
    const playerId = useGameStore((state) => state.playerId);
    const me = publicState?.players.find(p => p.id === playerId);
    return me?.isHost ?? false;
};
