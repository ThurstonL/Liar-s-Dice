import { useSocket } from './hooks/useSocket';
import { useGameStore, useGamePhase } from './store/gameStore';
import { LobbyScreen } from './components/LobbyScreen';
import { GameScreen } from './components/GameScreen';
import { JoinScreen } from './components/JoinScreen';

export default function App() {
    useSocket(); // Initialize socket connection

    const isConnected = useGameStore((state) => state.isConnected);
    const error = useGameStore((state) => state.error);
    const publicState = useGameStore((state) => state.publicState);
    const phase = useGamePhase();

    // Show connection status
    if (!isConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-8 text-center max-w-md w-full">
                    {error ? (
                        <>
                            <div className="text-4xl mb-4">⚠️</div>
                            <h2 className="text-xl font-bold mb-2">Connection Issue</h2>
                            <p className="text-red-400 mb-6">{error}</p>
                            <p className="text-sm text-white/50 mb-6">
                                Make sure the server is running on the host machine and is reachable.
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="btn-primary w-full"
                            >
                                Retry Connection
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
                            <p className="text-white/70">Connecting to server...</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Show error toast if any
    const errorToast = error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 backdrop-blur text-white px-6 py-3 rounded-xl shadow-lg animate-shake">
            {error}
        </div>
    );

    // Not in a room yet - show join screen
    if (!publicState) {
        return (
            <>
                {errorToast}
                <JoinScreen />
            </>
        );
    }

    // In lobby - show lobby screen
    if (phase === 'LOBBY') {
        return (
            <>
                {errorToast}
                <LobbyScreen />
            </>
        );
    }

    // In game - show game screen
    return (
        <>
            {errorToast}
            <GameScreen />
        </>
    );
}
