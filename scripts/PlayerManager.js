/**
 * Player management with multiple position ratings
 */
class PlayerManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.positions = {
            'S': 'Setter',
            'OPP': 'Opposite', 
            'OH': 'Outside Hitter',
            'MB': 'Middle Blocker',
            'L': 'Libero'
        };
    }

    /**
     * Validate player data
     */
    validatePlayer(name, positions) {
        const errors = [];

        if (!name || typeof name !== 'string') {
            errors.push('Player name is required');
        } else {
            const trimmedName = name.trim();
            if (trimmedName.length === 0) {
                errors.push('Player name cannot be empty');
            } else if (trimmedName.length > 50) {
                errors.push('Player name is too long (max 50 characters)');
            } else if (!/^[a-zA-Z\s\u0400-\u04FF-]+$/.test(trimmedName)) {
                errors.push('Player name contains invalid characters');
            }
        }

        if (!Array.isArray(positions) || positions.length === 0) {
            errors.push('At least one position is required');
        } else {
            const validPositions = Object.keys(this.positions);
            const invalidPositions = positions.filter(pos => !validPositions.includes(pos));
            if (invalidPositions.length > 0) {
                errors.push(`Invalid positions: ${invalidPositions.join(', ')}`);
            }
            
            const uniquePositions = [...new Set(positions)];
            if (uniquePositions.length !== positions.length) {
                errors.push('Duplicate positions are not allowed');
            }

            if (positions.length > 3) {
                errors.push('Maximum 3 positions allowed per player');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitizedName: name ? name.trim() : '',
            sanitizedPositions: Array.isArray(positions) ? [...new Set(positions)] : []
        };
    }

    /**
     * Get players who can play a specific position
     */
    getPlayersForPosition(position) {
        const state = this.stateManager.getState();
        return state.players.filter(player => 
            player.positions && player.positions.includes(position)
        );
    }

    /**
     * Get position statistics
     */
    getPositionStats() {
        const state = this.stateManager.getState();
        const stats = {};
        
        Object.keys(this.positions).forEach(pos => {
            stats[pos] = {
                canPlay: 0,
                players: []
            };
        });

        state.players.forEach(player => {
            if (player.positions && Array.isArray(player.positions)) {
                player.positions.forEach(pos => {
                    if (stats[pos]) {
                        stats[pos].canPlay++;
                        stats[pos].players.push(player);
                    }
                });
            }
        });

        return stats;
    }

    /**
     * Get player rankings by position
     */
    getRankingsByPosition() {
        const state = this.stateManager.getState();
        const rankings = {};

        Object.keys(this.positions).forEach(position => {
            const playersForPosition = state.players
                .filter(player => player.positions && player.positions.includes(position))
                .map(player => ({
                    ...player,
                    positionRating: player.ratings[position],
                    positionComparisons: player.comparisons[position]
                }))
                .sort((a, b) => b.positionRating - a.positionRating);
            
            rankings[position] = playersForPosition;
        });

        return rankings;
    }

    /**
     * Find next pair for comparison at specific position
     */
    findNextComparisonPair(position) {
        const positionPlayers = this.getPlayersForPosition(position);
        
        if (positionPlayers.length < 2) {
            return null;
        }

        // Find players with minimum comparisons for this position
        const minComparisons = Math.min(
            ...positionPlayers.map(p => p.comparisons[position] || 0)
        );
        
        let comparisonPool = positionPlayers.filter(
            p => (p.comparisons[position] || 0) === minComparisons
        );
        comparisonPool = this.shuffleArray([...comparisonPool]);
        
        let foundPair = this.findValidPairForPosition(comparisonPool, position);
        
        if (!foundPair) {
            const allPositionPlayers = [...positionPlayers].sort((a, b) => 
                (a.comparisons[position] || 0) - (b.comparisons[position] || 0)
            );
            foundPair = this.findValidPairForPosition(allPositionPlayers, position);
        }

        return foundPair;
    }

    /**
     * Find valid pair for position (not yet compared at this position)
     */
    findValidPairForPosition(players, position) {
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const player1 = players[i];
                const player2 = players[j];
                
                const p1ComparedWith = player1.comparedWith[position] || [];
                const p2ComparedWith = player2.comparedWith[position] || [];
                
                if (!p1ComparedWith.includes(player2.name) && 
                    !p2ComparedWith.includes(player1.name)) {
                    return [player1, player2];
                }
            }
        }
        return null;
    }

    /**
     * Random array shuffle
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Check position readiness for comparisons
     */
    getPositionComparisonStatus(position) {
        const players = this.getPlayersForPosition(position);
        
        if (players.length < 2) {
            return {
                canCompare: false,
                reason: 'Not enough players for this position',
                playersCount: players.length
            };
        }

        const nextPair = this.findNextComparisonPair(position);
        
        if (!nextPair) {
            return {
                canCompare: false,
                reason: 'All possible pairs have been compared',
                playersCount: players.length,
                allPairsCompared: true
            };
        }

        return {
            canCompare: true,
            playersCount: players.length,
            nextPair
        };
    }

    /**
     * Get detailed player statistics
     */
    getPlayerStats(playerId) {
        const state = this.stateManager.getState();
        const player = state.players.find(p => p.id === playerId);
        
        if (!player) return null;

        // Calculate stats for each position
        const positionStats = {};
        player.positions.forEach(pos => {
            const playersAtPosition = this.getPlayersForPosition(pos);
            const rank = playersAtPosition
                .sort((a, b) => b.ratings[pos] - a.ratings[pos])
                .findIndex(p => p.id === playerId) + 1;
            
            positionStats[pos] = {
                rating: player.ratings[pos],
                comparisons: player.comparisons[pos],
                rank: rank,
                totalPlayers: playersAtPosition.length
            };
        });

        return {
            ...player,
            positionStats,
            isMultiPosition: player.positions && player.positions.length > 1
        };
    }

    /**
     * Check if player can be reset
     */
    canResetPlayer(playerId) {
        const state = this.stateManager.getState();
        const player = state.players.find(p => p.id === playerId);
        
        if (!player) {
            return { canReset: false, reason: 'Player not found' };
        }

        // Check if any position has non-default values
        const hasNonDefaultRating = Object.values(player.ratings).some(r => r !== 1500);
        const hasComparisons = Object.values(player.comparisons).some(c => c > 0);

        if (!hasNonDefaultRating && !hasComparisons) {
            return { canReset: false, reason: 'Player already has default ratings' };
        }

        return { canReset: true };
    }

    /**
     * Search players by name
     */
    searchPlayers(searchTerm) {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }

        const state = this.stateManager.getState();
        const term = searchTerm.toLowerCase().trim();
        
        return state.players.filter(player => {
            if (player.name.toLowerCase().includes(term)) {
                return true;
            }
            
            if (player.positions && Array.isArray(player.positions)) {
                return player.positions.some(pos => 
                    this.positions[pos] && this.positions[pos].toLowerCase().includes(term)
                );
            }
            
            return false;
        });
    }
}

window.PlayerManager = PlayerManager;
