// src/services/PlayerService.js (Refactored)

import ratingConfig from '../config/rating.js';
import validationConfig from '../config/validation.js';

/**
 * PlayerService - Player management business logic
 *
 * Responsibilities (REFACTORED):
 * - Orchestrate player operations
 * - Enforce business rules
 * - Coordinate between repository and validation
 *
 * What changed:
 * - Removed direct StateManager access (now uses PlayerRepository)
 * - Removed validation logic (now uses ValidationService)
 * - Removed data manipulation (now uses PlayerRepository)
 * - Focused on business logic only
 *
 * Benefits:
 * - Single Responsibility Principle
 * - Easier to test
 * - Looser coupling
 * - Cleaner code
 */

class PlayerService {
    /**
     * @param {Object|null} activityConfig - Activity configuration (null if no activity selected)
     * @param {PlayerRepository} playerRepository - Player data repository
     * @param {ValidationService} validationService - Validation service
     * @param {EventBus} eventBus - Event bus
     * @param {EloService} eloService - ELO service
     */
    constructor(activityConfig, playerRepository, validationService, eventBus, eloService) {
        this.config = activityConfig;
        this.playerRepository = playerRepository;
        this.validationService = validationService;
        this.eventBus = eventBus;
        this.eloService = eloService;

        this.positions = activityConfig?.positions || {};
        this.DEFAULT_RATING = ratingConfig.RATING_CONSTANTS.DEFAULT;
    }

    /**
     * Validate player data
     * Delegates to ValidationService
     */
    validate(name, positions) {
        return this.validationService.validatePlayer(name, positions);
    }

    /**
     * Add a new player
     * @param {string} name - Player name
     * @param {Array<string>} positions - Player positions
     * @returns {Object} Created player
     * @throws {Error} If validation fails or player already exists
     */
    add(name, positions) {
        // Validate input
        const validation = this.validate(name, positions);

        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        const { name: cleanName, positions: cleanPositions } = validation.sanitized;

        // Check for duplicates
        if (this.playerRepository.existsByName(cleanName)) {
            throw new Error('Player with this name already exists');
        }

        // Create player object
        const player = this.createPlayerObject(cleanName, cleanPositions);

        // Add to repository
        return this.playerRepository.add(player);
    }

    /**
     * Create player object with default values
     * @private
     */
    createPlayerObject(name, positions) {
        const ratings = {};
        const comparisons = {};
        const comparedWith = {};

        positions.forEach(pos => {
            ratings[pos] = this.DEFAULT_RATING;
            comparisons[pos] = 0;
            comparedWith[pos] = [];
        });

        return {
            id: this.generateId(),
            name,
            positions,
            ratings,
            comparisons,
            comparedWith,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Generate unique player ID
     * @private
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Update player positions
     * @param {string} playerId - Player ID
     * @param {Array<string>} positions - New positions
     * @returns {Object} Updated player
     * @throws {Error} If validation fails or player not found
     */
    updatePositions(playerId, positions) {
        // Validate positions
        const validation = this.validationService.validatePositions(positions);

        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        const player = this.playerRepository.getById(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        const newPositions = validation.sanitized;

        // Build new ratings structure
        const newRatings = {};
        const newComparisons = {};
        const newComparedWith = {};

        newPositions.forEach(pos => {
            newRatings[pos] = player.ratings[pos] || this.DEFAULT_RATING;
            newComparisons[pos] = player.comparisons[pos] || validationConfig.DEFAULT_VALUES.COMPARISONS;
            newComparedWith[pos] = player.comparedWith[pos] || validationConfig.DEFAULT_VALUES.COMPARED_WITH;
        });

        // Update through repository
        return this.playerRepository.update(playerId, {
            positions: newPositions,
            ratings: newRatings,
            comparisons: newComparisons,
            comparedWith: newComparedWith
        });
    }

    /**
     * Remove a player
     * @param {string} playerId - Player ID
     * @returns {Object} Removed player
     * @throws {Error} If player not found
     */
    remove(playerId) {
        const player = this.playerRepository.remove(playerId);

        // Clean up: remove from other players' compared lists
        this.playerRepository.removeFromComparedLists(player.name);

        return player;
    }

    /**
     * Remove all players
     * @returns {Array<Object>} Array of removed players
     */
    clearAll() {
        const removedPlayers = this.playerRepository.clearAll();

        this.eventBus.emit('players:cleared', {
            count: removedPlayers.length
        });

        return removedPlayers;
    }

    /**
     * Reset player ratings for all or specific positions
     * @param {string} playerId - Player ID
     * @param {Array<string>|null} positions - Positions to reset (null = all)
     * @returns {Object} Updated player
     * @throws {Error} If player not found
     */
    reset(playerId, positions = null) {
        const player = this.playerRepository.getById(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        const positionsToReset = positions || player.positions;

        const updatedPlayer = this.playerRepository.resetPlayerPositions(
            playerId,
            positionsToReset,
            this.DEFAULT_RATING
        );

        this.eventBus.emit('player:reset', {
            player: updatedPlayer,
            positions: positionsToReset
        });

        return updatedPlayer;
    }

    /**
     * Reset specific positions for a player
     * @param {string} playerId - Player ID
     * @param {Array<string>} positions - Positions to reset
     * @returns {Object} Updated player
     * @throws {Error} If validation fails or player not found
     */
    resetPositions(playerId, positions) {
        if (!Array.isArray(positions) || positions.length === 0) {
            throw new Error('At least one position is required');
        }

        return this.reset(playerId, positions);
    }

    /**
     * Reset all players' ratings for specific positions
     * @param {Array<string>} positions - Positions to reset
     * @returns {Array<Object>} Updated players
     * @throws {Error} If validation fails
     */
    resetAllPositions(positions) {
        if (!Array.isArray(positions) || positions.length === 0) {
            throw new Error('At least one position is required');
        }

        const updatedPlayers = this.playerRepository.resetAllPositions(
            positions,
            this.DEFAULT_RATING
        );

        this.eventBus.emit('players:reset-all-positions', {
            positions,
            playersAffected: updatedPlayers.length
        });

        return updatedPlayers;
    }

    /**
     * Get players by position
     * @param {string} position - Position name
     * @returns {Array<Object>} Players for this position
     */
    getByPosition(position) {
        return this.playerRepository.getByPosition(position);
    }

    /**
     * Get player by ID
     * @param {string} playerId - Player ID
     * @returns {Object|null} Player or null
     */
    getById(playerId) {
        return this.playerRepository.getById(playerId);
    }

    /**
     * Get all players
     * @returns {Array<Object>} All players
     */
    getAll() {
        return this.playerRepository.getAll();
    }

    /**
     * Search players by name or position
     * @param {string} searchTerm - Search term
     * @returns {Array<Object>} Matching players
     */
    search(searchTerm) {
        return this.playerRepository.search(searchTerm, this.positions);
    }

    /**
     * Get position statistics
     * @returns {Object} Statistics by position
     */
    getPositionStats() {
        const stats = {};

        Object.keys(this.positions).forEach(pos => {
            const players = this.playerRepository.getByPosition(pos);

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
     * @returns {Object} Rankings by position
     */
    getRankings() {
        const rankings = {};

        Object.keys(this.positions).forEach(position => {
            const players = this.playerRepository.getByPosition(position)
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

export default PlayerService;
