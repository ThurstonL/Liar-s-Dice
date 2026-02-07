import { useSettings } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';

export function GameSettingsPanel() {
    const settings = useSettings();
    const { updateSettings } = useSocket();

    return (
        <div className="glass-card p-4">
            <h2 className="font-display text-xl font-semibold mb-4">Game Settings</h2>

            <div className="space-y-4">
                {/* Starting Dice */}
                <div>
                    <label className="block text-sm text-white/70 mb-2">
                        Starting Dice per Player
                    </label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => updateSettings({ startingDiceCount: Math.max(1, settings.startingDiceCount - 1) })}
                            className="btn-secondary px-4 py-2"
                        >
                            −
                        </button>
                        <span className="text-2xl font-bold w-12 text-center">
                            {settings.startingDiceCount}
                        </span>
                        <button
                            onClick={() => updateSettings({ startingDiceCount: Math.min(10, settings.startingDiceCount + 1) })}
                            className="btn-secondary px-4 py-2"
                        >
                            +
                        </button>
                    </div>
                    <p className="text-xs text-white/50 mt-1">Classic: 5 dice</p>
                </div>

                {/* Wild Ones Toggle */}
                <div>
                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <span className="text-sm text-white/70">Wild Ones</span>
                            <p className="text-xs text-white/50">1s count as any face value</p>
                        </div>
                        <div
                            onClick={() => updateSettings({ wildOnes: !settings.wildOnes })}
                            className={`w-14 h-8 rounded-full transition-colors relative ${settings.wildOnes ? 'bg-amber-500' : 'bg-white/20'
                                }`}
                        >
                            <div
                                className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${settings.wildOnes ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                            />
                        </div>
                    </label>
                </div>

                {/* Max Players */}
                <div>
                    <label className="block text-sm text-white/70 mb-2">
                        Max Players
                    </label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => updateSettings({ maxPlayers: Math.max(2, settings.maxPlayers - 1) })}
                            className="btn-secondary px-4 py-2"
                        >
                            −
                        </button>
                        <span className="text-2xl font-bold w-12 text-center">
                            {settings.maxPlayers}
                        </span>
                        <button
                            onClick={() => updateSettings({ maxPlayers: settings.maxPlayers + 1 })}
                            className="btn-secondary px-4 py-2"
                        >
                            +
                        </button>
                    </div>
                    <p className="text-xs text-white/50 mt-1">Suggested: 8 players</p>
                </div>
            </div>
        </div>
    );
}
