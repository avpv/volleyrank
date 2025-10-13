/**
 * StateManager - Centralized application state with event-driven updates
 * Enterprise-grade state management with immutability
 */
import eventBus from './EventBus.js';
import storage from './StorageAdapter.js';

class StateManager {
    constructor() {
        this.state = {
            players: [],
            comparisons: 0,
            version: '4.0',
            settings: {
                showEloRatings: true,
                theme: 'dark'
            }
        };
        
        this.storageKey = 'app_state';
        this.autoSave = true;
        this.saveTimeout = null;
    }

    /**
     * Get current state (immutable copy)
     */
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Get specific state property
     */
    get(path) {
        const keys = path.split('.');
        let value = this.state;
        
        for (const key of keys) {
            if (value === undefined || value === null) {
                return undefined;
            }
            value = value[key];
        }
        
        return value ? JSON.parse(JSON.stringify(value)) : value;
    }

    /**
     * Update state immutably
     */
    setState(updates, options = {}) {
        const { 
            silent = false, 
            event = 'state:updated',
            save = true 
        } = options;

        // Create new state object
        const oldState = this.getState();
        this.state = {
            ...this.state,
            ...updates
        };

        // Emit events if not silent
        if (!silent) {
            eventBus.emit(event, {
                oldState,
                newState: this.getState(),
                updates
            });
            
            eventBus.emit('state:changed', {
                oldState,
                newState: this.getState()
            });
        }

        // Auto-save
        if (save && this.autoSave) {
            this.scheduleSave();
        }
    }

    /**
     * Update nested state property
     */
    set(path, value, options = {}) {
        const keys = path.split('.');
        const newState = JSON.parse(JSON.stringify(this.state));
        
        let current = newState;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
        
        this.setState(newState, options);
    }

    /**
     * Schedule save with debouncing
     */
    scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.save();
        }, 500);
    }

    /**
     * Save state to storage
     */
    save() {
        try {
            const dataToSave = {
                ...this.state,
                savedAt: new Date().toISOString()
            };

            const success = storage.set(this.storageKey, dataToSave);
            
            if (success) {
                eventBus.emit('state:saved', this.getState());
            } else {
                throw new Error('Failed to save state');
            }
        } catch (error) {
            console.error('Error saving state:', error);
            eventBus.emit('state:save-error', error);
        }
    }

    /**
     * Load state from storage
     */
    load() {
        try {
            const saved = storage.get(this.storageKey);
            
            if (saved) {
                // Migrate if needed
                const migrated = this.migrate(saved);
                
                this.state = {
                    ...this.state,
                    ...migrated
                };

                eventBus.emit('state:loaded', {
                    data: this.getState(),
                    savedAt: saved.savedAt
                });

                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error loading state:', error);
            eventBus.emit('state:load-error', error);
            return false;
        }
    }

    /**
     * Migrate data from older versions
     */
    migrate(data) {
        const version = data.version || '1.0';
        
        // Version 3.0 -> 4.0 migration
        if (version < '4.0') {
            console.log('Migrating data from version', version, 'to 4.0');
            
            // Ensure players have correct structure
            if (data.players) {
                data.players = data.players.map(player => {
                    // Already in correct format
                    if (player.ratings && typeof player.ratings === 'object') {
                        return player;
                    }

                    // Migrate from old format
                    const positions = player.positions || [player.position || 'OH'];
                    const ratings = {};
                    const comparisons = {};
                    const comparedWith = {};
                    
                    positions.forEach(pos => {
                        ratings[pos] = player.rating || 1500;
                        comparisons[pos] = player.comparisons || 0;
                        comparedWith[pos] = player.comparedWith || [];
                    });

                    return {
                        id: player.id || Date.now() + Math.random(),
                        name: player.name,
                        positions,
                        ratings,
                        comparisons,
                        comparedWith,
                        createdAt: player.createdAt || new Date().toISOString()
                    };
                });
            }

            data.version = '4.0';
            
            eventBus.emit('state:migrated', {
                from: version,
                to: '4.0',
                playersUpdated: data.players?.length || 0
            });
        }

        return data;
    }

    /**
     * Reset state to defaults
     */
    reset(options = {}) {
        const { clearStorage = true } = options;

        this.state = {
            players: [],
            comparisons: 0,
            version: '4.0',
            settings: {
                showEloRatings: true,
                theme: 'dark'
            }
        };

        if (clearStorage) {
            storage.remove(this.storageKey);
        }

        eventBus.emit('state:reset');
    }

    /**
     * Export state as JSON
     */
    export() {
        return JSON.stringify({
            ...this.getState(),
            exportedAt: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Import state from JSON
     */
    import(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? 
                JSON.parse(jsonData) : jsonData;

            const migrated = this.migrate(data);

            this.setState(migrated, {
                event: 'state:imported'
            });

            return {
                success: true,
                playersImported: migrated.players?.length || 0
            };
        } catch (error) {
            console.error('Import failed:', error);
            eventBus.emit('state:import-error', error);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get state statistics
     */
    getStats() {
        return {
            playerCount: this.state.players?.length || 0,
            totalComparisons: this.state.comparisons || 0,
            version: this.state.version,
            storageSize: storage.getSizeFormatted(),
            lastSaved: storage.get(this.storageKey)?.savedAt
        };
    }
}

// Export singleton
const stateManager = new StateManager();
export default stateManager;

// For debugging
if (typeof window !== 'undefined') {
    window.stateManager = stateManager;
}
