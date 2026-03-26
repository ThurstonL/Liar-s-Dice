import { useGameStore, useAmHost, usePlayers } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { GameSettingsPanel } from './GameSettingsPanel';
import { PlayerCard } from './PlayerCard';

export function LobbyScreen() {
    const publicState = useGameStore((state) => state.publicState);
    const playerId = useGameStore((state) => state.playerId);
    const amHost = useAmHost();
    const players = usePlayers();
    const { startGame, leaveRoom } = useSocket();

    if (!publicState) return null;

    const canStart = players.length >= 2;

    const copyRoomCode = () => {
        navigator.clipboard.writeText(publicState.roomCode);
    };

    return (
        <div className="min-h-screen flex flex-col p-4">
            {/* Header */}
            <div className="glass-card p-4 mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white/60 text-sm">Room Code</p>
                        <button
                            onClick={copyRoomCode}
                            className="text-3xl font-mono font-bold tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
                            title="Click to copy"
                        >
                            {publicState.roomCode}
                        </button>
                    </div>
                    <button
                        onClick={leaveRoom}
                        className="text-white/60 hover:text-white transition-colors"
                    >
                        Leave
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4">
                {/* Players list */}
                <div className="flex-1 glass-card p-4">
                    <h2 className="font-display text-xl font-semibold mb-4">
                        Players ({players.length})
                    </h2>
                    <div className="space-y-2">
                        {players.map((player) => (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                isMe={player.id === playerId}
                                showDiceCount={false}
                            />
                        ))}
                    </div>
                    {players.length < 2 && (
                        <p className="text-white/50 text-sm mt-4 text-center">
                            Waiting for more players to join...
                        </p>
                    )}
                </div>

                {/* Settings (host only) */}
                {amHost && (
                    <div className="lg:w-80">
                        <GameSettingsPanel />
                    </div>
                )}
            </div>

            {/* Start button */}
            {amHost && (
                <div className="mt-4">
                    <button
                        onClick={startGame}
                        disabled={!canStart}
                        className="btn-primary w-full text-lg py-4"
                    >
                        {canStart ? 'Start Game' : 'Need at least 2 players'}
                    </button>
                </div>
            )}

            {!amHost && (
                <div className="mt-4 glass-card p-4 text-center">
                    <p className="text-white/70">Waiting for host to start the game...</p>
                </div>
            )}
        </div>
    );
}
