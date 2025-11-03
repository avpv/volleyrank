// src/services/PlayerService.js

/**
 * PlayerService - Player management business logic
 * Handles validation, queries, and player operations
 */
import stateManager from '../core/StateManager.js';
import eventBus from '../core/EventBus.js';

class PlayerService {
    constructor() {
        this.positions = {
            'S': 'Setter',
            'OPP': 'Opposite',
            'OH': 'Outside Hitter',
            'MB': 'Middle Blocker',
            'L': 'Libero'
        };
        
        this.DEFAULT_RATING = 1500;
    }

    /**
     * Validate player data
     */
    validate(name, positions) {
        const errors = [];

        // Name validation
        if (!name || typeof name !== 'string') {
            errors.push('Player name is required');
        } else {
            const trimmed = name.trim();
            if (trimmed.length === 0) {
                errors.push('Player name cannot be empty');
            } else if (trimmed.length > 50) {
                errors.push('Player name is too long (max 50 characters)');
            } else if (!/^[a-zA-Z\s\u0400-\u04FF'-]+$/.test(trimmed)) {
                errors.push('Player name contains invalid characters');
            }
        }

        // Position validation
        if (!Array.isArray(positions) || positions.length === 0) {
            errors.push('At least one position is required');
        } else {
            const validPositions = Object.keys(this.positions);
            const invalid = positions.filter(pos => !validPositions.includes(pos));
            
            if (invalid.length > 0) {
                errors.push(`Invalid positions: ${invalid.join(', ')}`);
            }
            
            if (new Set(positions).size !== positions.length) {
                errors.push('Duplicate positions not allowed');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitized: {
                name: name?.trim() || '',
                positions: Array.isArray(positions) ? [...new Set(positions)] : []
            }
        };
    }

    /**
     * Add a new player
     */
    add(name, positions) {
        const validation = this.validate(name, positions);
        
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        const { name: cleanName, positions: cleanPositions } = validation.sanitized;
        
        // Check for duplicate
        const state = stateManager.getState();
        if (state.players.some(p => p.name === cleanName)) {
            throw new Error('Player with this name already exists');
        }

        // Create player object
        const ratings = {};
        const comparisons = {};
        const comparedWith = {};
        
        cleanPositions.forEach(pos => {
            ratings[pos] = this.DEFAULT_RATING;
            comparisons[pos] = 0;
            comparedWith[pos] = [];
        });

        const player = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: cleanName,
            positions: cleanPositions,
            ratings,
            comparisons,
            comparedWith,
            createdAt: new Date().toISOString()
        };

        // Update state
        stateManager.setState({
            players: [...state.players, player]
        }, {
            event: 'player:added',
            save: true
        });

        eventBus.emit('player:added', player);
        return player;
    }

    /**
     * Update player positions (NEW METHOD)
     */
    updatePositions(playerId, positions) {
        const validation = this.validate('temp', positions);
        
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        const state = stateManager.getState();
        const playerIndex = state.players.findIndex(p => p.id === playerId);
        
        if (playerIndex === -1) {
            throw new Error('Player not found');
        }

        const player = state.players[playerIndex];
        const newPositions = validation.sanitized.positions;
        
        // Update ratings structure
        const newRatings = {};
        const newComparisons = {};
        const newComparedWith = {};
        
        newPositions.forEach(pos => {
            newRatings[pos] = player.ratings[pos] || this.DEFAULT_RATING;
            newComparisons[pos] = player.comparisons[pos] || 0;
            newComparedWith[pos] = player.comparedWith[pos] || [];
        });

        const updatedPlayer = {
            ...player,
            positions: newPositions,
            ratings: newRatings,
            comparisons: newComparisons,
            comparedWith: newComparedWith
        };

        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex] = updatedPlayer;

        stateManager.setState({ players: updatedPlayers });
        eventBus.emit('player:updated', updatedPlayer);
        
        return updatedPlayer;
    }

    /**
     * Remove a player
     */
    remove(playerId) {
        const state = stateManager.getState();
        const player = state.players.find(p => p.id === playerId);
        
        if (!player) {
            throw new Error('Player not found');
        }

        const updatedPlayers = state.players.filter(p => p.id !== playerId);
        
        // Remove from other players' comparison lists
        updatedPlayers.forEach(p => {
            Object.keys(p.comparedWith).forEach(pos => {
                p.comparedWith[pos] = p.comparedWith[pos].filter(
                    name => name !== player.name
                );
            });
        });

        stateManager.setState({ players: updatedPlayers });
        eventBus.emit('player:removed', player);
        
        return player;
    }

    /**
     * Reset player ratings (all positions)
     */
    reset(playerId, positions = null) {
        const state = stateManager.getState();
        const playerIndex = state.players.findIndex(p => p.id === playerId);
        
        if (playerIndex === -1) {
            throw new Error('Player not found');
        }

        const player = state.players[playerIndex];
        const positionsToReset = positions || player.positions;
        
        const updatedPlayer = { ...player };
        
        positionsToReset.forEach(pos => {
            if (updatedPlayer.ratings[pos]) {
                updatedPlayer.ratings[pos] = this.DEFAULT_RATING;
                updatedPlayer.comparisons[pos] = 0;
                updatedPlayer.comparedWith[pos] = [];
            }
        });

        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex] = updatedPlayer;
        
        // Note: We don't remove this player from other players' comparedWith lists
        // because that would create inconsistency in their comparison counts.
        // The reset only affects this player's data.

        stateManager.setState({ players: updatedPlayers });
        eventBus.emit('player:reset', { player: updatedPlayer, positions: positionsToReset });
        
        return updatedPlayer;
    }

    /**
     * Reset specific positions for a player (NEW METHOD)
     */
    resetPositions(playerId, positions) {
        if (!Array.isArray(positions) || positions.length === 0) {
            throw new Error('At least one position is required');
        }

        return this.reset(playerId, positions);
    }

    /**
     * Reset all players' ratings for specific positions (NEW METHOD)
     */
    resetAllPositions(positions) {
        if (!Array.isArray(positions) || positions.length === 0) {
            throw new Error('At least one position is required');
        }

        const state = stateManager.getState();
        const updatedPlayers = state.players.map(player => {
            const updated = { ...player };
            
            positions.forEach(pos => {
                if (updated.ratings[pos]) {
                    updated.ratings[pos] = this.DEFAULT_RATING;
                    updated.comparisons[pos] = 0;
                    updated.comparedWith[pos] = [];
                }
            });
            
            return updated;
        });

        // Recalculate total comparisons
        let totalComparisons = 0;
        const allPositions = ['S', 'OPP', 'OH', 'MB', 'L'];
        const nonResetPositions = allPositions.filter(p => !positions.includes(p));
        
        updatedPlayers.forEach(player => {
            nonResetPositions.forEach(pos => {
                if (player.comparisons[pos]) {
                    totalComparisons += player.comparisons[pos];
                }
            });
        });
        totalComparisons = Math.floor(totalComparisons / 2);

        stateManager.setState({
            players: updatedPlayers,
            comparisons: totalComparisons
        });

        eventBus.emit('players:reset-all-positions', {
            positions,
            playersAffected: updatedPlayers.length
        });

        return updatedPlayers;
    }

    /**
     * Get players by position
     */
    getByPosition(position) {
        const state = stateManager.getState();
        return state.players.filter(p => 
            p.positions && p.positions.includes(position)
        );
    }

    /**
     * Get player by ID
     */
    getById(playerId) {
        const state = stateManager.getState();
        return state.players.find(p => p.id === playerId);
    }

    /**
     * Get all players
     */
    getAll() {
        return stateManager.get('players') || [];
    }

    /**
     * Search players
     */
    search(searchTerm) {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }

        const term = searchTerm.toLowerCase().trim();
        const state = stateManager.getState();
        
        return state.players.filter(player => {
            if (player.name.toLowerCase().includes(term)) {
                return true;
            }
            
            return player.positions?.some(pos => 
                this.positions[pos]?.toLowerCase().includes(term)
            );
        });
    }

    /**
     * Get position statistics
     */
    getPositionStats() {
        const state = stateManager.getState();
        const stats = {};
        
        Object.keys(this.positions).forEach(pos => {
            const players = state.players.filter(p => 
                p.positions && p.positions.includes(pos)
            );
            
            stats[pos] = {
                count: players.length,
                players: players,
                name: this.positions[pos]
            };
        });

        return stats;
    }

    /**
     * Get rankings by position
     */
    getRankings() {
        const state = stateManager.getState();
        const rankings = {};

        Object.keys(this.positions).forEach(position => {
            const players = state.players
                .filter(p => p.positions && p.positions.includes(position))
                .map(p => ({
                    ...p,
                    positionRating: p.ratings[position],
                    positionComparisons: p.comparisons[position]
                }))
                .sort((a, b) => b.positionRating - a.positionRating);
            
            rankings[position] = players;
        });

        return rankings;
    }
}

export default new PlayerService();
