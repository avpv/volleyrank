/**
 * Centralized application state management
 */
class StateManager {
    constructor() {
        this.state = {
            players: [],
            comparisons: 0,
            currentPair: null,
            selectedPosition: ''
        };
        this.subscribers = new Map();
        this.storageKey = 'volleyRankData';
    }

    /**
     * Subscribe to state changes
     * @param {string} event - event name
     * @param {function} callback - callback function
     */
    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event).push(callback);
    }

    /**
     * Unsubscribe from events
     * @param {string} event - event name
     * @param {function} callback - function to remove
     */
    unsubscribe(event, callback) {
        if (this.subscribers.has(event)) {
            const callbacks = this.subscribers.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Notify subscribers about state change
     * @param {string} event - event name
     * @param {*} data - event data
     */
    notify(event, data = null) {
        if (this.subscribers.has(event)) {
            this.subscribers.get(event).forEach(callback => {
                try {
                    callback(data, this.state);
                } catch (error) {
                    console.error(`Error in subscriber for event ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get current state
     * @returns {object} current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Safe state update
     * @param {object} updates - object with updates
     */
    updateState(updates) {
        const oldState = { ...this.state };
        
        // Validate updates
        if (updates.players && !Array.isArray(updates.players)) {
            throw new Error('Players must be an array');
        }
        
        if (updates.comparisons && typeof updates.comparisons !== 'number') {
            throw new Error('Comparisons must be a number');
        }

        // Apply updates
        Object.assign(this.state, updates);

        // Auto-save
        this.saveToStorage();

        // Notify subscribers
        this.notify('stateChanged', { oldState, newState: this.state });
    }

    /**
     * Add player
     * @param {string} name - player name
     * @param {string} position - position
     */
    addPlayer(name, position) {
        if (!name?.trim()) {
            throw new Error('Player name is required');
        }

        if (this.state.players.some(p => p.name === name)) {
            throw new Error('Player with this name already exists');
        }

        const newPlayer = {
            id: Date.now(), // simple ID for uniqueness
            name: name.trim(),
            position,
            rating: 1500,
            comparisons: 0,
            comparedWith: [],
            createdAt: new Date().toISOString()
        };

        const updatedPlayers = [...this.state.players, newPlayer];
        this.updateState({ players: updatedPlayers });
        
        this.notify('playerAdded', newPlayer);
        return newPlayer;
    }

    /**
     * Remove player
     * @param {number} playerId - player ID
     */
    removePlayer(playerId) {
        const playerIndex = this.state.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            throw new Error('Player not found');
        }

        const removedPlayer = this.state.players[playerIndex];
        const updatedPlayers = this.state.players.filter(p => p.id !== playerId);
        
        // Remove from other players' comparison lists
        updatedPlayers.forEach(player => {
            player.comparedWith = player.comparedWith.filter(name => name !== removedPlayer.name);
        });

        this.updateState({ players: updatedPlayers });
        this.notify('playerRemoved', removedPlayer);
    }

    /**
     * Reset player rating
     * @param {number} playerId - player ID
     */
    resetPlayer(playerId) {
        const updatedPlayers = this.state.players.map(player => {
            if (player.id === playerId) {
                const resetPlayer = {
                    ...player,
                    rating: 1500,
                    comparisons: 0,
                    comparedWith: []
                };
                
                // Remove from other players' comparison lists
                this.state.players.forEach(p => {
                    if (p.id !== playerId) {
                        p.comparedWith = p.comparedWith.filter(name => name !== player.name);
                    }
                });

                this.notify('playerReset', resetPlayer);
                return resetPlayer;
            }
            return player;
        });

        this.updateState({ players: updatedPlayers });
    }

    /**
     * Update ratings after comparison
     * @param {number} winnerId - winner ID
     * @param {number} loserId - loser ID
     */
    updateRatingsAfterComparison(winnerId, loserId) {
        const updatedPlayers = this.state.players.map(player => {
            if (player.id === winnerId || player.id === loserId) {
                return { ...player }; // clone for modification
            }
            return player;
        });

        const winner = updatedPlayers.find(p => p.id === winnerId);
        const loser = updatedPlayers.find(p => p.id === loserId);

        if (!winner || !loser) {
            throw new Error('Winner or loser not found');
        }

        // ELO calculation
        const expectedWin = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
        const kFactor = 30;

        winner.rating += kFactor * (1 - expectedWin);
        loser.rating += kFactor * (0 - (1 - expectedWin));
        
        // Update statistics
        winner.comparisons++;
        loser.comparisons++;

        // Update comparison lists
        if (!winner.comparedWith.includes(loser.name)) {
            winner.comparedWith.push(loser.name);
        }
        if (!loser.comparedWith.includes(winner.name)) {
            loser.comparedWith.push(winner.name);
        }

        const newComparisons = this.state.comparisons + 1;

        this.updateState({ 
            players: updatedPlayers,
            comparisons: newComparisons,
            currentPair: null
        });

        this.notify('comparisonCompleted', { winner, loser, newComparisons });
    }

    /**
     * Set current pair for comparison
     * @param {object} pair - pair of players [player1, player2]
     */
    setCurrentPair(pair) {
        this.updateState({ currentPair: pair });
        this.notify('pairSelected', pair);
    }

    /**
     * Save to localStorage
     */
    saveToStorage() {
        try {
            const dataToSave = {
                players: this.state.players,
                comparisons: this.state.comparisons,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            this.notify('saveError', error);
        }
    }

    /**
     * Load from localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                
                // Validate loaded data
                const players = Array.isArray(data.players) ? data.players : [];
                const comparisons = typeof data.comparisons === 'number' ? data.comparisons : 0;

                // Ensure backward compatibility - add ID if missing
                const playersWithIds = players.map(player => ({
                    ...player,
                    id: player.id || Date.now() + Math.random(),
                    comparisons: player.comparisons || 0,
                    comparedWith: player.comparedWith || []
                }));

                this.updateState({ 
                    players: playersWithIds, 
                    comparisons,
                    currentPair: null,
                    selectedPosition: ''
                });

                this.notify('dataLoaded', { playersCount: playersWithIds.length, comparisons });
            } else {
                // Demo data for first run
                this.initializeDemoData();
            }
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            this.notify('loadError', error);
            this.initializeDemoData();
        }
    }

    /**
     * Initialize demo data
     */
    initializeDemoData() {
        const demoPlayers = [
            {
                id: 1,
                name: "Andrei Popov",
                position: "OH",
                rating: 1500,
                comparisons: 0,
                comparedWith: [],
                createdAt: new Date().toISOString()
            }
        ];

        this.updateState({ 
            players: demoPlayers, 
            comparisons: 0,
            currentPair: null,
            selectedPosition: ''
        });
    }

    /**
     * Clear all data
     */
    clearAllData() {
        this.updateState({
            players: [],
            comparisons: 0,
            currentPair: null,
            selectedPosition: ''
        });
        
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
        }

        this.notify('dataCleared');
    }

    /**
     * Export data
     * @returns {string} JSON string with data
     */
    exportData() {
        return JSON.stringify({
            players: this.state.players,
            comparisons: this.state.comparisons,
            exportedAt: new Date().toISOString(),
            version: '2.0'
        }, null, 2);
    }

    /**
     * Import data
     * @param {string} jsonData - JSON string with data
     */
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!Array.isArray(data.players)) {
                throw new Error('Invalid data format: players must be an array');
            }

            // Validate and normalize imported data
            const validatedPlayers = data.players.map((player, index) => ({
                id: player.id || Date.now() + index,
                name: player.name || `Player ${index + 1}`,
                position: player.position || 'OH',
                rating: typeof player.rating === 'number' ? player.rating : 1500,
                comparisons: typeof player.comparisons === 'number' ? player.comparisons : 0,
                comparedWith: Array.isArray(player.comparedWith) ? player.comparedWith : [],
                createdAt: player.createdAt || new Date().toISOString()
            }));

            this.updateState({
                players: validatedPlayers,
                comparisons: typeof data.comparisons === 'number' ? data.comparisons : 0,
                currentPair: null,
                selectedPosition: ''
            });

            this.notify('dataImported', { playersCount: validatedPlayers.length });
            
        } catch (error) {
            console.error('Failed to import data:', error);
            this.notify('importError', error);
            throw error;
        }
    }
}

// Export single instance (Singleton)
window.stateManager = new StateManager();
