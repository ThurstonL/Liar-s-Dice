import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, GameSettings } from '@liars-dice/shared/types.js';
import { roomManager } from '../engine/RoomManager.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

type RateLimitScope = 'socket' | 'ip';

interface RateLimitRule {
    windowMs: number;
    maxEvents: number;
    message: string;
    code: string;
    scope?: RateLimitScope;
}

interface RateLimitEntry {
    count: number;
    windowStart: number;
}

const socketRateLimitStore = new Map<string, RateLimitEntry>();
const ipRateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_RULES: Record<string, RateLimitRule> = {
    CREATE_ROOM: {
        windowMs: 60_000,
        maxEvents: 6,
        message: 'You are creating rooms too quickly. Please wait a moment.',
        code: 'RATE_LIMITED',
        scope: 'ip',
    },
    JOIN_ROOM: {
        windowMs: 20_000,
        maxEvents: 12,
        message: 'You are trying to join rooms too quickly. Please wait a moment.',
        code: 'RATE_LIMITED',
        scope: 'ip',
    },
    UPDATE_SETTINGS: {
        windowMs: 5_000,
        maxEvents: 10,
        message: 'Settings are being changed too quickly. Please slow down.',
        code: 'RATE_LIMITED',
    },
    START_GAME: {
        windowMs: 10_000,
        maxEvents: 3,
        message: 'Please wait a moment before trying to start again.',
        code: 'RATE_LIMITED',
    },
    RESTART_GAME: {
        windowMs: 10_000,
        maxEvents: 3,
        message: 'Please wait a moment before trying to restart again.',
        code: 'RATE_LIMITED',
    },
    KICK_PLAYER: {
        windowMs: 5_000,
        maxEvents: 5,
        message: 'You are kicking players too quickly. Please slow down.',
        code: 'RATE_LIMITED',
    },
    MAKE_BID: {
        windowMs: 3_000,
        maxEvents: 8,
        message: 'You are sending bids too quickly. Please slow down.',
        code: 'RATE_LIMITED',
    },
    CALL_LIAR: {
        windowMs: 3_000,
        maxEvents: 5,
        message: 'You are challenging too quickly. Please slow down.',
        code: 'RATE_LIMITED',
    },
    CONTINUE_TO_NEXT_ROUND: {
        windowMs: 10_000,
        maxEvents: 4,
        message: 'Please wait a moment before continuing again.',
        code: 'RATE_LIMITED',
    },
};

function getClientIp(socket: TypedSocket): string {
    const forwardedFor = socket.handshake.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
        return forwardedFor.split(',')[0].trim();
    }

    return socket.handshake.address || socket.id;
}

function checkRateLimit(socket: TypedSocket, eventName: keyof typeof RATE_LIMIT_RULES): boolean {
    const rule = RATE_LIMIT_RULES[eventName];
    const now = Date.now();
    const scope = rule.scope ?? 'socket';
    const key = scope === 'ip' ? getClientIp(socket) : socket.id;
    const store = scope === 'ip' ? ipRateLimitStore : socketRateLimitStore;
    const existing = store.get(`${eventName}:${key}`);

    if (!existing || now - existing.windowStart >= rule.windowMs) {
        store.set(`${eventName}:${key}`, { count: 1, windowStart: now });
        return true;
    }

    if (existing.count >= rule.maxEvents) {
        socket.emit('ERROR', { message: rule.message, code: rule.code });
        return false;
    }

    existing.count++;
    return true;
}

/**
 * Broadcast updated state to all players in a room
 */
function broadcastRoomState(io: TypedServer, roomId: string): void {
    const room = roomManager.getRoomById(roomId);
    if (!room) return;

    const publicState = room.getPublicState();

    // Send public state to all players
    for (const socketId of room.getAllSocketIds()) {
        const playerId = roomManager.getSocketPlayer(socketId);
        if (playerId) {
            const privateState = room.getPrivateState(playerId);
            io.to(socketId).emit('PUBLIC_STATE_UPDATE', publicState);
            io.to(socketId).emit('PRIVATE_STATE_UPDATE', privateState);
        }
    }
}

/**
 * Set up all Socket.IO event handlers
 */
export function setupSocketHandlers(io: TypedServer): void {
    io.on('connection', (socket: TypedSocket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // ============ Room Creation ============
        socket.on('CREATE_ROOM', ({ playerName }) => {
            if (!checkRateLimit(socket, 'CREATE_ROOM')) return;

            if (!playerName || playerName.trim().length === 0) {
                socket.emit('ERROR', { message: 'Player name is required', code: 'INVALID_NAME' });
                return;
            }

            const room = roomManager.createRoom();
            const result = room.addPlayer(socket.id, playerName.trim());

            if (!result.success || !result.playerId) {
                socket.emit('ERROR', { message: result.error || 'Failed to create room', code: 'CREATE_FAILED' });
                return;
            }

            roomManager.trackSocket(socket.id, room.id, result.playerId);
            socket.join(room.id);

            socket.emit('ROOM_CREATED', { roomCode: room.roomCode, playerId: result.playerId });
            broadcastRoomState(io, room.id);

            console.log(`🎲 Room created: ${room.roomCode} by ${playerName}`);
        });

        // ============ Room Joining ============
        socket.on('JOIN_ROOM', ({ roomCode, playerName }) => {
            if (!checkRateLimit(socket, 'JOIN_ROOM')) return;

            if (!playerName || playerName.trim().length === 0) {
                socket.emit('ERROR', { message: 'Player name is required', code: 'INVALID_NAME' });
                return;
            }

            if (!roomCode || roomCode.trim().length === 0) {
                socket.emit('ERROR', { message: 'Room code is required', code: 'INVALID_CODE' });
                return;
            }

            const room = roomManager.getRoomByCode(roomCode.trim());
            if (!room) {
                socket.emit('ERROR', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
                return;
            }

            if (room.phase !== 'LOBBY') {
                socket.emit('ERROR', { message: 'Game already in progress', code: 'GAME_STARTED' });
                return;
            }

            const result = room.addPlayer(socket.id, playerName.trim());

            if (!result.success || !result.playerId) {
                socket.emit('ERROR', { message: result.error || 'Failed to join room', code: 'JOIN_FAILED' });
                return;
            }

            roomManager.trackSocket(socket.id, room.id, result.playerId);
            socket.join(room.id);

            socket.emit('ROOM_JOINED', { roomCode: room.roomCode, playerId: result.playerId });
            broadcastRoomState(io, room.id);

            console.log(`👤 ${playerName} joined room ${room.roomCode}`);
        });

        // ============ Session Reconnect ============
        socket.on('RECONNECT_SESSION', ({ roomCode, playerId }) => {
            if (!roomCode || !playerId) {
                socket.emit('ERROR', { message: 'Reconnect session is missing required data', code: 'INVALID_SESSION' });
                return;
            }

            const room = roomManager.getRoomByCode(roomCode.trim());
            if (!room) {
                socket.emit('ERROR', { message: 'Saved room was not found', code: 'SESSION_NOT_FOUND' });
                return;
            }

            const player = room.getPlayerById(playerId);
            if (!player) {
                socket.emit('ERROR', { message: 'Saved player session was not found', code: 'SESSION_NOT_FOUND' });
                return;
            }

            room.reconnectPlayer(playerId, socket.id);
            roomManager.trackSocket(socket.id, room.id, playerId);
            socket.join(room.id);

            socket.emit('SESSION_RESTORED', { roomCode: room.roomCode, playerId });
            broadcastRoomState(io, room.id);

            console.log(`♻️ ${player.displayName} reconnected to room ${room.roomCode}`);
        });

        // ============ Settings Update ============
        socket.on('UPDATE_SETTINGS', (settings: Partial<GameSettings>) => {
            if (!checkRateLimit(socket, 'UPDATE_SETTINGS')) return;

            const roomId = roomManager.getSocketRoom(socket.id);
            const playerId = roomManager.getSocketPlayer(socket.id);
            if (!roomId || !playerId) return;

            const room = roomManager.getRoomById(roomId);
            if (!room) return;

            // Only host can update settings
            if (!room.isHost(playerId)) {
                socket.emit('ERROR', { message: 'Only the host can change settings', code: 'NOT_HOST' });
                return;
            }

            room.updateSettings(settings);
            broadcastRoomState(io, roomId);
        });

        // ============ Start Game ============
        socket.on('START_GAME', () => {
            if (!checkRateLimit(socket, 'START_GAME')) return;

            const roomId = roomManager.getSocketRoom(socket.id);
            const playerId = roomManager.getSocketPlayer(socket.id);
            if (!roomId || !playerId) return;

            const room = roomManager.getRoomById(roomId);
            if (!room) return;

            // Only host can start game
            if (!room.isHost(playerId)) {
                socket.emit('ERROR', { message: 'Only the host can start the game', code: 'NOT_HOST' });
                return;
            }

            const result = room.startGame();
            if (!result.success) {
                socket.emit('ERROR', { message: result.error || 'Failed to start game', code: 'START_FAILED' });
                return;
            }

            broadcastRoomState(io, roomId);
            console.log(`🎮 Game started in room ${room.roomCode}`);
        });

        // ============ Restart Game ============
        socket.on('RESTART_GAME', () => {
            if (!checkRateLimit(socket, 'RESTART_GAME')) return;

            const roomId = roomManager.getSocketRoom(socket.id);
            const playerId = roomManager.getSocketPlayer(socket.id);
            if (!roomId || !playerId) return;

            const room = roomManager.getRoomById(roomId);
            if (!room) return;

            // Only host can restart
            if (!room.isHost(playerId)) {
                socket.emit('ERROR', { message: 'Only the host can restart the game', code: 'NOT_HOST' });
                return;
            }

            room.resetGame();
            broadcastRoomState(io, roomId);
            console.log(`🔄 Game restarted in room ${room.roomCode}`);
        });

        // ============ Make Bid ============
        socket.on('MAKE_BID', ({ quantity, faceValue }) => {
            if (!checkRateLimit(socket, 'MAKE_BID')) return;

            const roomId = roomManager.getSocketRoom(socket.id);
            const playerId = roomManager.getSocketPlayer(socket.id);
            if (!roomId || !playerId) return;

            const room = roomManager.getRoomById(roomId);
            if (!room) return;

            const result = room.makeBid(playerId, quantity, faceValue);
            if (!result.success) {
                socket.emit('ERROR', { message: result.error || 'Invalid bid', code: 'BID_FAILED' });
                return;
            }

            broadcastRoomState(io, roomId);
        });

        // ============ Call Liar ============
        socket.on('CALL_LIAR', () => {
            if (!checkRateLimit(socket, 'CALL_LIAR')) return;

            const roomId = roomManager.getSocketRoom(socket.id);
            const playerId = roomManager.getSocketPlayer(socket.id);
            if (!roomId || !playerId) return;

            const room = roomManager.getRoomById(roomId);
            if (!room) return;

            const result = room.callLiar(playerId);
            if (!result.success) {
                socket.emit('ERROR', { message: result.error || 'Cannot call liar', code: 'LIAR_FAILED' });
                return;
            }

            // Broadcast reveal state
            broadcastRoomState(io, roomId);
        });

        // ============ Continue To Next Round ============
        socket.on('CONTINUE_TO_NEXT_ROUND', () => {
            if (!checkRateLimit(socket, 'CONTINUE_TO_NEXT_ROUND')) return;

            const roomId = roomManager.getSocketRoom(socket.id);
            if (!roomId) return;

            const room = roomManager.getRoomById(roomId);
            if (!room) return;

            if (room.phase !== 'REVEAL') {
                socket.emit('ERROR', { message: 'Round is not ready to continue', code: 'INVALID_PHASE' });
                return;
            }

            const nextRound = room.proceedToNextRound();
            broadcastRoomState(io, roomId);

            if (nextRound.gameOver) {
                console.log(`🏆 Game ended in room ${room.roomCode}`);
            }
        });

        // ============ Kick Player ============
        socket.on('KICK_PLAYER', ({ targetPlayerId }) => {
            console.log(`Received KICK_PLAYER request for ${targetPlayerId}`);
            if (!checkRateLimit(socket, 'KICK_PLAYER')) {
                console.log('Rate limited');
                return;
            }

            const roomId = roomManager.getSocketRoom(socket.id);
            const playerId = roomManager.getSocketPlayer(socket.id);
            
            console.log(`Kick request context - roomId: ${roomId}, playerId: ${playerId}`);
            
            if (!roomId || !playerId || !targetPlayerId) return;

            const room = roomManager.getRoomById(roomId);
            if (!room) {
                console.log('Room not found');
                return;
            }

            // Only host can kick, and only in LOBBY
            if (!room.isHost(playerId)) {
                socket.emit('ERROR', { message: 'Only the host can kick players', code: 'NOT_HOST' });
                return;
            }

            if (room.phase !== 'LOBBY') {
                socket.emit('ERROR', { message: 'Can only kick players in the lobby', code: 'INVALID_PHASE' });
                return;
            }

            // Cannot kick yourself
            if (playerId === targetPlayerId) {
                socket.emit('ERROR', { message: 'Cannot kick yourself', code: 'INVALID_TARGET' });
                return;
            }

            const targetSocketId = roomManager.getPlayerSocket(targetPlayerId);
            if (targetSocketId) {
                // Notify the target socket
                io.to(targetSocketId).emit('ERROR', { message: 'You were kicked by the host', code: 'KICKED_BY_HOST' });
                
                // Force target socket to leave the room
                const targetSocket = io.sockets.sockets.get(targetSocketId);
                if (targetSocket) {
                    targetSocket.leave(roomId);
                }
                
                // Untrack target socket
                roomManager.untrackSocket(targetSocketId);
            }

            room.removePlayer(targetPlayerId);
            broadcastRoomState(io, roomId);
            console.log(`👢 Player ${targetPlayerId} was kicked from room ${room.roomCode}`);
        });

        // ============ Leave Room ============
        socket.on('LEAVE_ROOM', () => {
            handleLeaveRoom(socket);
        });

        // ============ Disconnect ============
        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
            handleDisconnect(socket);
        });

        function handleLeaveRoom(socket: TypedSocket): void {
            const { roomId, playerId } = roomManager.untrackSocket(socket.id);

            if (!roomId || !playerId) return;

            const room = roomManager.getRoomById(roomId);
            if (!room) return;

            if (room.phase === 'LOBBY') {
                room.removePlayer(playerId);
            } else {
                room.removePlayerMidGame(playerId);
            }

            broadcastRoomState(io, roomId);

            if (room.getPlayerCount() === 0) {
                roomManager.deleteRoom(roomId);
                console.log(`🗑️ Room ${room.roomCode} deleted (empty)`);
            }
        }

        function handleDisconnect(socket: TypedSocket): void {
            const { roomId, playerId } = roomManager.untrackSocket(socket.id);

            if (roomId && playerId) {
                const room = roomManager.getRoomById(roomId);
                if (room) {
                    room.disconnectPlayer(playerId);

                    broadcastRoomState(io, roomId);
                }
            }
        }
    });
}
