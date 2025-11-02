/**
 * Test script for Fair ELO Distribution
 *
 * This script demonstrates how the pool-adjusted K-factor works
 * to ensure fair ELO distribution across positions with different player counts.
 */

class EloService {
    constructor() {
        this.DEFAULT_RATING = 1500;
        this.BASE_K_FACTOR = 30;
    }

    calculateKFactor(comparisons, rating) {
        if (comparisons < 20) return 40;
        if (rating > 2000 && comparisons > 50) return 15;
        if (rating > 1800 && comparisons > 30) return 20;
        return this.BASE_K_FACTOR;
    }

    calculatePoolAdjustedKFactor(baseK, poolSize, referenceSize = 15) {
        if (poolSize <= 0) return baseK;
        if (poolSize === 1) return baseK;

        const adjustmentFactor = Math.sqrt(referenceSize / poolSize);
        const boundedFactor = Math.max(0.5, Math.min(2.0, adjustmentFactor));

        return Math.round(baseK * boundedFactor);
    }

    calculateExpectedScore(playerRating, opponentRating) {
        const ratingDifference = opponentRating - playerRating;
        return 1 / (1 + Math.pow(10, ratingDifference / 400));
    }

    calculatePercentile(player, position, allPlayersInPosition) {
        if (!allPlayersInPosition || allPlayersInPosition.length === 0) {
            return { percentile: 0, rank: 0, total: 0 };
        }

        const sortedPlayers = [...allPlayersInPosition]
            .filter(p => p.ratings && p.ratings[position] !== undefined)
            .sort((a, b) => (b.ratings[position] || this.DEFAULT_RATING) - (a.ratings[position] || this.DEFAULT_RATING));

        const rank = sortedPlayers.findIndex(p => p.id === player.id) + 1;

        if (rank === 0) {
            return { percentile: 0, rank: 0, total: sortedPlayers.length };
        }

        const percentile = sortedPlayers.length === 1
            ? 100
            : Math.round(((sortedPlayers.length - rank) / (sortedPlayers.length - 1)) * 100);

        return {
            percentile,
            rank,
            total: sortedPlayers.length
        };
    }

    calculateConfidence(player, position, totalPlayersInPosition) {
        const comparisons = player.comparisons?.[position] || 0;
        const maxPossible = totalPlayersInPosition - 1;

        if (maxPossible === 0) {
            return {
                confidence: 0,
                comparisons,
                maxPossible: 0,
                level: 'none'
            };
        }

        const confidence = Math.min(100, Math.round((comparisons / maxPossible) * 100));

        let level;
        if (confidence < 20) level = 'very-low';
        else if (confidence < 40) level = 'low';
        else if (confidence < 60) level = 'medium';
        else if (confidence < 80) level = 'high';
        else level = 'very-high';

        return {
            confidence,
            comparisons,
            maxPossible,
            level
        };
    }
}

// Run tests
console.log('='.repeat(70));
console.log('FAIR ELO DISTRIBUTION - K-FACTOR ADJUSTMENT');
console.log('='.repeat(70));
console.log();

const elo = new EloService();

// Test 1: K-factor adjustment for different pool sizes
console.log('📊 TEST 1: K-Factor Adjustment for Different Pool Sizes');
console.log('-'.repeat(70));

const poolSizes = [3, 5, 10, 15, 20, 30];
const baseK = 30;

console.log(`Base K-factor: ${baseK}`);
console.log(`Reference pool size: 15`);
console.log();

poolSizes.forEach(poolSize => {
    const adjustedK = elo.calculatePoolAdjustedKFactor(baseK, poolSize);
    const maxComparisons = (poolSize * (poolSize - 1)) / 2;
    const adjustmentPercent = Math.round(((adjustedK - baseK) / baseK) * 100);

    console.log(`Pool: ${poolSize.toString().padStart(2)} players | ` +
                `Adjusted K: ${adjustedK.toString().padStart(2)} | ` +
                `Change: ${adjustmentPercent > 0 ? '+' : ''}${adjustmentPercent}% | ` +
                `Max battles: ${maxComparisons}`);
});

console.log();

// Test 2: Rating volatility comparison
console.log('📈 TEST 2: Rating Change Comparison');
console.log('-'.repeat(70));

const player1Rating = 1500;
const player2Rating = 1500;
const comparisons = 5;

console.log(`Scenario: Two equally-rated players (${player1Rating} each), ${comparisons} comparisons`);
console.log();

poolSizes.forEach(poolSize => {
    const baseK = elo.calculateKFactor(comparisons, player1Rating);
    const adjustedK = elo.calculatePoolAdjustedKFactor(baseK, poolSize);
    const expected = elo.calculateExpectedScore(player1Rating, player2Rating);
    const ratingChange = adjustedK * (1 - expected);

    console.log(`Pool: ${poolSize.toString().padStart(2)} players | ` +
                `K: ${adjustedK.toString().padStart(2)} | ` +
                `Rating change per win: ±${Math.round(ratingChange)}`);
});

console.log();

// Test 3: Percentile calculation
console.log('🎯 TEST 3: Percentile Calculation');
console.log('-'.repeat(70));

const position = 'OH';
const testPlayers = [
    { id: 1, name: 'Alice', ratings: { OH: 1800 }, comparisons: { OH: 10 } },
    { id: 2, name: 'Bob', ratings: { OH: 1650 }, comparisons: { OH: 8 } },
    { id: 3, name: 'Carol', ratings: { OH: 1550 }, comparisons: { OH: 7 } },
    { id: 4, name: 'Dave', ratings: { OH: 1500 }, comparisons: { OH: 5 } },
    { id: 5, name: 'Eve', ratings: { OH: 1450 }, comparisons: { OH: 4 } }
];

testPlayers.forEach(player => {
    const percentileInfo = elo.calculatePercentile(player, position, testPlayers);
    const confidenceInfo = elo.calculateConfidence(player, position, testPlayers.length);

    console.log(`${player.name.padEnd(6)} | ` +
                `Rating: ${player.ratings[position]} | ` +
                `Rank: ${percentileInfo.rank}/${percentileInfo.total} | ` +
                `Percentile: ${percentileInfo.percentile}% | ` +
                `Confidence: ${confidenceInfo.confidence}% (${confidenceInfo.level})`);
});

console.log();

// Test 4: Fairness comparison
console.log('⚖️  TEST 4: Fairness Analysis - Total Rating Gain Potential');
console.log('-'.repeat(70));

console.log('After completing all possible comparisons (assuming 50% win rate):');
console.log();

const scenarios = [
    { name: 'Libero (small)', players: 5 },
    { name: 'Middle Blocker', players: 10 },
    { name: 'Outside Hitter', players: 20 }
];

scenarios.forEach(scenario => {
    const maxComparisons = (scenario.players * (scenario.players - 1)) / 2;
    const comparisonsPerPlayer = scenario.players - 1;
    const avgComparisons = comparisonsPerPlayer / 2; // assuming 50% win rate

    const baseK = elo.calculateKFactor(avgComparisons, 1500);
    const adjustedK = elo.calculatePoolAdjustedKFactor(baseK, scenario.players);
    const expected = elo.calculateExpectedScore(1500, 1500);
    const ratingChangePerWin = adjustedK * (1 - expected);

    // Total rating spread possible
    const totalRatingSpread = ratingChangePerWin * comparisonsPerPlayer;

    console.log(`${scenario.name.padEnd(22)} | ` +
                `Players: ${scenario.players.toString().padStart(2)} | ` +
                `Adjusted K: ${adjustedK.toString().padStart(2)} | ` +
                `Max battles: ${maxComparisons.toString().padStart(3)} | ` +
                `Rating spread: ±${Math.round(totalRatingSpread)}`);
});

console.log();
console.log('Note: The "rating spread" shows the theoretical maximum rating');
console.log('difference between top and bottom players after all comparisons.');
console.log('Pool-adjusted K-factors help normalize this across different pool sizes.');
console.log();

// Summary
console.log('='.repeat(70));
console.log('✅ SUMMARY: How Fair ELO Distribution Works');
console.log('='.repeat(70));
console.log();
console.log('1. POOL-SIZE ADJUSTED K-FACTOR:');
console.log('   - Smaller pools get HIGHER K-factors (more volatile ratings)');
console.log('   - Larger pools get LOWER K-factors (more stable ratings)');
console.log('   - Formula: adjustedK = baseK × √(referenceSize / poolSize)');
console.log();
console.log('2. PERCENTILE RANKINGS:');
console.log('   - Shows relative position within position pool (0-100%)');
console.log('   - Makes ratings comparable across positions');
console.log('   - Example: 1st of 5 = 100th percentile, 10th of 20 = 50th percentile');
console.log();
console.log('3. CONFIDENCE SCORES:');
console.log('   - Indicates how "settled" a rating is');
console.log('   - Based on: (completed comparisons / max possible) × 100%');
console.log('   - Helps identify ratings that need more data');
console.log();
console.log('Benefits:');
console.log('  • Fair competition regardless of position pool size');
console.log('  • Comparable ratings across all positions');
console.log('  • Transparent confidence in rating accuracy');
console.log('  • Compensates for fewer battles in small pools');
console.log();
console.log('='.repeat(70));
