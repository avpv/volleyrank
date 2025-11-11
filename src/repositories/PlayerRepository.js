// src/repositories/PlayerRepository.js

/**
 * PlayerRepository - Data Access Layer for Player entities
 *
 * Responsibilities:
 * - Encapsulate all data access operations for players
 * - Provide clean interface for CRUD operations
 * - Abstract away StateManager implementation details
 * - Ensure data consistency
 *
 * Benefits:
 * - Single source of truth for player data operations
 * - Easy to test (can mock repository)
 * - Easy to change storage implementation
 * - Reduces coupling between services and state management
 */

class PlayerRepository {
    /**
     * @param {StateManager} stateManager - State management service
     * @param {EventBus} eventBus - Event bus for notifications
     * @param {string} activityKey - Current activity key (e.g., 'volleyball', 'basketball')
     */
    constructor(stateManager, eventBus, activityKey = 'volleyball') {
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        this.activityKey = activityKey;
    }

    /**
     * Get active session for current activity
     * @private
     * @returns {Object|null} Active session or null
     */
    _getActiveSession() {
        const sessions = this.stateManager.get('sessions') || {};
        const activeSessions = this.stateManager.get('activeSessions') || {};
        const activeSessionId = activeSessions[this.activityKey];

        if (!activeSessionId || !sessions[this.activityKey]) {
            return null;
        }

        return sessions[this.activityKey][activeSessionId] || null;
    }

    /**
     * Get active session ID for current activity
     * @private
     * @returns {string|null} Active session ID or null
     */
    _getActiveSessionId() {
        const activeSessions = this.stateManager.get('activeSessions') || {};
        return activeSessions[this.activityKey] || null;
    }

    /**
     * Update active session data
     * @private
     * @param {Object} updates - Session updates
     */
    _updateActiveSession(updates) {
        const sessionId = this._getActiveSessionId();
        if (!sessionId) {
            throw new Error('No active session found');
        }

        const state = this.stateManager.getState();
        const sessions = state.sessions || {};
        const activitySessions = sessions[this.activityKey] || {};
        const currentSession = activitySessions[sessionId] || {};

        const updatedSession = {
            ...currentSession,
            ...updates
        };

        this.stateManager.setState({
            sessions: {
                ...sessions,
                [this.activityKey]: {
                    ...activitySessions,
                    [sessionId]: updatedSession
                }
            }
        }, {
            event: 'session:updated',
            save: true
        });
    }

    /**
     * Get all players for the current activity's active session
     * @returns {Array<Object>} All players for current active session
     */
    getAll() {
        const session = this._getActiveSession();
        return session?.players || [];
    }

    /**
     * Get player by ID
     * @param {string} playerId - Player ID
     * @returns {Object|null} Player or null if not found
     */
    getById(playerId) {
        const players = this.getAll();
        return players.find(p => p.id === playerId) || null;
    }

    /**
     * Get player by name
     * @param {string} name - Player name
     * @returns {Object|null} Player or null if not found
     */
    getByName(name) {
        const players = this.getAll();
        return players.find(p => p.name === name) || null;
    }

    /**
     * Get players by position
     * @param {string} position - Position name
     * @returns {Array<Object>} Players who can play this position
     */
    getByPosition(position) {
        const players = this.getAll();
        return players.filter(p => p.positions && p.positions.includes(position));
    }

    /**
     * Check if player exists by name
     * @param {string} name - Player name
     * @returns {boolean} True if player exists
     */
    existsByName(name) {
        return this.getByName(name) !== null;
    }

    /**
     * Add a new player to the current activity's active session
     * @param {Object} player - Player object to add
     * @returns {Object} Added player
     */
    add(player) {
        const currentPlayers = this.getAll();
        const updatedPlayers = [...currentPlayers, player];

        this._updateActiveSession({ players: updatedPlayers });

        this.eventBus.emit('player:added', player);
        return player;
    }

    /**
     * Update existing player in the current activity's active session
     * @param {string} playerId - Player ID
     * @param {Object} updates - Fields to update
     * @returns {Object} Updated player
     * @throws {Error} If player not found
     */
    update(playerId, updates) {
        const currentPlayers = this.getAll();
        const playerIndex = currentPlayers.findIndex(p => p.id === playerId);

        if (playerIndex === -1) {
            throw new Error('Player not found');
        }

        const updatedPlayer = {
            ...currentPlayers[playerIndex],
            ...updates
        };

        const updatedPlayers = [...currentPlayers];
        updatedPlayers[playerIndex] = updatedPlayer;

        this._updateActiveSession({ players: updatedPlayers });

        this.eventBus.emit('player:updated', updatedPlayer);
        return updatedPlayer;
    }

    /**
     * Update multiple players at once in the current activity's active session
     * @param {Array<{id: string, updates: Object}>} playerUpdates - Array of player updates
     * @returns {Array<Object>} Updated players
     */
    updateMany(playerUpdates) {
        const currentPlayers = this.getAll();
        const updatedPlayers = [...currentPlayers];

        const results = [];

        playerUpdates.forEach(({ id, updates }) => {
            const index = updatedPlayers.findIndex(p => p.id === id);
            if (index !== -1) {
                updatedPlayers[index] = {
                    ...updatedPlayers[index],
                    ...updates
                };
                results.push(updatedPlayers[index]);
            }
        });

        this._updateActiveSession({ players: updatedPlayers });

        this.eventBus.emit('players:updated', results);
        return results;
    }

    /**
     * Remove player from the current activity's active session
     * @param {string} playerId - Player ID
     * @returns {Object} Removed player
     * @throws {Error} If player not found
     */
    remove(playerId) {
        const currentPlayers = this.getAll();
        const player = currentPlayers.find(p => p.id === playerId);

        if (!player) {
            throw new Error('Player not found');
        }

        const updatedPlayers = currentPlayers.filter(p => p.id !== playerId);

        this._updateActiveSession({ players: updatedPlayers });

        this.eventBus.emit('player:removed', player);
        return player;
    }

    /**
     * Reset player's ratings for specific positions
     * @param {string} playerId - Player ID
     * @param {Array<string>} positions - Positions to reset
     * @param {number} defaultRating - Default rating value
     * @returns {Object} Updated player
     */
    resetPlayerPositions(playerId, positions, defaultRating = 1500) {
        const player = this.getById(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        const updatedRatings = { ...player.ratings };
        const updatedComparisons = { ...player.comparisons };
        const updatedComparedWith = { ...player.comparedWith };

        positions.forEach(pos => {
            if (updatedRatings[pos] !== undefined) {
                updatedRatings[pos] = defaultRating;
                updatedComparisons[pos] = 0;
                updatedComparedWith[pos] = [];
            }
        });

        return this.update(playerId, {
            ratings: updatedRatings,
            comparisons: updatedComparisons,
            comparedWith: updatedComparedWith
        });
    }

    /**
     * Reset all players' ratings for specific positions
     * @param {Array<string>} positions - Positions to reset
     * @param {number} defaultRating - Default rating value
     * @returns {Array<Object>} Updated players
     */
    resetAllPositions(positions, defaultRating = 1500) {
        const players = this.getAll();

        const updates = players.map(player => {
            const updatedRatings = { ...player.ratings };
            const updatedComparisons = { ...player.comparisons };
            const updatedComparedWith = { ...player.comparedWith };

            positions.forEach(pos => {
                if (updatedRatings[pos] !== undefined) {
                    updatedRatings[pos] = defaultRating;
                    updatedComparisons[pos] = 0;
                    updatedComparedWith[pos] = [];
                }
            });

            return {
                id: player.id,
                updates: {
                    ratings: updatedRatings,
                    comparisons: updatedComparisons,
                    comparedWith: updatedComparedWith
                }
            };
        });

        return this.updateMany(updates);
    }

    /**
     * Update player's rating for a position
     * @param {string} playerId - Player ID
     * @param {string} position - Position name
     * @param {number} newRating - New rating value
     * @returns {Object} Updated player
     */
    updateRating(playerId, position, newRating) {
        const player = this.getById(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        const updatedRatings = {
            ...player.ratings,
            [position]: newRating
        };

        return this.update(playerId, { ratings: updatedRatings });
    }

    /**
     * Increment comparison count for a position
     * @param {string} playerId - Player ID
     * @param {string} position - Position name
     * @returns {Object} Updated player
     */
    incrementComparison(playerId, position) {
        const player = this.getById(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        const updatedComparisons = {
            ...player.comparisons,
            [position]: (player.comparisons[position] || 0) + 1
        };

        return this.update(playerId, { comparisons: updatedComparisons });
    }

    /**
     * Increment session comparison counter
     * Should be called after each comparison
     */
    incrementSessionComparison() {
        const session = this._getActiveSession();
        if (!session) {
            throw new Error('No active session found');
        }

        const newCount = (session.comparisons || 0) + 1;
        this._updateActiveSession({ comparisons: newCount });
    }

    /**
     * Add opponent to player's compared list
     * @param {string} playerId - Player ID
     * @param {string} position - Position name
     * @param {string} opponentName - Opponent's name
     * @returns {Object} Updated player
     */
    addComparedOpponent(playerId, position, opponentName) {
        const player = this.getById(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        const currentCompared = player.comparedWith[position] || [];

        // Avoid duplicates
        if (currentCompared.includes(opponentName)) {
            return player;
        }

        const updatedComparedWith = {
            ...player.comparedWith,
            [position]: [...currentCompared, opponentName]
        };

        return this.update(playerId, { comparedWith: updatedComparedWith });
    }

    /**
     * Remove opponent from all players' compared lists
     * @param {string} playerName - Name of player to remove from compared lists
     */
    removeFromComparedLists(playerName) {
        const players = this.getAll();

        const updates = players
            .map(player => {
                const updatedComparedWith = { ...player.comparedWith };
                let hasChanges = false;

                Object.keys(updatedComparedWith).forEach(pos => {
                    const filtered = updatedComparedWith[pos].filter(name => name !== playerName);
                    if (filtered.length !== updatedComparedWith[pos].length) {
                        updatedComparedWith[pos] = filtered;
                        hasChanges = true;
                    }
                });

                return hasChanges ? { id: player.id, updates: { comparedWith: updatedComparedWith } } : null;
            })
            .filter(Boolean);

        if (updates.length > 0) {
            this.updateMany(updates);
        }
    }

    /**
     * Search players by name or position
     * @param {string} searchTerm - Search term
     * @param {Object} positionNames - Map of position codes to names
     * @returns {Array<Object>} Matching players
     */
    search(searchTerm, positionNames = {}) {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }

        const term = searchTerm.toLowerCase().trim();
        const players = this.getAll();

        return players.filter(player => {
            // Search by name
            if (player.name.toLowerCase().includes(term)) {
                return true;
            }

            // Search by position
            return player.positions?.some(pos =>
                positionNames[pos]?.toLowerCase().includes(term)
            );
        });
    }

    /**
     * Get count of players
     * @returns {number} Total number of players
     */
    count() {
        return this.getAll().length;
    }

    /**
     * Get count of players by position
     * @param {string} position - Position name
     * @returns {number} Number of players for this position
     */
    countByPosition(position) {
        return this.getByPosition(position).length;
    }
}

export default PlayerRepository;
