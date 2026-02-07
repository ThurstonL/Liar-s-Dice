import type { PublicPlayer } from '../../../../shared/types';

interface PlayerCardProps {
    player: PublicPlayer;
    isMe: boolean;
    isActive?: boolean;
    showDiceCount?: boolean;
}

export function PlayerCard({ player, isMe, isActive = false, showDiceCount = true }: PlayerCardProps) {
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

            {/* Dice count */}
            {showDiceCount && !player.isEliminated && (
                <div className="flex items-center gap-1">
                    <span className="text-2xl">🎲</span>
                    <span className="text-xl font-bold">{player.diceCount}</span>
                </div>
            )}
        </div>
    );
}
