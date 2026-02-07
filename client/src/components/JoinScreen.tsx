import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';

export function JoinScreen() {
    const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const { createRoom, joinRoom } = useSocket();

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (playerName.trim()) {
            createRoom(playerName.trim());
        }
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (playerName.trim() && roomCode.trim()) {
            joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card p-8 w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="font-display text-4xl font-bold text-white mb-2">
                        🎲 Liar's Dice
                    </h1>
                    <p className="text-white/60">Bluff your way to victory</p>
                </div>

                {mode === 'select' && (
                    <div className="space-y-4">
                        <button
                            onClick={() => setMode('create')}
                            className="btn-primary w-full text-lg"
                        >
                            Create New Game
                        </button>
                        <button
                            onClick={() => setMode('join')}
                            className="btn-secondary w-full text-lg"
                        >
                            Join Existing Game
                        </button>
                    </div>
                )}

                {mode === 'create' && (
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm text-white/70 mb-2">Your Name</label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter your name"
                                className="input-field"
                                maxLength={20}
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!playerName.trim()}
                            className="btn-primary w-full"
                        >
                            Create Room
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('select')}
                            className="btn-secondary w-full"
                        >
                            Back
                        </button>
                    </form>
                )}

                {mode === 'join' && (
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <label className="block text-sm text-white/70 mb-2">Your Name</label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter your name"
                                className="input-field"
                                maxLength={20}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-white/70 mb-2">Room Code</label>
                            <input
                                type="text"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                placeholder="Enter 5-letter code"
                                className="input-field text-center text-2xl tracking-widest font-mono"
                                maxLength={5}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!playerName.trim() || roomCode.length !== 5}
                            className="btn-primary w-full"
                        >
                            Join Room
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('select')}
                            className="btn-secondary w-full"
                        >
                            Back
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
