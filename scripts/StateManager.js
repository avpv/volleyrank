
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
    addPlayer(name, positions) {
        if (!name?.trim()) {
            throw new Error('Player name is required');
        }

        // Check that positions is an array
        if (!Array.isArray(positions) || positions.length === 0) {
            throw new Error('At least one position is required');
        }

        // Validate positions
        const validPositions = ['S', 'OPP', 'OH', 'MB', 'L'];
        const invalidPositions = positions.filter(pos => !validPositions.includes(pos));
        if (invalidPositions.length > 0) {
            throw new Error(`Invalid positions: ${invalidPositions.join(', ')}`);
        }

        if (this.state.players.some(p => p.name === name)) {
            throw new Error('Player with this name already exists');
        }

        const newPlayer = {
            id: Date.now() + Math.random(),
            name: name.trim(),
            positions: positions, // Now this is an array of positions
            primaryPosition: positions[0], // Primary position (first in the list)
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

    // Method to update player positions
    updatePlayerPositions(playerId, positions) {
        if (!Array.isArray(positions) || positions.length === 0) {
            throw new Error('At least one position is required');
        }

        const validPositions = ['S', 'OPP', 'OH', 'MB', 'L'];
        const invalidPositions = positions.filter(pos => !validPositions.includes(pos));
        if (invalidPositions.length > 0) {
            throw new Error(`Invalid positions: ${invalidPositions.join(', ')}`);
        }

        const updatedPlayers = this.state.players.map(player => {
            if (player.id === playerId) {
                return {
                    ...player,
                    positions: positions,
                    primaryPosition: positions[0] // Update primary position
                };
            }
            return player;
        });

        this.updateState({ players: updatedPlayers });
        this.notify('playerPositionsUpdated', { playerId, positions });
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
                return { ...player };
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
                
                const players = Array.isArray(data.players) ? data.players : [];
                const comparisons = typeof data.comparisons === 'number' ? data.comparisons : 0;

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
     * Import full application data
     * @param {string} jsonData - JSON string with complete app data
     */
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!Array.isArray(data.players)) {
                throw new Error('Invalid data format: players must be an array');
            }

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

    /**
     * Import players from CSV or JSON
     * @param {string} data - CSV or JSON string
     * @param {string} format - 'csv' or 'json'
     * @returns {object} import result
     */
    importPlayers(data, format = 'auto') {
        try {
            let playersData = [];
            
            if (format === 'auto') {
                format = data.trim().startsWith('[') || data.trim().startsWith('{') ? 'json' : 'csv';
            }
            
            if (format === 'json') {
                const jsonData = JSON.parse(data);
                playersData = Array.isArray(jsonData) ? jsonData : [jsonData];
            } else if (format === 'csv') {
                playersData = this.parseCSV(data);
            } else {
                throw new Error('Unsupported format');
            }

            const validatedPlayers = [];
            const errors = [];
            const skipped = [];
            
            playersData.forEach((playerData, index) => {
                try {
                    const normalized = this.normalizePlayerData(playerData, index + 1);
                    
                    const existingPlayer = this.state.players.find(p => p.name === normalized.name);
                    if (existingPlayer) {
                        skipped.push({
                            row: index + 1,
                            name: normalized.name,
                            reason: 'Player already exists'
                        });
                        return;
                    }
                    
                    validatedPlayers.push(normalized);
                } catch (error) {
                    errors.push({
                        row: index + 1,
                        data: playerData,
                        error: error.message
                    });
                }
            });

            const updatedPlayers = [...this.state.players, ...validatedPlayers];
            this.updateState({ players: updatedPlayers });

            const result = {
                success: true,
                imported: validatedPlayers.length,
                skipped: skipped.length,
                errors: errors.length,
                details: { validatedPlayers, skipped, errors }
            };

            this.notify('playersImported', result);
            return result;

        } catch (error) {
            const result = {
                success: false,
                imported: 0,
                skipped: 0,
                errors: 1,
                error: error.message
            };
            
            this.notify('importError', result);
            return result;
        }
    }

    /**
     * Parse CSV data
     */
    parseCSV(csvData) {
        const lines = csvData.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV must contain header and data');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            const rowData = {};
            
            headers.forEach((header, index) => {
                rowData[header] = values[index] ? values[index].trim().replace(/"/g, '') : '';
            });
            
            data.push(rowData);
        }

        return data;
    }

    /**
     * Parse CSV line with quotes
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current);
        return values;
    }

    /**
     * Normalize player data
     */
    // Update import methods to support multiple positions
    normalizePlayerData(playerData, rowNumber) {
        const fieldMapping = {
            'name': ['name', 'player_name', 'playername', 'player', 'Name'],
            'positions': ['positions', 'position', 'pos', 'Position', 'Pos'],
            'primary_position': ['primary_position', 'primary', 'main_position']
        };

        const normalized = {
            id: Date.now() + Math.random(),
            name: '',
            positions: ['OH'], // Default array with one position
            primaryPosition: 'OH',
            rating: 1500,
            comparisons: 0,
            comparedWith: [],
            createdAt: new Date().toISOString()
        };

        const nameField = this.findField(playerData, fieldMapping.name);
        if (!nameField || !nameField.trim()) {
            throw new Error(`Row ${rowNumber}: Player name required`);
        }
        
        normalized.name = nameField.trim();
        if (normalized.name.length > 50) {
            throw new Error(`Row ${rowNumber}: Name too long`);
        }

        // Handle positions - can be string "OH,MB" or separate fields
        const positionsField = this.findField(playerData, fieldMapping.positions);
        if (positionsField) {
            const positionsStr = positionsField.toString().toUpperCase().trim();
            
            // If positions are separated by commas, semicolons, or spaces
            const positionsArray = positionsStr.split(/[,;\s]+/).filter(pos => pos.length > 0);
            
            const validPositions = {
                'S': 'S', 'SETTER': 'S', 'SET': 'S',
                'OPP': 'OPP', 'OPPOSITE': 'OPP', 'OP': 'OPP',
                'OH': 'OH', 'OUTSIDE': 'OH', 'OUTSIDE HITTER': 'OH',
                'MB': 'MB', 'MIDDLE': 'MB', 'MIDDLE BLOCKER': 'MB',
                'L': 'L', 'LIBERO': 'L', 'LIB': 'L'
            };
            
            const normalizedPositions = positionsArray
                .map(pos => validPositions[pos])
                .filter(pos => pos !== undefined);
            
            if (normalizedPositions.length > 0) {
                // Remove duplicates
                normalized.positions = [...new Set(normalizedPositions)];
                normalized.primaryPosition = normalized.positions[0];
            }
        }

        // Check primary position separately
        const primaryField = this.findField(playerData, fieldMapping.primary_position);
        if (primaryField) {
            const primaryPos = primaryField.toString().toUpperCase().trim();
            const validPositions = {
                'S': 'S', 'SETTER': 'S', 'SET': 'S',
                'OPP': 'OPP', 'OPPOSITE': 'OPP', 'OP': 'OPP',
                'OH': 'OH', 'OUTSIDE': 'OH', 'OUTSIDE HITTER': 'OH',
                'MB': 'MB', 'MIDDLE': 'MB', 'MIDDLE BLOCKER': 'MB',
                'L': 'L', 'LIBERO': 'L', 'LIB': 'L'
            };
            
            const normalizedPrimary = validPositions[primaryPos];
            if (normalizedPrimary && normalized.positions.includes(normalizedPrimary)) {
                normalized.primaryPosition = normalizedPrimary;
            }
        }

        return normalized;
    }

    /**
     * Find field by multiple names
     */
    findField(data, fieldNames) {
        for (const fieldName of fieldNames) {
            if (data.hasOwnProperty(fieldName) && data[fieldName] != null) {
                return data[fieldName];
            }
        }
        return undefined;
    }

    /**
     * Export players as CSV
     */
    exportPlayersAsCSV() {
        const headers = ['name', 'positions', 'primary_position'];
        const csvLines = [headers.join(',')];
        
        this.state.players.forEach(player => {
            const row = [
                `"${player.name}"`, 
                `"${player.positions.join(',')}"`,
                player.primaryPosition
            ];
            csvLines.push(row.join(','));
        });
        
        return csvLines.join('\n');
    }

    /**
     * Generate sample CSV
     */
    // Update sample CSV
    generateSampleCSV() {
        const sampleData = [
            ['name', 'positions', 'primary_position'],
            ['Andrei Popov', 'OH,OPP', 'OH'],
            ['Maria Garcia', 'S', 'S'],
            ['Alex Johnson', 'MB,OH', 'MB'],
            ['Sarah Wilson', 'L', 'L'],
            ['Mike Brown', 'OPP,OH', 'OPP']
        ];
        
        return sampleData.map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }
}

window.stateManager = new StateManager();
