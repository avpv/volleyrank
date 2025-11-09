// src/services/ComparisonService.js

/**
 * ComparisonService - Player comparison logic
 * Handles finding pairs and processing comparisons
 */

class ComparisonService {
    constructor(activityConfig, playerService, eloService, eventBus) {
        // Store dependencies
        this.config = activityConfig;
        this.playerService = playerService;
        this.eloService = eloService;
        this.eventBus = eventBus;
        this.stateManager = playerService.stateManager; // Get stateManager from playerService
    }

    /**
     * Find next pair for comparison at position
     * Deterministic - returns same pair for same state
     */
    findNextPair(position) {
        const players = this.playerService.getByPosition(position);
        
        if (players.length < 2) {
            return null;
        }

        // Find players with minimum comparisons
        const minComparisons = Math.min(
            ...players.map(p => p.comparisons[position] || 0)
        );
        
        let pool = players.filter(
            p => (p.comparisons[position] || 0) === minComparisons
        );
        
        // Sort deterministically by ID
        pool.sort((a, b) => a.id - b.id);
        
        let pair = this.findValidPair(pool, position);
        
        if (!pair) {
            // Try all players sorted by comparisons
            const allPlayers = [...players].sort((a, b) => {
                const compDiff = (a.comparisons[position] || 0) - (b.comparisons[position] || 0);
                return compDiff !== 0 ? compDiff : a.id - b.id;
            });
            
            pair = this.findValidPair(allPlayers, position);
        }

        return pair;
    }

    /**
     * Find valid pair (not yet compared)
     */
    findValidPair(players, position) {
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const p1 = players[i];
                const p2 = players[j];
                
                const p1Compared = p1.comparedWith[position] || [];
                const p2Compared = p2.comparedWith[position] || [];
                
                if (!p1Compared.includes(p2.name) && 
                    !p2Compared.includes(p1.name)) {
                    return [p1, p2];
                }
            }
        }
        
        return null;
    }

    /**
     * Check if position is ready for comparisons
     */
    checkStatus(position) {
        const players = this.playerService.getByPosition(position);
        
        if (players.length < 2) {
            return {
                canCompare: false,
                reason: 'Need at least 2 players',
                playerCount: players.length
            };
        }

        const pair = this.findNextPair(position);
        
        if (!pair) {
            return {
                canCompare: false,
                reason: 'All pairs compared',
                playerCount: players.length,
                allPairsCompared: true
            };
        }

        return {
            canCompare: true,
            playerCount: players.length,
            nextPair: pair
        };
    }

    /**
     * Process a comparison
     */
    processComparison(winnerId, loserId, position) {
        // Validate that winner and loser are different
        if (winnerId === loserId) {
            throw new Error('Cannot compare a player with themselves');
        }

        const state = this.stateManager.getState();
        const winner = state.players.find(p => p.id === winnerId);
        const loser = state.players.find(p => p.id === loserId);

        if (!winner || !loser) {
            throw new Error('Players not found');
        }

        if (!winner.ratings[position] || !loser.ratings[position]) {
            throw new Error(`Players don't have ratings for ${position}`);
        }

        // Check if players have already been compared at this position
        const winnerCompared = winner.comparedWith[position] || [];
        if (winnerCompared.includes(loser.name)) {
            throw new Error('These players have already been compared at this position');
        }

        // Get pool size for fair K-factor adjustment
        const poolSize = this.playerService.getByPosition(position).length;

        // Calculate rating changes with pool-adjusted K-factor
        const changes = this.eloService.calculateRatingChange(winner, loser, position, poolSize);

        // Update players
        const updatedPlayers = state.players.map(p => {
            if (p.id === winnerId) {
                return {
                    ...p,
                    ratings: {
                        ...p.ratings,
                        [position]: changes.winner.newRating
                    },
                    comparisons: {
                        ...p.comparisons,
                        [position]: (p.comparisons[position] || 0) + 1
                    },
                    comparedWith: {
                        ...p.comparedWith,
                        [position]: [
                            ...(p.comparedWith[position] || []),
                            loser.name
                        ].filter((name, idx, arr) => arr.indexOf(name) === idx)
                    }
                };
            } else if (p.id === loserId) {
                return {
                    ...p,
                    ratings: {
                        ...p.ratings,
                        [position]: changes.loser.newRating
                    },
                    comparisons: {
                        ...p.comparisons,
                        [position]: (p.comparisons[position] || 0) + 1
                    },
                    comparedWith: {
                        ...p.comparedWith,
                        [position]: [
                            ...(p.comparedWith[position] || []),
                            winner.name
                        ].filter((name, idx, arr) => arr.indexOf(name) === idx)
                    }
                };
            }
            return p;
        });

        // Update state
        this.stateManager.setState({
            players: updatedPlayers,
            comparisons: state.comparisons + 1
        });

        const result = {
            winner: updatedPlayers.find(p => p.id === winnerId),
            loser: updatedPlayers.find(p => p.id === loserId),
            position,
            changes
        };

        this.eventBus.emit('comparison:completed', result);
        
        return result;
    }

    /**
     * Get comparison progress for position
     */
    getProgress(position) {
        const players = this.playerService.getByPosition(position);
        
        if (players.length < 2) {
            return {
                completed: 0,
                total: 0,
                percentage: 0,
                remaining: 0
            };
        }

        const totalPairs = (players.length * (players.length - 1)) / 2;
        const comparedPairs = new Set();
        
        // Each comparison is stored in both players' comparedWith lists,
        // but the Set with sorted names ensures each pair is counted only once
        players.forEach(player => {
            const compared = player.comparedWith[position] || [];
            compared.forEach(opponentName => {
                const pair = [player.name, opponentName].sort().join('|');
                comparedPairs.add(pair);
            });
        });
        
        const completed = comparedPairs.size;
        const remaining = totalPairs - completed;
        const percentage = Math.round((completed / totalPairs) * 100);

        return {
            completed,
            total: totalPairs,
            percentage,
            remaining
        };
    }

    /**
     * Get all position progress
     */
    getAllProgress() {
        const positions = this.config.positionOrder;
        const progress = {};

        positions.forEach(pos => {
            progress[pos] = this.getProgress(pos);
        });

        return progress;
    }

    /**
     * Reset all comparisons for positions
     */
    resetAll(positions) {
        const state = this.stateManager.getState();
        
        const updatedPlayers = state.players.map(player => {
            const updated = { ...player };
            
            positions.forEach(pos => {
                if (updated.ratings[pos]) {
                    updated.ratings[pos] = 1500;
                    updated.comparisons[pos] = 0;
                    updated.comparedWith[pos] = [];
                }
            });
            
            return updated;
        });

        // Recalculate total comparisons
        let totalComparisons = 0;
        const allPositions = this.config.positionOrder;
        const nonResetPositions = allPositions.filter(p => !positions.includes(p));
        
        updatedPlayers.forEach(player => {
            nonResetPositions.forEach(pos => {
                if (player.comparisons[pos]) {
                    totalComparisons += player.comparisons[pos];
                }
            });
        });
        totalComparisons = Math.floor(totalComparisons / 2);

        this.stateManager.setState({
            players: updatedPlayers,
            comparisons: totalComparisons
        });

        this.eventBus.emit('comparison:reset-all', {
            positions,
            playersAffected: updatedPlayers.length
        });
    }
}

export default ComparisonService;
