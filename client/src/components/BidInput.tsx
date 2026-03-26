import { useState } from 'react';
import { useGameStore, useCurrentBid, useSettings } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { DieSelect } from './DiceDisplay';

export function BidInput() {
    const currentBid = useCurrentBid();
    const settings = useSettings();
    const privateState = useGameStore((state) => state.privateState);
    const { makeBid, callLiar } = useSocket();

    // Initialize to minimum valid bid
    const minFaceValue = currentBid ? currentBid.faceValue + 1 : 1;

    const [quantity, setQuantity] = useState(currentBid ? currentBid.quantity : 1);
    const [faceValue, setFaceValue] = useState(minFaceValue > 6 ? 1 : minFaceValue);

    const canBid = privateState?.canBid ?? false;
    const canCallLiar = privateState?.canCallLiar ?? false;

    // Validate bid
    const isValidBid = () => {
        if (!currentBid) return quantity >= 1 && faceValue >= 1 && faceValue <= 6;
        if (quantity > currentBid.quantity) return true;
        if (quantity === currentBid.quantity && faceValue > currentBid.faceValue) return true;
        return false;
    };

    const handleBid = () => {
        if (isValidBid()) {
            makeBid(quantity, faceValue);
        }
    };

    if (!canBid) return null;

    return (
        <div className="glass-card p-4 space-y-4">
            <h3 className="font-display text-lg font-semibold text-center">Make Your Bid</h3>

            {/* Quantity selector */}
            <div>
                <label className="block text-sm text-white/70 mb-2 text-center">Quantity</label>
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="btn-secondary px-4 py-2 text-xl"
                    >
                        −
                    </button>
                    <span className="text-4xl font-bold w-16 text-center">{quantity}</span>
                    <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="btn-secondary px-4 py-2 text-xl"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Face value selector */}
            <div>
                <label className="block text-sm text-white/70 mb-2 text-center">Face Value</label>
                <div className="flex justify-center gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5, 6].map((value) => (
                        <DieSelect
                            key={value}
                            value={value}
                            selected={faceValue === value}
                            onClick={() => setFaceValue(value)}
                        />
                    ))}
                </div>
                {settings.wildOnes && (
                    <p className="text-xs text-amber-400 text-center mt-2">
                        🎲 Wild Ones: 1s count as any value!
                    </p>
                )}
            </div>

            {/* Current bid context */}
            {currentBid && (
                <div className="text-center text-white/60 text-sm">
                    Current bid: <span className="font-bold text-white">{currentBid.quantity} × {currentBid.faceValue}s</span>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
                <button
                    onClick={handleBid}
                    disabled={!isValidBid()}
                    className="btn-primary flex-1"
                >
                    Bid {quantity} × {faceValue}s
                </button>
                {canCallLiar && (
                    <button
                        onClick={callLiar}
                        className="btn-danger flex-1"
                    >
                        🎭 LIAR!
                    </button>
                )}
            </div>
        </div>
    );
}
