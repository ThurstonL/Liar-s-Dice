import crypto from 'crypto';
import type { Bid, GameSettings } from '../../../shared/types.js';

/**
 * DiceEngine handles all dice-related logic:
 * - Rolling dice with cryptographic randomness
 * - Validating bids
 * - Evaluating challenges
 */
export class DiceEngine {
    /**
     * Roll dice for a player using cryptographically secure randomness
     */
    static rollDice(count: number): number[] {
        const dice: number[] = [];
        for (let i = 0; i < count; i++) {
            // crypto.randomInt is exclusive on the upper bound, so we use 1-7 to get 1-6
            dice.push(crypto.randomInt(1, 7));
        }
        return dice;
    }

    /**
     * Validate that a new bid is strictly greater than the current bid
     * A bid is greater if:
     * - It has a higher quantity, OR
     * - It has the same quantity but a higher face value
     */
    static isValidBid(newBid: Bid, currentBid: Bid | null): boolean {
        if (!currentBid) {
            // First bid of the round - any valid bid is acceptable
            return newBid.quantity >= 1 && newBid.faceValue >= 1 && newBid.faceValue <= 6;
        }

        // New bid must be strictly greater
        if (newBid.quantity > currentBid.quantity) {
            return newBid.faceValue >= 1 && newBid.faceValue <= 6;
        }

        if (newBid.quantity === currentBid.quantity && newBid.faceValue > currentBid.faceValue) {
            return true;
        }

        return false;
    }

    /**
     * Count how many dice match the bid's face value
     * If wildOnes is enabled, 1s count as any face value (except when bidding on 1s)
     */
    static countMatchingDice(
        allDice: Record<string, number[]>,
        faceValue: number,
        wildOnes: boolean
    ): number {
        let count = 0;

        for (const playerDice of Object.values(allDice)) {
            for (const die of playerDice) {
                if (die === faceValue) {
                    count++;
                } else if (wildOnes && die === 1 && faceValue !== 1) {
                    // Ones are wild (count as any value) unless bidding on 1s
                    count++;
                }
            }
        }

        return count;
    }

    /**
     * Evaluate a "Liar" challenge
     * Returns true if the bid was correct (challenger loses), false if bid was wrong (bidder loses)
     */
    static evaluateChallenge(
        bid: Bid,
        allDice: Record<string, number[]>,
        settings: GameSettings
    ): { bidWasCorrect: boolean; totalMatchingDice: number } {
        const totalMatchingDice = this.countMatchingDice(allDice, bid.faceValue, settings.wildOnes);

        // Bid is correct if there are at least as many matching dice as the quantity bid
        const bidWasCorrect = totalMatchingDice >= bid.quantity;

        return { bidWasCorrect, totalMatchingDice };
    }

    /**
     * Generate a short, human-readable room code
     */
    static generateRoomCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0, O, I, 1
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars[crypto.randomInt(0, chars.length)];
        }
        return code;
    }
}
