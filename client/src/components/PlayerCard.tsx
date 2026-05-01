import type { PublicPlayer } from '../../../shared/types';

interface PlayerCardProps {
    player: PublicPlayer;
    isMe: boolean;
    isActive?: boolean;
    showDiceCount?: boolean;
    onKick?: () => void;
}

export function PlayerCard({ player, isMe, isActive = false, showDiceCount = true, onKick }: PlayerCardProps) {
    return (
        <div
            className={`
        flex items-center justify-between p-3 rounded-xl transition-all
        ${isActive ? 'active-player bg-amber-500/20' : 'bg-white/5'}
        ${player.isEliminated ? 'opacity-50' : ''}
        ${!player.isConnected ? 'opacity-30' : ''}
      `}
        >
            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`
          w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
          ${isMe ? 'bg-amber-500 text-white' : 'bg-white/20 text-white'}
        `}>
                    {player.displayName.charAt(0).toUpperCase()}
                </div>

                {/* Name and status */}
                <div>
                    <div className="flex items-center gap-2">
                        <span className={`font-medium ${isMe ? 'text-amber-400' : 'text-white'}`}>
                            {player.displayName}
                        </span>
                        {isMe && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                                You
                            </span>
                        )}
                        {player.isHost && (
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                                Host
                            </span>
                        )}
                    </div>
                    {player.isEliminated && (
                        <span className="text-xs text-red-400">Eliminated</span>
                    )}
                    {!player.isConnected && (
                        <span className="text-xs text-yellow-400">Disconnected</span>
                    )}
                </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-4">
                {/* Dice count */}
                {showDiceCount && !player.isEliminated && (
                    <div className="flex items-center gap-1">
                        <span className="text-2xl">🎲</span>
                        <span className="text-xl font-bold">{player.diceCount}</span>
                    </div>
                )}
                
                {/* Kick button */}
                {onKick && (
                    <button
                        onClick={onKick}
                        className="p-2 rounded-full hover:bg-red-500/20 text-red-400/70 hover:text-red-400 transition-colors"
                        title="Kick player"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
