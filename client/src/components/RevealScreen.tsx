import { useGameStore, usePlayers } from '../store/gameStore';
import { DiceDisplay } from './DiceDisplay';

export function RevealScreen() {
    const publicState = useGameStore((state) => state.publicState);
    const playerId = useGameStore((state) => state.playerId);
    const players = usePlayers();

    if (!publicState?.lastRoundResult) return null;

    const result = publicState.lastRoundResult;
    const challenger = players.find(p => p.id === result.challengerId);
    const challenged = players.find(p => p.id === result.challengedPlayerId);
    const loser = players.find(p => p.id === result.loserId);

    const isLoser = result.loserId === playerId;

    return (
        <div className="glass-card p-6 space-y-6">
            {/* Challenge header */}
            <div className="text-center">
                <h2 className="font-display text-2xl font-bold mb-2">
                    🎭 LIAR Called!
                </h2>
                <p className="text-white/70">
                    <span className="text-amber-400 font-semibold">{challenger?.displayName}</span>
                    {' '}challenged{' '}
                    <span className="text-amber-400 font-semibold">{challenged?.displayName}</span>'s bid
                </p>
            </div>

            {/* The bid */}
            <div className="text-center bg-white/10 rounded-xl p-4">
                <p className="text-white/60 text-sm mb-1">The bid was:</p>
                <p className="text-3xl font-bold">
                    {result.bid.quantity} × {result.bid.faceValue}s
                </p>
            </div>

            {/* All revealed dice */}
            <div className="space-y-4">
                <h3 className="font-semibold text-center">All Dice Revealed</h3>
                {players.filter(p => !p.isEliminated || result.allDice[p.id]).map((player) => {
                    const dice = result.allDice[player.id];
                    if (!dice) return null;

                    return (
                        <div key={player.id} className="bg-white/5 rounded-xl p-3">
                            <p className={`text-sm mb-2 ${player.id === playerId ? 'text-amber-400' : 'text-white/70'}`}>
                                {player.displayName}
                                {player.id === playerId && ' (You)'}
                            </p>
                            <DiceDisplay values={dice} animate size="sm" />
                        </div>
                    );
                })}
            </div>

            {/* Result */}
            <div className={`text-center p-4 rounded-xl ${result.bidWasCorrect ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                <p className="text-lg">
                    Total matching dice: <span className="font-bold text-2xl">{result.totalMatchingDice}</span>
                </p>
                <p className="text-xl font-bold mt-2">
                    {result.bidWasCorrect ? (
                        <>The bid was <span className="text-green-400">CORRECT</span>!</>
                    ) : (
                        <>The bid was <span className="text-red-400">WRONG</span>!</>
                    )}
                </p>
            </div>

            {/* Loser announcement */}
            <div className={`text-center p-4 rounded-xl ${isLoser ? 'bg-red-500/30 animate-shake' : 'bg-white/10'
                }`}>
                <p className="text-xl">
                    <span className={isLoser ? 'text-red-400' : 'text-amber-400'}>
                        {loser?.displayName}
                    </span>
                    {' '}loses a die! 🎲
                </p>
            </div>
        </div>
    );
}
