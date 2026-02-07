import { useGameStore, useGamePhase, useMyDice, useCurrentBid, usePlayers, useIsMyTurn } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { PlayerCard } from './PlayerCard';
import { DiceDisplay } from './DiceDisplay';
import { BidInput } from './BidInput';
import { RevealScreen } from './RevealScreen';

export function GameScreen() {
    const publicState = useGameStore((state) => state.publicState);
    const playerId = useGameStore((state) => state.playerId);
    const phase = useGamePhase();
    const myDice = useMyDice();
    const currentBid = useCurrentBid();
    const players = usePlayers();
    const isMyTurn = useIsMyTurn();
    const { leaveRoom } = useSocket();

    if (!publicState) return null;

    const activePlayer = players.find(p => p.id === publicState.activePlayerId);
    const winner = publicState.winnerId ? players.find(p => p.id === publicState.winnerId) : null;

    // Game Over Screen
    if (phase === 'GAME_END' && winner) {
        const isWinner = winner.id === playerId;
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-8 text-center max-w-md">
                    <div className="text-6xl mb-4">{isWinner ? '🏆' : '😢'}</div>
                    <h1 className="font-display text-3xl font-bold mb-4">
                        {isWinner ? 'You Win!' : 'Game Over'}
                    </h1>
                    <p className="text-xl text-white/70 mb-6">
                        {isWinner ? 'Congratulations!' : (
                            <><span className="text-amber-400">{winner.displayName}</span> wins!</>
                        )}
                    </p>
                    <button onClick={leaveRoom} className="btn-primary">
                        Back to Lobby
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col p-4 pb-safe">
            {/* Header */}
            <div className="glass-card p-3 mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-white/60 text-sm">Round {publicState.roundNumber}</span>
                        <span className="mx-2 text-white/30">•</span>
                        <span className={`text-sm font-medium ${phase === 'BIDDING' ? 'text-amber-400' :
                                phase === 'REVEAL' ? 'text-red-400' : 'text-white/60'
                            }`}>
                            {phase === 'BIDDING' && 'Bidding'}
                            {phase === 'REVEAL' && 'Revealing'}
                            {phase === 'ROLL' && 'Rolling...'}
                        </span>
                    </div>
                    <button
                        onClick={leaveRoom}
                        className="text-white/60 hover:text-white text-sm"
                    >
                        Leave
                    </button>
                </div>
            </div>

            {/* Current bid */}
            {currentBid && phase === 'BIDDING' && (
                <div className="glass-card p-4 mb-4 text-center">
                    <p className="text-white/60 text-sm mb-1">Current Bid</p>
                    <p className="text-4xl font-bold">
                        {currentBid.quantity} × {currentBid.faceValue}s
                    </p>
                    <p className="text-white/50 text-sm mt-1">
                        by {players.find(p => p.id === currentBid.playerId)?.displayName}
                    </p>
                </div>
            )}

            {/* Active player indicator */}
            {phase === 'BIDDING' && !isMyTurn && activePlayer && (
                <div className="glass-card p-3 mb-4 text-center bg-white/5">
                    <p className="text-white/70">
                        Waiting for <span className="text-amber-400 font-semibold">{activePlayer.displayName}</span>...
                    </p>
                </div>
            )}

            {/* Reveal screen */}
            {phase === 'REVEAL' && <RevealScreen />}

            {/* My dice */}
            {phase === 'BIDDING' && myDice.length > 0 && (
                <div className="glass-card p-4 mb-4">
                    <p className="text-white/60 text-sm mb-2 text-center">Your Dice</p>
                    <DiceDisplay values={myDice} size="lg" />
                </div>
            )}

            {/* Players list */}
            <div className="glass-card p-4 mb-4 flex-1">
                <h3 className="font-semibold text-sm text-white/70 mb-2">Players</h3>
                <div className="space-y-2">
                    {players.map((player) => (
                        <PlayerCard
                            key={player.id}
                            player={player}
                            isMe={player.id === playerId}
                            isActive={player.id === publicState.activePlayerId}
                            showDiceCount={true}
                        />
                    ))}
                </div>
            </div>

            {/* Bid input */}
            {phase === 'BIDDING' && isMyTurn && (
                <div className="mt-auto">
                    <BidInput />
                </div>
            )}
        </div>
    );
}
