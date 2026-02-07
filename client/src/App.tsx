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
            <div className="min-h-screen flex items-center justify-center">
                <div className="glass-card p-8 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-white/70">Connecting to server...</p>
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
