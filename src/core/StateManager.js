// src/core/StateManager.js

/**
 * StateManager - Centralized application state with event-driven updates
 * Enterprise-grade state management with immutability
 */
import eventBus from './EventBus.js';
import storage from './StorageAdapter.js';
import { ACTIVITY_FILES } from '../config/activities/index.js';
import ratingConfig from '../config/rating.js';
import validationConfig from '../config/validation.js';
import uiConfig from '../config/ui.js';

class StateManager {
    constructor() {
        this.state = {
            sessions: {},
            activeSessions: {},
            version: '5.0',
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
        }, uiConfig.DEBOUNCE.SAVE);
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
                        ratings[pos] = player.rating || ratingConfig.RATING_CONSTANTS.DEFAULT;
                        comparisons[pos] = player.comparisons || validationConfig.DEFAULT_VALUES.COMPARISONS;
                        comparedWith[pos] = player.comparedWith || validationConfig.DEFAULT_VALUES.COMPARED_WITH;
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

        // Version 4.0 -> 4.1 migration (players -> playersByActivity)
        if (version < '4.1') {

            // Get the currently selected activity from storage
            const selectedActivity = storage.get('selectedActivity', null);

            // If old players array exists, move it to the selected activity
            if (data.players && Array.isArray(data.players)) {
                // Initialize playersByActivity with all available activities
                data.playersByActivity = Object.keys(ACTIVITY_FILES).reduce((acc, key) => {
                    acc[key] = [];
                    return acc;
                }, {});

                // Place existing players under the currently selected activity
                data.playersByActivity[selectedActivity] = data.players;

                // Remove old players array
                delete data.players;
            } else if (!data.playersByActivity) {
                // Initialize empty playersByActivity if it doesn't exist
                data.playersByActivity = Object.keys(ACTIVITY_FILES).reduce((acc, key) => {
                    acc[key] = [];
                    return acc;
                }, {});
            }

            data.version = '4.1';

            eventBus.emit('state:migrated', {
                from: version,
                to: '4.1',
                playersMigrated: data.playersByActivity[selectedActivity]?.length || 0
            });
        }

        // Version 4.1 -> 5.0 migration (playersByActivity -> sessions)
        if (version < '5.0') {

            data.sessions = {};
            data.activeSessions = {};

            // If playersByActivity exists, convert it to sessions
            if (data.playersByActivity) {
                const activityKeys = Object.keys(data.playersByActivity);
                let totalPlayersMigrated = 0;

                activityKeys.forEach(activityKey => {
                    const players = data.playersByActivity[activityKey] || [];

                    // Only create a session if there are players
                    if (players.length > 0) {
                        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        const timestamp = new Date().toISOString();

                        // Create first session with existing players
                        data.sessions[activityKey] = {
                            [sessionId]: {
                                id: sessionId,
                                createdAt: timestamp,
                                players: players,
                                comparisons: data.comparisons || validationConfig.DEFAULT_VALUES.COMPARISONS,
                                settings: {}
                            }
                        };

                        // Set as active session
                        data.activeSessions[activityKey] = sessionId;

                        totalPlayersMigrated += players.length;
                    } else {
                        // No players, initialize empty sessions object for this activity
                        data.sessions[activityKey] = {};
                        data.activeSessions[activityKey] = null;
                    }
                });

                // Remove old playersByActivity structure
                delete data.playersByActivity;
            } else {
                // No existing data, initialize empty structure
                data.sessions = {};
                data.activeSessions = {};
            }

            // Remove old comparisons count (now stored per session)
            delete data.comparisons;

            data.version = '5.0';

            eventBus.emit('state:migrated', {
                from: version,
                to: '5.0',
                sessionsCreated: Object.keys(data.sessions).length
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
            sessions: {},
            activeSessions: {},
            version: '5.0',
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
        const selectedActivity = storage.get('selectedActivity', null);
        const sessions = this.state.sessions || {};
        const activeSessions = this.state.activeSessions || {};
        const activeSessionId = activeSessions[selectedActivity];

        let playerCount = 0;
        let totalComparisons = 0;
        let sessionCount = 0;

        // Get stats for selected activity
        if (sessions[selectedActivity]) {
            const activitySessions = sessions[selectedActivity];
            sessionCount = Object.keys(activitySessions).length;

            // Get active session stats
            if (activeSessionId && activitySessions[activeSessionId]) {
                const activeSession = activitySessions[activeSessionId];
                playerCount = activeSession.players?.length || 0;
                totalComparisons = activeSession.comparisons || 0;
            }
        }

        return {
            playerCount,
            totalComparisons,
            sessionCount,
            version: this.state.version,
            storageSize: storage.getSizeFormatted(),
            lastSaved: storage.get(this.storageKey)?.savedAt,
            currentActivity: selectedActivity
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
