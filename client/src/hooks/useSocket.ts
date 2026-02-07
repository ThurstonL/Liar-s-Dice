import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import type { ClientToServerEvents, ServerToClientEvents, GameSettings } from '../../../shared/types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:3001`;

// Store playerId in localStorage for reconnection
const PLAYER_ID_KEY = 'liars_dice_player_id';

// Singleton socket instance - prevents multiple connections
let socketInstance: TypedSocket | null = null;

function getSocket(): TypedSocket {
    if (!socketInstance) {
        socketInstance = io(SOCKET_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling'],
        });
    }
    return socketInstance;
}

export function useSocket() {
    const socketRef = useRef<TypedSocket | null>(null);

    // Get store actions without causing re-renders
    const store = useGameStore;

    useEffect(() => {
        const socket = getSocket();
        socketRef.current = socket;

        // Connection events
        const onConnect = () => {
            console.log('🔌 Connected to server');
            store.getState().setConnected(true);
            store.getState().setError(null);
        };

        const onDisconnect = () => {
            console.log('🔌 Disconnected from server');
            store.getState().setConnected(false);
        };

        const onConnectError = (error: Error) => {
            console.error('Connection error:', error);
            store.getState().setError('Failed to connect to server');
        };

        // Game events
        const onRoomCreated = ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
            console.log('🎲 Room created:', roomCode);
            store.getState().setPlayerId(playerId);
            localStorage.setItem(PLAYER_ID_KEY, playerId);
        };

        const onRoomJoined = ({ playerId }: { playerId: string }) => {
            console.log('👤 Joined room');
            store.getState().setPlayerId(playerId);
            localStorage.setItem(PLAYER_ID_KEY, playerId);
        };

        const onPublicStateUpdate = (state: any) => {
            store.getState().setPublicState(state);
        };

        const onPrivateStateUpdate = (state: any) => {
            store.getState().setPrivateState(state);
        };

        const onError = ({ message }: { message: string }) => {
            console.error('Server error:', message);
            store.getState().setError(message);
            setTimeout(() => store.getState().setError(null), 3000);
        };

        // Register listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.on('ROOM_CREATED', onRoomCreated);
        socket.on('ROOM_JOINED', onRoomJoined);
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

    const leaveRoom = useCallback(() => {
        socketRef.current?.emit('LEAVE_ROOM');
        useGameStore.getState().reset();
        localStorage.removeItem(PLAYER_ID_KEY);
    }, []);

    return {
        createRoom,
        joinRoom,
        updateSettings,
        startGame,
        makeBid,
        callLiar,
        leaveRoom,
    };
}
