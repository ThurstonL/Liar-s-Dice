import { GameRoom } from './GameRoom.js';

/**
 * RoomManager handles the lifecycle of all game rooms
 */
export class RoomManager {
    private rooms: Map<string, GameRoom> = new Map();
    private roomCodeToId: Map<string, string> = new Map();
    private socketToRoom: Map<string, string> = new Map();
    private socketToPlayer: Map<string, string> = new Map();

    createRoom(): GameRoom {
        const room = new GameRoom();
        this.rooms.set(room.id, room);
        this.roomCodeToId.set(room.roomCode, room.id);
        return room;
    }

    getRoomById(roomId: string): GameRoom | undefined {
        return this.rooms.get(roomId);
    }

    getRoomByCode(roomCode: string): GameRoom | undefined {
        const roomId = this.roomCodeToId.get(roomCode.toUpperCase());
        if (roomId) {
            return this.rooms.get(roomId);
        }
        return undefined;
    }

    deleteRoom(roomId: string): void {
        const room = this.rooms.get(roomId);
        if (room) {
            this.roomCodeToId.delete(room.roomCode);
            this.rooms.delete(roomId);
        }
    }

    // Socket tracking
    trackSocket(socketId: string, roomId: string, playerId: string): void {
        this.socketToRoom.set(socketId, roomId);
        this.socketToPlayer.set(socketId, playerId);
    }

    untrackSocket(socketId: string): { roomId?: string; playerId?: string } {
        const roomId = this.socketToRoom.get(socketId);
        const playerId = this.socketToPlayer.get(socketId);
        this.socketToRoom.delete(socketId);
        this.socketToPlayer.delete(socketId);
        return { roomId, playerId };
    }

    getSocketRoom(socketId: string): string | undefined {
        return this.socketToRoom.get(socketId);
    }

    getSocketPlayer(socketId: string): string | undefined {
        return this.socketToPlayer.get(socketId);
    }

    // Cleanup empty rooms
    cleanupEmptyRooms(): void {
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.getPlayerCount() === 0) {
                this.deleteRoom(roomId);
            }
        }
    }
}

// Singleton instance
export const roomManager = new RoomManager();
