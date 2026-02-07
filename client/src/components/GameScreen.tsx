import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useGameStore, useGamePhase, useMyDice, useCurrentBid, usePlayers, useIsMyTurn, useAmHost, useCanCallLiar } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { PlayerCard } from './PlayerCard';
import { DiceDisplay } from './DiceDisplay';
import { BidInput } from './BidInput';
import { RevealScreen } from './RevealScreen';
import { soundManager } from '../utils/sound';

export function GameScreen() {
    const publicState = useGameStore((state) => state.publicState);
    const playerId = useGameStore((state) => state.playerId);
    const phase = useGamePhase();
    const myDice = useMyDice();
    const currentBid = useCurrentBid();
    const players = usePlayers();
    const isMyTurn = useIsMyTurn();
    const isHost = useAmHost();
    const canCallLiar = useCanCallLiar();
    const { leaveRoom, restartGame, callLiar } = useSocket();

    // Sound effects
    useEffect(() => {
        if (phase === 'ROLL') {
            soundManager.playRoll();
        } else if (phase === 'GAME_END') {
            const winner = publicState?.winnerId;
            if (winner) {
                if (winner === playerId) {
                    soundManager.playWin();
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                } else {
                    soundManager.playLose();
                }
            }
        }
    }, [phase, publicState?.winnerId, playerId]);

    if (!publicState) return null;

    const activePlayer = players.find(p => p.id === publicState.activePlayerId);
    const winner = publicState.winnerId ? players.find(p => p.id === publicState.winnerId) : null;

    // Game Over Screen
    if (phase === 'GAME_END' && winner) {
        const isWinner = winner.id === playerId;
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-8 text-center max-w-md w-full">
                    <div className="text-6xl mb-4 animate-bounce">{isWinner ? '🏆' : '😢'}</div>
                    <h1 className="font-display text-4xl font-bold mb-4 bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                        {isWinner ? 'You Win!' : 'Game Over'}
                    </h1>
                    <p className="text-xl text-white/70 mb-8">
                        {isWinner ? 'Congratulations!' : (
                            <><span className="text-amber-400 font-bold">{winner.displayName}</span> wins!</>
                        )}
                    </p>

                    <div className="space-y-3">
                        {isHost && (
                            <button onClick={restartGame} className="btn-primary w-full py-3 text-lg">
                                Play Again 🔄
                            </button>
                        )}
                        <button onClick={leaveRoom} className="btn-secondary w-full">
                            Back to Lobby
                        </button>
                    </div>
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
                        className="text-white/60 hover:text-white text-sm transition-colors"
                    >
                        Leave
                    </button>
                </div>
            </div>

            {/* Current bid */}
            {currentBid && phase === 'BIDDING' && (
                <div className="glass-card p-4 mb-4 text-center animate-in fade-in slide-in-from-bottom-4">
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
                <div className="glass-card p-3 mb-4 text-center bg-white/5 animate-pulse">
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
            <div className="glass-card p-4 mb-4 flex-1 overflow-y-auto">
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
                <div className="mt-auto animate-in slide-in-from-bottom-10">
                    <BidInput />
                </div>
            )}

            {/* Liar button for non-active players */}
            {phase === 'BIDDING' && !isMyTurn && canCallLiar && (
                <div className="mt-auto animate-in slide-in-from-bottom-10">
                    <button
                        onClick={callLiar}
                        className="btn-danger w-full py-4 text-xl font-bold shadow-xl flex items-center justify-center gap-2"
                    >
                        <span>🎭</span> CALL LIAR!
                    </button>
                    <p className="text-center text-xs text-white/30 mt-2">Anyone can call Liar!</p>
                </div>
            )}
        </div>
    );
}
