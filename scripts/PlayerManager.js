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
    validatePlayer(name, position) {
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

        if (!position || !this.positions[position]) {
            errors.push('Valid position is required');
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitizedName: name ? name.trim() : ''
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

    /**
     * Get position statistics
     * @returns {object} object with player count by position
     */
    getPositionStats() {
        const state = this.stateManager.getState();
        const stats = {};
        
        // Initialize all positions with zeros
        Object.keys(this.positions).forEach(pos => {
            stats[pos] = 0;
        });

        // Count players
        state.players.forEach(player => {
            if (stats[player.position] !== undefined) {
                stats[player.position]++;
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
            const positionPlayers = state.players
                .filter(player => player.position === position)
                .sort((a, b) => b.rating - a.rating);
            
            rankings[position] = positionPlayers;
        });

        return rankings;
    }

    /**
     * Find next pair for comparison
     * @param {string} position - position for comparison
     * @returns {array|null} pair of players or null
     */
    findNextComparisonPair(position) {
        const positionPlayers = this.getPlayersByPosition(position);
        
        if (positionPlayers.length < 2) {
            return null;
        }

        // Find minimum comparison count
        const minComparisons = Math.min(...positionPlayers.map(p => p.comparisons));
        
        // Players with minimum comparisons
        let comparisonPool = positionPlayers.filter(p => p.comparisons === minComparisons);
        
        // Randomly shuffle for variety
        comparisonPool = this.shuffleArray([...comparisonPool]);
        
        // Look for pair among players with minimum comparisons
        let foundPair = this.findValidPair(comparisonPool);
        
        // If not found, search among all position players
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
        const players = this.getPlayersByPosition(position);
        
        if (players.length < 2) {
            return {
                canCompare: false,
                reason: 'Not enough players in this position',
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
     * @param {number} playerId - player ID
     * @returns {object|null} player statistics
     */
    getPlayerStats(playerId) {
        const state = this.stateManager.getState();
        const player = state.players.find(p => p.id === playerId);
        
        if (!player) return null;

        const positionPlayers = this.getPlayersByPosition(player.position);
        const positionRank = positionPlayers
            .sort((a, b) => b.rating - a.rating)
            .findIndex(p => p.id === playerId) + 1;

        const winRate = player.comparisons > 0 ? 
            ((player.rating - 1500) / (player.comparisons * 30) + 0.5) * 100 : 50;

        return {
            ...player,
            positionName: this.positions[player.position],
            positionRank,
            totalInPosition: positionPlayers.length,
            estimatedWinRate: Math.max(0, Math.min(100, Math.round(winRate)))
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
        
        return state.players.filter(player => 
            player.name.toLowerCase().includes(term) ||
            this.positions[player.position].toLowerCase().includes(term)
        );
    }
}

window.PlayerManager = PlayerManager;
