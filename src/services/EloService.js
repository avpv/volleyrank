// src/services/EloService.js

import ratingConfig from '../config/rating.js';

/**
 * EloService - ELO rating calculations
 * Pure business logic with no state management
 *
 * This service handles all ELO rating calculations using centralized configuration
 * from rating.js, ensuring consistency across the application.
 */
class EloService {
    constructor(activityConfig) {
        // Store activity config
        this.config = activityConfig;

        // Import rating constants from centralized config
        this.DEFAULT_RATING = ratingConfig.RATING_CONSTANTS.DEFAULT;
        this.BASE_K_FACTOR = ratingConfig.K_FACTORS.BASE;
        this.RATING_DIVISOR = ratingConfig.RATING_CONSTANTS.RATING_DIVISOR;
        this.PROBABILITY_BASE = ratingConfig.RATING_CONSTANTS.PROBABILITY_BASE;

        // K-factor thresholds
        this.K_FACTORS = ratingConfig.K_FACTORS;

        // Pool adjustment settings
        this.POOL_ADJUSTMENT = ratingConfig.POOL_ADJUSTMENT;

        // Balance thresholds
        this.BALANCE_THRESHOLDS = ratingConfig.BALANCE_THRESHOLDS;

        // Confidence levels
        this.CONFIDENCE_LEVELS = ratingConfig.CONFIDENCE_LEVELS;

        // Position weights for team optimization
        // Imported from activity config to ensure consistency
        // Reflects the impact each position has on team balance
        this.POSITION_WEIGHTS = activityConfig.positionWeights;
    }

    /**
     * Calculate expected match outcome
     * Uses standard ELO probability formula
     *
     * @param {number} playerRating - Player's current rating
     * @param {number} opponentRating - Opponent's current rating
     * @returns {number} Expected score (0-1, where 1 = 100% win probability)
     */
    calculateExpectedScore(playerRating, opponentRating) {
        const ratingDifference = opponentRating - playerRating;
        return 1 / (1 + Math.pow(this.PROBABILITY_BASE, ratingDifference / this.RATING_DIVISOR));
    }

    /**
     * Dynamic K-factor based on experience and skill level
     * Higher K-factor for new players (more volatile)
     * Lower K-factor for experienced/high-rated players (more stable)
     *
     * @param {number} comparisons - Number of comparisons completed
     * @param {number} rating - Current rating
     * @returns {number} Calculated K-factor
     */
    calculateKFactor(comparisons, rating) {
        const thresholds = this.K_FACTORS.THRESHOLDS;

        // Novice players: high volatility
        if (comparisons < thresholds.NOVICE_COMPARISONS) {
            return this.K_FACTORS.NOVICE;
        }

        // Master players: low volatility
        if (rating > thresholds.MASTER_RATING && comparisons > thresholds.MASTER_COMPARISONS) {
            return this.K_FACTORS.MASTER;
        }

        // Expert players: reduced volatility
        if (rating > thresholds.EXPERT_RATING && comparisons > thresholds.EXPERT_COMPARISONS) {
            return this.K_FACTORS.EXPERT;
        }

        // Default: standard volatility
        return this.BASE_K_FACTOR;
    }

    /**
     * Pool-size adjusted K-factor for fair ELO distribution
     * Smaller pools get higher K-factors to compensate for fewer battles
     *
     * @param {number} baseK - Base K-factor from calculateKFactor
     * @param {number} poolSize - Number of players in the position pool
     * @param {number} referenceSize - Reference pool size (from config)
     * @returns {number} Adjusted K-factor
     */
    calculatePoolAdjustedKFactor(baseK, poolSize, referenceSize = null) {
        // Use config reference size if not provided
        const refSize = referenceSize || this.POOL_ADJUSTMENT.REFERENCE_SIZE;

        // Validate inputs
        if (poolSize <= 0) return baseK;
        if (poolSize === 1) return baseK; // Single player, no adjustment needed

        // Calculate adjustment factor: sqrt(referenceSize / poolSize)
        // This gives more volatility to smaller pools
        const adjustmentFactor = Math.sqrt(refSize / poolSize);

        // Apply adjustment with reasonable bounds from config
        const boundedFactor = Math.max(
            this.POOL_ADJUSTMENT.MIN_FACTOR,
            Math.min(this.POOL_ADJUSTMENT.MAX_FACTOR, adjustmentFactor)
        );

        return Math.round(baseK * boundedFactor);
    }

    /**
     * Calculate rating changes for a position
     *
     * @param {Object} winner - Winner player object
     * @param {Object} loser - Loser player object
     * @param {string} position - Position being compared
     * @param {number} poolSize - Optional: Number of players in position pool (for fair K-factor adjustment)
     * @returns {Object} Rating change details
     */
    calculateRatingChange(winner, loser, position, poolSize = null) {
        // Validate that winner and loser are different players
        if (winner.id === loser.id) {
            throw new Error('Cannot calculate rating change for same player');
        }

        const winnerRating = winner.ratings?.[position] || this.DEFAULT_RATING;
        const loserRating = loser.ratings?.[position] || this.DEFAULT_RATING;
        const winnerComparisons = winner.comparisons?.[position] || 0;
        const loserComparisons = loser.comparisons?.[position] || 0;

        // Validate rating values
        if (winnerRating < 0 || loserRating < 0) {
            throw new Error('Invalid rating value: ratings cannot be negative');
        }
        if (!isFinite(winnerRating) || !isFinite(loserRating)) {
            throw new Error('Invalid rating value: ratings must be finite numbers');
        }

        const winnerExpected = this.calculateExpectedScore(winnerRating, loserRating);
        const loserExpected = this.calculateExpectedScore(loserRating, winnerRating);

        // Calculate base K-factors
        const winnerBaseK = this.calculateKFactor(winnerComparisons, winnerRating);
        const loserBaseK = this.calculateKFactor(loserComparisons, loserRating);

        // Apply pool-size adjustment if poolSize is provided
        let winnerK = winnerBaseK;
        let loserK = loserBaseK;

        if (poolSize && poolSize > 1) {
            winnerK = this.calculatePoolAdjustedKFactor(winnerBaseK, poolSize);
            loserK = this.calculatePoolAdjustedKFactor(loserBaseK, poolSize);
        }

        const winnerChange = winnerK * (1 - winnerExpected);
        const loserChange = loserK * (0 - loserExpected);

        return {
            winner: {
                oldRating: winnerRating,
                newRating: winnerRating + winnerChange,
                change: winnerChange,
                kFactor: winnerK,
                baseKFactor: winnerBaseK,
                expected: winnerExpected
            },
            loser: {
                oldRating: loserRating,
                newRating: loserRating + loserChange,
                change: loserChange,
                kFactor: loserK,
                baseKFactor: loserBaseK,
                expected: loserExpected
            },
            poolSize: poolSize || null,
            poolAdjusted: poolSize && poolSize > 1
        };
    }

    /**
     * Predict match outcome
     * Calculates win probabilities based on ratings
     *
     * @param {Object} player1 - First player
     * @param {Object} player2 - Second player
     * @param {string} position - Position to compare
     * @returns {Object} Match prediction details
     */
    predictMatch(player1, player2, position) {
        const p1Rating = player1.ratings?.[position] || this.DEFAULT_RATING;
        const p2Rating = player2.ratings?.[position] || this.DEFAULT_RATING;

        const p1WinProb = this.calculateExpectedScore(p1Rating, p2Rating);
        const p2WinProb = this.calculateExpectedScore(p2Rating, p1Rating);

        const ratingDiff = Math.abs(p1Rating - p2Rating);

        return {
            player1: {
                name: player1.name,
                rating: p1Rating,
                position,
                winProbability: p1WinProb,
                winPercentage: Math.round(p1WinProb * 100)
            },
            player2: {
                name: player2.name,
                rating: p2Rating,
                position,
                winProbability: p2WinProb,
                winPercentage: Math.round(p2WinProb * 100)
            },
            ratingDifference: ratingDiff,
            isBalanced: ratingDiff < this.BALANCE_THRESHOLDS.MATCHUP_BALANCED
        };
    }

    /**
     * Calculate team strength
     * @param {Array} players - Team players
     * @param {boolean} usePositionWeights - Whether to apply position weights
     * @returns {Object} Team strength statistics
     */
    calculateTeamStrength(players, usePositionWeights = true) {
        if (!players || players.length === 0) {
            return {
                totalRating: 0,
                weightedRating: 0,
                averageRating: 0,
                playerCount: 0
            };
        }

        let totalRating = 0;
        let weightedRating = 0;

        players.forEach(player => {
            const position = player.assignedPosition || player.positions?.[0];
            const rating = position && player.ratings?.[position]
                ? player.ratings[position]
                : this.DEFAULT_RATING;

            totalRating += rating;

            // Apply position weight if enabled
            if (usePositionWeights && position) {
                const weight = this.POSITION_WEIGHTS[position] || 1.0;
                weightedRating += rating * weight;
            } else {
                weightedRating += rating;
            }
        });

        return {
            totalRating: Math.round(totalRating),
            weightedRating: Math.round(weightedRating),
            averageRating: Math.round(totalRating / players.length),
            playerCount: players.length
        };
    }

    /**
     * Evaluate balance between teams
     * @param {Array} teams - Array of teams to evaluate
     * @param {boolean} usePositionWeights - Whether to use weighted ratings for balance
     * @returns {Object} Balance evaluation
     */
    evaluateBalance(teams, usePositionWeights = true) {
        if (!teams || teams.length < 2) {
            return {
                isBalanced: true,
                maxDifference: 0,
                maxWeightedDifference: 0,
                teams: []
            };
        }

        const teamStats = teams.map(team => this.calculateTeamStrength(team, usePositionWeights));
        const ratings = teamStats.map(stats => stats.totalRating);
        const weightedRatings = teamStats.map(stats => stats.weightedRating);

        const maxRating = Math.max(...ratings);
        const minRating = Math.min(...ratings);
        const maxDifference = maxRating - minRating;

        const maxWeightedRating = Math.max(...weightedRatings);
        const minWeightedRating = Math.min(...weightedRatings);
        const maxWeightedDifference = maxWeightedRating - minWeightedRating;

        // Use weighted difference for balance check (from config)
        const isBalanced = maxWeightedDifference < this.BALANCE_THRESHOLDS.TEAM_BALANCED;

        return {
            isBalanced,
            maxDifference: Math.round(usePositionWeights ? maxWeightedDifference : maxDifference),
            maxWeightedDifference: Math.round(maxWeightedDifference),
            teams: teamStats.map((stats, index) => ({
                index,
                ...stats,
                strengthRank: weightedRatings.filter(r => r > stats.weightedRating).length + 1
            }))
        };
    }

    /**
     * Get player's best position
     */
    getBestPosition(player) {
        if (!player.ratings || !player.positions) {
            return null;
        }

        let bestPosition = null;
        let bestRating = 0;

        player.positions.forEach(pos => {
            const rating = player.ratings[pos] || this.DEFAULT_RATING;
            if (rating > bestRating) {
                bestRating = rating;
                bestPosition = pos;
            }
        });

        return {
            position: bestPosition,
            rating: bestRating,
            comparisons: player.comparisons?.[bestPosition] || 0
        };
    }

    /**
     * Compare player's ratings across positions
     */
    comparePositions(player) {
        if (!player.ratings || !player.positions) {
            return [];
        }

        return player.positions.map(pos => ({
            position: pos,
            rating: player.ratings[pos] || this.DEFAULT_RATING,
            comparisons: player.comparisons?.[pos] || 0,
            comparedWith: (player.comparedWith?.[pos] || []).length
        })).sort((a, b) => b.rating - a.rating);
    }

    /**
     * Calculate percentile rank for a player within their position pool
     *
     * @param {Object} player - The player to calculate percentile for
     * @param {string} position - The position to calculate for
     * @param {Array} allPlayersInPosition - All players who can play this position
     * @returns {Object} Percentile information
     */
    calculatePercentile(player, position, allPlayersInPosition) {
        if (!allPlayersInPosition || allPlayersInPosition.length === 0) {
            return { percentile: 0, rank: 0, total: 0 };
        }

        // Sort players by rating (descending)
        const sortedPlayers = [...allPlayersInPosition]
            .filter(p => p.ratings && p.ratings[position] !== undefined)
            .sort((a, b) => (b.ratings[position] || this.DEFAULT_RATING) - (a.ratings[position] || this.DEFAULT_RATING));

        // Find player's rank (1-based)
        const rank = sortedPlayers.findIndex(p => p.id === player.id) + 1;

        if (rank === 0) {
            return { percentile: 0, rank: 0, total: sortedPlayers.length };
        }

        // Calculate percentile (higher is better)
        // Top player = 100th percentile, bottom = 0th percentile
        const percentile = sortedPlayers.length === 1
            ? 100
            : Math.round(((sortedPlayers.length - rank) / (sortedPlayers.length - 1)) * 100);

        return {
            percentile,
            rank,
            total: sortedPlayers.length
        };
    }

    /**
     * Calculate confidence score for a player's rating at a position
     * Based on how many comparisons they've completed vs. total possible
     *
     * @param {Object} player - The player
     * @param {string} position - The position
     * @param {number} totalPlayersInPosition - Total players who can play this position
     * @returns {Object} Confidence information
     */
    calculateConfidence(player, position, totalPlayersInPosition) {
        const comparisons = player.comparisons?.[position] || 0;

        // Maximum possible comparisons for this player at this position
        const maxPossible = totalPlayersInPosition - 1;

        if (maxPossible === 0) {
            return {
                confidence: 0,
                comparisons,
                maxPossible: 0,
                level: 'none'
            };
        }

        // Calculate confidence as percentage of completed comparisons
        const confidence = Math.min(100, Math.round((comparisons / maxPossible) * 100));

        // Determine confidence level using centralized thresholds
        let level;
        const levels = this.CONFIDENCE_LEVELS;
        if (confidence < levels.LOW) level = 'very-low';
        else if (confidence < levels.MEDIUM) level = 'low';
        else if (confidence < levels.HIGH) level = 'medium';
        else if (confidence < levels.VERY_HIGH) level = 'high';
        else level = 'very-high';

        return {
            confidence,
            comparisons,
            maxPossible,
            level
        };
    }

    /**
     * Get enhanced player statistics for a position
     * Includes percentile, confidence, and pool-adjusted metrics
     *
     * @param {Object} player - The player
     * @param {string} position - The position
     * @param {Array} allPlayersInPosition - All players in this position
     * @returns {Object} Enhanced statistics
     */
    getEnhancedPlayerStats(player, position, allPlayersInPosition) {
        const rating = player.ratings?.[position] || this.DEFAULT_RATING;
        const comparisons = player.comparisons?.[position] || 0;
        const poolSize = allPlayersInPosition.length;

        // Calculate base K-factor
        const baseK = this.calculateKFactor(comparisons, rating);

        // Calculate pool-adjusted K-factor
        const adjustedK = this.calculatePoolAdjustedKFactor(baseK, poolSize);

        // Calculate percentile
        const percentileInfo = this.calculatePercentile(player, position, allPlayersInPosition);

        // Calculate confidence
        const confidenceInfo = this.calculateConfidence(player, position, poolSize);

        return {
            position,
            rating,
            comparisons,
            poolSize,
            baseKFactor: baseK,
            adjustedKFactor: adjustedK,
            percentile: percentileInfo.percentile,
            rank: percentileInfo.rank,
            confidence: confidenceInfo.confidence,
            confidenceLevel: confidenceInfo.level,
            maxPossibleComparisons: confidenceInfo.maxPossible
        };
    }
}

export default EloService;
