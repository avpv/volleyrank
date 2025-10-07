/**
 * Centralized application state management - Multiple Ratings Version
 */
class StateManager {
    constructor() {
        this.state = {
            players: [],
            comparisons: 0,
            currentPair: null,
            selectedPosition: '',
            currentComparisonPosition: null // Track which position is being compared
        };
        this.subscribers = new Map();
        this.storageKey = 'volleyRankData';
        this.version = '3.0'; // New version for multiple ratings
    }

    /**
     * Subscribe to state changes
     */
    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event).push(callback);
    }

    /**
     * Unsubscribe from events
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
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Safe state update
     */
    updateState(updates) {
        const oldState = { ...this.state };
        
        if (updates.players && !Array.isArray(updates.players)) {
            throw new Error('Players must be an array');
        }
        
        if (updates.comparisons && typeof updates.comparisons !== 'number') {
            throw new Error('Comparisons must be a number');
        }

        Object.assign(this.state, updates);
        this.saveToStorage();
        this.notify('stateChanged', { oldState, newState: this.state });
    }

    /**
     * Add player with multiple ratings structure
     */
    addPlayer(name, positions) {
        if (!name?.trim()) {
            throw new Error('Player name is required');
        }

        if (!Array.isArray(positions) || positions.length === 0) {
            throw new Error('At least one position is required');
        }

        const validPositions = ['S', 'OPP', 'OH', 'MB', 'L'];
        const invalidPositions = positions.filter(pos => !validPositions.includes(pos));
        if (invalidPositions.length > 0) {
            throw new Error(`Invalid positions: ${invalidPositions.join(', ')}`);
        }

        if (this.state.players.some(p => p.name === name)) {
            throw new Error('Player with this name already exists');
        }

        // Create ratings object with 1500 for each position
        const ratings = {};
        const comparisons = {};
        const comparedWith = {};
        
        positions.forEach(pos => {
            ratings[pos] = 1500;
            comparisons[pos] = 0;
            comparedWith[pos] = [];
        });

        const newPlayer = {
            id: Date.now() + Math.random(),
            name: name.trim(),
            positions: positions,
            ratings: ratings,
            comparisons: comparisons,
            comparedWith: comparedWith,
            createdAt: new Date().toISOString()
        };

        const updatedPlayers = [...this.state.players, newPlayer];
        this.updateState({ players: updatedPlayers });
        
        this.notify('playerAdded', newPlayer);
        return newPlayer;
    }

    /**
     * Update player positions
     */
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
                const newRatings = {};
                const newComparisons = {};
                const newComparedWith = {};
                
                // Keep existing ratings for positions that remain
                positions.forEach(pos => {
                    newRatings[pos] = player.ratings[pos] || 1500;
                    newComparisons[pos] = player.comparisons[pos] || 0;
                    newComparedWith[pos] = player.comparedWith[pos] || [];
                });

                return {
                    ...player,
                    positions: positions,
                    ratings: newRatings,
                    comparisons: newComparisons,
                    comparedWith: newComparedWith
                };
            }
            return player;
        });

        this.updateState({ 
            players: updatedPlayers,
            currentPair: null // Clear cached pair when positions change
        });
        this.notify('playerPositionsUpdated', { playerId, positions });
    }

    /**
     * Remove player
     */
    removePlayer(playerId) {
        const playerIndex = this.state.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            throw new Error('Player not found');
        }

        const removedPlayer = this.state.players[playerIndex];
        const updatedPlayers = this.state.players.filter(p => p.id !== playerId);
        
        // Remove from other players' comparison lists (all positions)
        updatedPlayers.forEach(player => {
            Object.keys(player.comparedWith).forEach(pos => {
                player.comparedWith[pos] = player.comparedWith[pos].filter(
                    name => name !== removedPlayer.name
                );
            });
        });

        this.updateState({ 
            players: updatedPlayers,
            currentPair: null // Clear cached pair when player removed
        });
        this.notify('playerRemoved', removedPlayer);
    }

    /**
     * Reset player ratings for all positions
     */
    resetPlayer(playerId) {
        const updatedPlayers = this.state.players.map(player => {
            if (player.id === playerId) {
                const resetRatings = {};
                const resetComparisons = {};
                const resetComparedWith = {};
                
                player.positions.forEach(pos => {
                    resetRatings[pos] = 1500;
                    resetComparisons[pos] = 0;
                    resetComparedWith[pos] = [];
                });
                
                const resetPlayer = {
                    ...player,
                    ratings: resetRatings,
                    comparisons: resetComparisons,
                    comparedWith: resetComparedWith
                };
                
                // Remove from other players' comparison lists
                this.state.players.forEach(p => {
                    if (p.id !== playerId) {
                        Object.keys(p.comparedWith).forEach(pos => {
                            p.comparedWith[pos] = p.comparedWith[pos].filter(
                                name => name !== player.name
                            );
                        });
                    }
                });

                this.notify('playerReset', resetPlayer);
                return resetPlayer;
            }
            return player;
        });

        this.updateState({ 
            players: updatedPlayers,
            currentPair: null // Clear cached pair when player reset
        });
    }
    
    /**
     * resetPlayerPositions
     */
    resetPlayerPositions(playerId, positions) {
        if (!Array.isArray(positions) || positions.length === 0) {
            throw new Error('At least one position is required');
        }
    
        const targetPlayer = this.state.players.find(p => p.id === playerId);
        if (!targetPlayer) {
            throw new Error('Player not found');
        }
    
        const updatedPlayers = this.state.players.map(player => {
            if (player.id === playerId) {
                const resetPlayer = { ...player };
                
                positions.forEach(pos => {
                    if (resetPlayer.ratings[pos]) {
                        resetPlayer.ratings[pos] = 1500;
                        resetPlayer.comparisons[pos] = 0;
                        resetPlayer.comparedWith[pos] = [];
                    }
                });
                
                return resetPlayer;
            }
            return player;
        });
    
        // Remove from other players' comparison lists
        updatedPlayers.forEach(player => {
            if (player.id !== playerId) {
                positions.forEach(pos => {
                    if (player.comparedWith[pos]) {
                        player.comparedWith[pos] = player.comparedWith[pos].filter(
                            name => name !== targetPlayer.name
                        );
                    }
                });
            }
        });
    
        this.updateState({ 
            players: updatedPlayers,
            currentPair: null
        });
        
        this.notify('playerPositionsReset', { 
            player: updatedPlayers.find(p => p.id === playerId), 
            positions 
        });
    }

    /**
     * resetAllPlayersPositions
     */
    resetAllPlayersPositions(positions) {
        if (!Array.isArray(positions) || positions.length === 0) {
            throw new Error('At least one position is required');
        }
    
        const updatedPlayers = this.state.players.map(player => {
            const resetPlayer = { ...player };
            
            positions.forEach(pos => {
                if (resetPlayer.ratings[pos]) {
                    resetPlayer.ratings[pos] = 1500;
                    resetPlayer.comparisons[pos] = 0;
                    resetPlayer.comparedWith[pos] = [];
                }
            });
            
            return resetPlayer;
        });
    
        // Recalculate total comparisons
        let totalComparisons = 0;
        const allPositions = ['S', 'OPP', 'OH', 'MB', 'L'];
        const nonResetPositions = allPositions.filter(pos => !positions.includes(pos));
        
        updatedPlayers.forEach(player => {
            nonResetPositions.forEach(pos => {
                if (player.comparisons[pos]) {
                    totalComparisons += player.comparisons[pos];
                }
            });
        });
        totalComparisons = Math.floor(totalComparisons / 2);
    
        this.updateState({ 
            players: updatedPlayers,
            comparisons: totalComparisons,
            currentPair: null
        });
    
        this.notify('allPlayersPositionsReset', { 
            positions, 
            playersAffected: updatedPlayers.length 
        });
    }

    /**
     * Update ratings after comparison for specific position
     */
    updateRatingsAfterComparison(winnerId, loserId, position) {
        if (!position) {
            throw new Error('Position is required for comparison');
        }

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

        if (!winner.ratings[position] || !loser.ratings[position]) {
            throw new Error(`Player does not have rating for position ${position}`);
        }

        // ELO calculation for this specific position
        const winnerRating = winner.ratings[position];
        const loserRating = loser.ratings[position];
        
        const expectedWin = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
        const kFactor = 30;

        winner.ratings[position] += kFactor * (1 - expectedWin);
        loser.ratings[position] += kFactor * (0 - (1 - expectedWin));
        
        // Update statistics for this position
        winner.comparisons[position]++;
        loser.comparisons[position]++;

        // Update comparison lists for this position
        if (!winner.comparedWith[position].includes(loser.name)) {
            winner.comparedWith[position].push(loser.name);
        }
        if (!loser.comparedWith[position].includes(winner.name)) {
            loser.comparedWith[position].push(winner.name);
        }

        const newComparisons = this.state.comparisons + 1;

        this.updateState({ 
            players: updatedPlayers,
            comparisons: newComparisons,
            currentPair: null // Clear current pair after comparison
        });

        this.notify('comparisonCompleted', { winner, loser, position, newComparisons });
    }

    /**
     * Set current pair for comparison
     * Only update if pair actually changed to prevent unnecessary re-renders
     */
    setCurrentPair(pair, position) {
        const currentPair = this.state.currentPair;
        
        // Check if pair actually changed
        const pairChanged = !currentPair || 
            !pair || 
            currentPair[0]?.id !== pair[0]?.id || 
            currentPair[1]?.id !== pair[1]?.id ||
            this.state.currentComparisonPosition !== position;
        
        if (pairChanged) {
            this.updateState({ 
                currentPair: pair,
                currentComparisonPosition: position 
            });
            this.notify('pairSelected', { pair, position });
        }
    }

    /**
     * Migrate old data to new structure
     */
    migrateToMultipleRatings(players) {
        return players.map(player => {
            // If already has new structure, return as is
            if (player.ratings && typeof player.ratings === 'object') {
                return player;
            }

            // Migrate from old structure
            const positions = player.positions || [player.position || 'OH'];
            const ratings = {};
            const comparisons = {};
            const comparedWith = {};
            
            positions.forEach(pos => {
                ratings[pos] = player.rating || 1500;
                comparisons[pos] = player.comparisons || 0;
                comparedWith[pos] = Array.isArray(player.comparedWith) ? 
                    [...player.comparedWith] : [];
            });

            return {
                id: player.id || Date.now() + Math.random(),
                name: player.name,
                positions: positions,
                ratings: ratings,
                comparisons: comparisons,
                comparedWith: comparedWith,
                createdAt: player.createdAt || new Date().toISOString()
            };
        });
    }

    /**
     * Save to localStorage
     */
    saveToStorage() {
        try {
            const dataToSave = {
                players: this.state.players,
                comparisons: this.state.comparisons,
                version: this.version,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            this.notify('saveError', error);
        }
    }

    /**
     * Load from localStorage with migration
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                
                let players = Array.isArray(data.players) ? data.players : [];
                const comparisons = typeof data.comparisons === 'number' ? data.comparisons : 0;

                // Migrate if old version
                if (!data.version || data.version !== this.version) {
                    players = this.migrateToMultipleRatings(players);
                    this.notify('dataMigrated', { 
                        message: 'Data migrated to multiple ratings system',
                        playersUpdated: players.length 
                    });
                }

                const playersWithIds = players.map(player => ({
                    ...player,
                    id: player.id || Date.now() + Math.random()
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
        this.updateState({ 
            players: [], 
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
     */
    exportData() {
        return JSON.stringify({
            players: this.state.players,
            comparisons: this.state.comparisons,
            version: this.version,
            exportedAt: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Import data
     */
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!Array.isArray(data.players)) {
                throw new Error('Invalid data format: players must be an array');
            }

            let players = this.migrateToMultipleRatings(data.players);

            this.updateState({
                players: players,
                comparisons: typeof data.comparisons === 'number' ? data.comparisons : 0,
                currentPair: null,
                selectedPosition: ''
            });

            this.notify('dataImported', { playersCount: players.length });
            
        } catch (error) {
            console.error('Failed to import data:', error);
            this.notify('importError', error);
            throw error;
        }
    }

    /**
     * Import players from CSV/JSON
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

    normalizePlayerData(playerData, rowNumber) {
        const fieldMapping = {
            'name': ['name', 'player_name', 'playername', 'player', 'Name'],
            'positions': ['positions', 'position', 'pos', 'Position', 'Pos']
        };

        const ratings = {};
        const comparisons = {};
        const comparedWith = {};

        const nameField = this.findField(playerData, fieldMapping.name);
        if (!nameField || !nameField.trim()) {
            throw new Error(`Row ${rowNumber}: Player name required`);
        }
        
        const name = nameField.trim();
        if (name.length > 50) {
            throw new Error(`Row ${rowNumber}: Name too long`);
        }

        let positions = ['OH']; // Default

        const positionsField = this.findField(playerData, fieldMapping.positions);
        if (positionsField) {
            const positionsStr = positionsField.toString().toUpperCase().trim();
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
                positions = [...new Set(normalizedPositions)];
            }
        }

        // Initialize ratings for all positions
        positions.forEach(pos => {
            ratings[pos] = 1500;
            comparisons[pos] = 0;
            comparedWith[pos] = [];
        });

        return {
            id: Date.now() + Math.random(),
            name: name,
            positions: positions,
            ratings: ratings,
            comparisons: comparisons,
            comparedWith: comparedWith,
            createdAt: new Date().toISOString()
        };
    }

    findField(data, fieldNames) {
        for (const fieldName of fieldNames) {
            if (data.hasOwnProperty(fieldName) && data[fieldName] != null) {
                return data[fieldName];
            }
        }
        return undefined;
    }

    exportPlayersAsCSV() {
        const headers = ['name', 'positions'];
        const csvLines = [headers.join(',')];
        
        this.state.players.forEach(player => {
            const row = [
                `"${player.name}"`, 
                `"${player.positions.join(',')}"`
            ];
            csvLines.push(row.join(','));
        });
        
        return csvLines.join('\n');
    }

    generateSampleCSV() {
        const sampleData = [
            ['name', 'positions'],
            ['John Smith', 'OH,MB'],
            ['Alice Johnson', 'S'],
            ['Bob Williams', 'MB'],
            ['Sarah Davis', 'L'],
            ['Mike Brown', 'OPP,OH']
        ];
        
        return sampleData.map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }
}

window.stateManager = new StateManager();
