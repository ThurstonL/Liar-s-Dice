import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, GameSettings } from '../../../shared/types.js';
import { roomManager } from '../engine/RoomManager.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

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

            socket.emit('ROOM_JOINED', { playerId: result.playerId });
            broadcastRoomState(io, room.id);

            console.log(`👤 ${playerName} joined room ${room.roomCode}`);
        });

        // ============ Settings Update ============
        socket.on('UPDATE_SETTINGS', (settings: Partial<GameSettings>) => {
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

            // After a delay, proceed to next round
            setTimeout(() => {
                const nextRound = room.proceedToNextRound();
                broadcastRoomState(io, roomId);

                if (nextRound.gameOver) {
                    console.log(`🏆 Game ended in room ${room.roomCode}`);
                }
            }, 5000); // 5 second reveal delay
        });

        // ============ Leave Room ============
        socket.on('LEAVE_ROOM', () => {
            handleDisconnect(socket);
        });

        // ============ Disconnect ============
        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
            handleDisconnect(socket);
        });

        function handleDisconnect(socket: TypedSocket): void {
            const { roomId, playerId } = roomManager.untrackSocket(socket.id);

            if (roomId && playerId) {
                const room = roomManager.getRoomById(roomId);
                if (room) {
                    if (room.phase === 'LOBBY') {
                        // In lobby, fully remove the player
                        room.removePlayer(playerId);
                    } else {
                        // In game, mark as disconnected
                        room.disconnectPlayer(playerId);
                    }

                    broadcastRoomState(io, roomId);

                    // Cleanup empty rooms
                    if (room.getPlayerCount() === 0) {
                        roomManager.deleteRoom(roomId);
                        console.log(`🗑️ Room ${room.roomCode} deleted (empty)`);
                    }
                }
            }
        }
    });
}
