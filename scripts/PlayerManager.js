/**
 * Player management and comparison logic
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
     * @param {string} name - player name
     * @param {string} position - position
     * @returns {object} validation result object
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

        // Validate positions array
        if (!Array.isArray(positions) || positions.length === 0) {
            errors.push('At least one position is required');
        } else {
            const validPositions = Object.keys(this.positions);
            const invalidPositions = positions.filter(pos => !validPositions.includes(pos));
            if (invalidPositions.length > 0) {
                errors.push(`Invalid positions: ${invalidPositions.join(', ')}`);
            }
            
            // Check for duplicates
            const uniquePositions = [...new Set(positions)];
            if (uniquePositions.length !== positions.length) {
                errors.push('Duplicate positions are not allowed');
            }

            // Maximum positions limit (e.g., no more than 3)
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
     * Get players by position
     * @param {string} position - position
     * @returns {array} array of players
     */
    getPlayersByPosition(position) {
        const state = this.stateManager.getState();
        return state.players.filter(player => player.position === position);
    }

    // New method to get players who can play a specific position
    getPlayersForPosition(position) {
        const state = this.stateManager.getState();
        return state.players.filter(player => 
            player.positions && player.positions.includes(position)
        );
    }

    // Updated method to get players by primary position
    getPlayersByPrimaryPosition(position) {
        const state = this.stateManager.getState();
        return state.players.filter(player => player.primaryPosition === position);
    }

    /**
     * Get position statistics
     * @returns {object} object with player count by position
     */
    getPositionStats() {
        const state = this.stateManager.getState();
        const stats = {};
        
        // Initialize statistics
        Object.keys(this.positions).forEach(pos => {
            stats[pos] = {
                primary: 0,      // Players with this as primary position
                canPlay: 0,      // Players who can play this position
                players: []      // List of players
            };
        });

        // Count statistics
        state.players.forEach(player => {
            // Primary position
            if (player.primaryPosition && stats[player.primaryPosition]) {
                stats[player.primaryPosition].primary++;
            }

            // All positions they can play
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
     * @returns {object} object with rankings by position
     */
    getRankingsByPosition() {
        const state = this.stateManager.getState();
        const rankings = {};

        Object.keys(this.positions).forEach(position => {
            // Rankings by primary position
            const primaryPlayers = state.players
                .filter(player => player.primaryPosition === position)
                .sort((a, b) => b.rating - a.rating);
                
            // Also show players who can play this position
            const allPlayersForPosition = state.players
                .filter(player => player.positions && player.positions.includes(position))
                .sort((a, b) => b.rating - a.rating);
            
            rankings[position] = {
                primary: primaryPlayers,
                canPlay: allPlayersForPosition
            };
        });

        return rankings;
    }

    /**
     * Find next pair for comparison
     * @param {string} position - position for comparison
     * @returns {array|null} pair of players or null
     */
    findNextComparisonPair(position) {
        // First try to find players with this as primary position
        let positionPlayers = this.getPlayersByPrimaryPosition(position);
        
        // If not enough players with primary position, get all who can play
        if (positionPlayers.length < 2) {
            positionPlayers = this.getPlayersForPosition(position);
        }
        
        if (positionPlayers.length < 2) {
            return null;
        }

        // Rest of the logic remains the same
        const minComparisons = Math.min(...positionPlayers.map(p => p.comparisons));
        let comparisonPool = positionPlayers.filter(p => p.comparisons === minComparisons);
        comparisonPool = this.shuffleArray([...comparisonPool]);
        
        let foundPair = this.findValidPair(comparisonPool);
        
        if (!foundPair) {
            const allPositionPlayers = [...positionPlayers].sort((a, b) => a.comparisons - b.comparisons);
            foundPair = this.findValidPair(allPositionPlayers);
        }

        return foundPair;
    }

    /**
     * Find valid pair (not yet compared)
     * @param {array} players - array of players
     * @returns {array|null} pair of players or null
     */
    findValidPair(players) {
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const player1 = players[i];
                const player2 = players[j];
                
                if (!player1.comparedWith.includes(player2.name) && 
                    !player2.comparedWith.includes(player1.name)) {
                    return [player1, player2];
                }
            }
        }
        return null;
    }

    /**
     * Random array shuffle (Fisher-Yates shuffle)
     * @param {array} array - array to shuffle
     * @returns {array} shuffled array
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
     * @param {string} position - position
     * @returns {object} object with readiness information
     */
    getPositionComparisonStatus(position) {
        // First try to find players with primary position
        let players = this.getPlayersByPrimaryPosition(position);
        let comparisonType = 'primary';
        
        // If not enough, get all who can play this position
        if (players.length < 2) {
            players = this.getPlayersForPosition(position);
            comparisonType = 'all';
        }
        
        if (players.length < 2) {
            return {
                canCompare: false,
                reason: 'Not enough players for this position',
                playersCount: players.length,
                comparisonType
            };
        }

        const nextPair = this.findNextComparisonPair(position);
        
        if (!nextPair) {
            return {
                canCompare: false,
                reason: 'All possible pairs have been compared',
                playersCount: players.length,
                allPairsCompared: true,
                comparisonType
            };
        }

        return {
            canCompare: true,
            playersCount: players.length,
            nextPair,
            comparisonType
        };
    }

    /**
     * Get detailed player statistics
     * @param {number} playerId - player ID
     * @returns {object|null} player statistics
     */
    getPlayerStats(playerId) {
        const state = this.stateManager.getState();
        const player = state.players.find(p => p.id === playerId);
        
        if (!player) return null;

        // Ranking among players with same primary position
        const primaryPositionPlayers = this.getPlayersByPrimaryPosition(player.primaryPosition);
        const primaryPositionRank = primaryPositionPlayers
            .sort((a, b) => b.rating - a.rating)
            .findIndex(p => p.id === playerId) + 1;

        // Information about all positions
        const positionNames = player.positions 
            ? player.positions.map(pos => this.positions[pos]) 
            : [this.positions[player.primaryPosition] || 'Unknown'];

        const winRate = player.comparisons > 0 ? 
            ((player.rating - 1500) / (player.comparisons * 30) + 0.5) * 100 : 50;

        return {
            ...player,
            primaryPositionName: this.positions[player.primaryPosition],
            allPositionNames: positionNames,
            positionRank: primaryPositionRank,
            totalInPrimaryPosition: primaryPositionPlayers.length,
            estimatedWinRate: Math.max(0, Math.min(100, Math.round(winRate))),
            isMultiPosition: player.positions && player.positions.length > 1
        };
    }

    /**
     * Check if player can be reset
     * @param {number} playerId - player ID
     * @returns {object} information about reset possibility
     */
    canResetPlayer(playerId) {
        const state = this.stateManager.getState();
        const player = state.players.find(p => p.id === playerId);
        
        if (!player) {
            return { canReset: false, reason: 'Player not found' };
        }

        if (player.comparisons === 0 && player.rating === 1500) {
            return { canReset: false, reason: 'Player already has default rating' };
        }

        return { canReset: true };
    }

    /**
     * Get player rating history (placeholder for future functionality)
     * @param {number} playerId - player ID
     * @returns {array} rating history
     */
    getPlayerRatingHistory(playerId) {
        // TODO: Implement rating history tracking
        return [];
    }

    /**
     * Search players by name
     * @param {string} searchTerm - search query
     * @returns {array} found players
     */
    searchPlayers(searchTerm) {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }

        const state = this.stateManager.getState();
        const term = searchTerm.toLowerCase().trim();
        
        return state.players.filter(player => {
            // Search by name
            if (player.name.toLowerCase().includes(term)) {
                return true;
            }
            
            // Search by positions
            if (player.positions && Array.isArray(player.positions)) {
                return player.positions.some(pos => 
                    this.positions[pos] && this.positions[pos].toLowerCase().includes(term)
                );
            }
            
            // Search by primary position (for backward compatibility)
            if (player.primaryPosition) {
                return this.positions[player.primaryPosition] && 
                    this.positions[player.primaryPosition].toLowerCase().includes(term);
            }
            
            return false;
        });
    }
}

window.PlayerManager = PlayerManager;
