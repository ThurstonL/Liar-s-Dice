import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import type { ClientToServerEvents, ServerToClientEvents, GameSettings } from '../../../shared/types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function resolveSocketUrl(): string {
    const configuredUrl = import.meta.env.VITE_SOCKET_URL?.trim();
    if (configuredUrl) {
        return configuredUrl;
    }

    if (typeof window === 'undefined') {
        return 'http://localhost:3001';
    }

    const { hostname } = window.location;

    if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.')
    ) {
        return `http://${hostname}:3001`;
    }

    if (hostname === 'app.mitoful.com') {
        return 'https://api.mitoful.com';
    }

    if (hostname === 'liarsdice.thepregames.com') {
        return 'https://liarsdice-api.thepregames.com';
    }

    return `https://${hostname}`;
}

const SOCKET_URL = resolveSocketUrl();

// Store playerId in localStorage for reconnection
const PLAYER_ID_KEY = 'liars_dice_player_id';
const ROOM_CODE_KEY = 'liars_dice_room_code';

// Singleton socket instance - prevents multiple connections
let socketInstance: TypedSocket | null = null;

function getSocket(): TypedSocket {
    if (!socketInstance) {
        console.log('🔌 Attempting to connect to:', SOCKET_URL);
        socketInstance = io(SOCKET_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['polling'],
        });
    }
    return socketInstance;
}

export function useSocket() {
    const socketRef = useRef<TypedSocket | null>(null);
    const attemptedReconnectRef = useRef(false);

    // Get store actions without causing re-renders
    const store = useGameStore;

    useEffect(() => {
        const socket = getSocket();
        socketRef.current = socket;

        const savedPlayerId = localStorage.getItem(PLAYER_ID_KEY);
        if (savedPlayerId) {
            store.getState().setPlayerId(savedPlayerId);
        }

        const attemptSessionRestore = () => {
            const savedRoomCode = localStorage.getItem(ROOM_CODE_KEY);
            const currentPlayerId = localStorage.getItem(PLAYER_ID_KEY);

            if (!savedRoomCode || !currentPlayerId || attemptedReconnectRef.current) {
                store.getState().setRestoring(false);
                return;
            }

            attemptedReconnectRef.current = true;
            socket.emit('RECONNECT_SESSION', {
                roomCode: savedRoomCode,
                playerId: currentPlayerId,
            });
        };

        // Connection events
        const onConnect = () => {
            console.log('🔌 Connected to server');
            store.getState().setConnected(true);
            store.getState().setError(null);
            attemptSessionRestore();
        };

        const onDisconnect = () => {
            console.log('🔌 Disconnected from server');
            store.getState().setConnected(false);
            store.getState().setRestoring(false);
        };

        const onConnectError = (error: Error) => {
            console.error('Connection error:', error);
            store.getState().setError('Failed to connect to server');
            store.getState().setRestoring(false);
        };

        // Game events
        const persistSession = (roomCode: string, playerId: string) => {
            localStorage.setItem(PLAYER_ID_KEY, playerId);
            localStorage.setItem(ROOM_CODE_KEY, roomCode);
            store.getState().setPlayerId(playerId);
            attemptedReconnectRef.current = false;
        };

        const clearSession = () => {
            localStorage.removeItem(PLAYER_ID_KEY);
            localStorage.removeItem(ROOM_CODE_KEY);
            attemptedReconnectRef.current = false;
        };

        const onRoomCreated = ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
            console.log('🎲 Room created:', roomCode);
            persistSession(roomCode, playerId);
        };

        const onRoomJoined = ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
            console.log('👤 Joined room');
            persistSession(roomCode, playerId);
        };

        const onSessionRestored = ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
            console.log('♻️ Session restored:', roomCode);
            persistSession(roomCode, playerId);
            store.getState().setRestoring(false);
        };

        const onPublicStateUpdate = (state: any) => {
            localStorage.setItem(ROOM_CODE_KEY, state.roomCode);
            store.getState().setPublicState(state);
            store.getState().setRestoring(false);
        };

        const onPrivateStateUpdate = (state: any) => {
            store.getState().setPrivateState(state);
        };

        const onError = ({ message, code }: { message: string; code: string }) => {
            console.error('Server error:', message);

            if (code === 'SESSION_NOT_FOUND' || code === 'INVALID_SESSION' || code === 'KICKED_BY_HOST') {
                clearSession();
                store.getState().clearSessionState();
            }

            store.getState().setError(message);
            setTimeout(() => store.getState().setError(null), 3000);
        };

        // Register listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.on('ROOM_CREATED', onRoomCreated);
        socket.on('ROOM_JOINED', onRoomJoined);
        socket.on('SESSION_RESTORED', onSessionRestored);
        socket.on('PUBLIC_STATE_UPDATE', onPublicStateUpdate);
        socket.on('PRIVATE_STATE_UPDATE', onPrivateStateUpdate);
        socket.on('ERROR', onError);

        // If already connected, update state
        if (socket.connected) {
            store.getState().setConnected(true);
        }

        // Cleanup listeners only (don't disconnect the socket)
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('ROOM_CREATED', onRoomCreated);
            socket.off('ROOM_JOINED', onRoomJoined);
            socket.off('SESSION_RESTORED', onSessionRestored);
            socket.off('PUBLIC_STATE_UPDATE', onPublicStateUpdate);
            socket.off('PRIVATE_STATE_UPDATE', onPrivateStateUpdate);
            socket.off('ERROR', onError);
        };
    }, []); // Empty deps - only run once

    // Action methods
    const createRoom = useCallback((playerName: string) => {
        socketRef.current?.emit('CREATE_ROOM', { playerName });
    }, []);

    const joinRoom = useCallback((roomCode: string, playerName: string) => {
        socketRef.current?.emit('JOIN_ROOM', { roomCode, playerName });
    }, []);

    const updateSettings = useCallback((settings: Partial<GameSettings>) => {
        socketRef.current?.emit('UPDATE_SETTINGS', settings);
    }, []);

    const startGame = useCallback(() => {
        socketRef.current?.emit('START_GAME');
    }, []);

    const makeBid = useCallback((quantity: number, faceValue: number) => {
        socketRef.current?.emit('MAKE_BID', { quantity, faceValue });
    }, []);

    const callLiar = useCallback(() => {
        socketRef.current?.emit('CALL_LIAR');
    }, []);

    const continueToNextRound = useCallback(() => {
        socketRef.current?.emit('CONTINUE_TO_NEXT_ROUND');
    }, []);

    const leaveRoom = useCallback(() => {
        socketRef.current?.emit('LEAVE_ROOM');
        useGameStore.getState().clearSessionState();
        localStorage.removeItem(PLAYER_ID_KEY);
        localStorage.removeItem(ROOM_CODE_KEY);
        attemptedReconnectRef.current = false;
    }, []);

    const kickPlayer = useCallback((targetPlayerId: string) => {
        console.log('Emitting KICK_PLAYER for target:', targetPlayerId);
        socketRef.current?.emit('KICK_PLAYER', { targetPlayerId });
    }, []);

    const restartGame = useCallback(() => {
        socketRef.current?.emit('RESTART_GAME');
    }, []);

    return {
        createRoom,
        joinRoom,
        updateSettings,
        startGame,
        makeBid,
        callLiar,
        continueToNextRound,
        leaveRoom,
        kickPlayer,
        restartGame,
    };
}
