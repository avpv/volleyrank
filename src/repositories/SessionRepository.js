// src/repositories/SessionRepository.js

/**
 * SessionRepository - Data Access Layer for Session entities
 *
 * Responsibilities:
 * - Encapsulate all data access operations for sessions
 * - Provide clean interface for CRUD operations
 * - Manage session data structure in state
 * - Ensure data consistency across sessions
 *
 * Benefits:
 * - Single source of truth for session data operations
 * - Easy to test (can mock repository)
 * - Easy to change storage implementation
 * - Reduces coupling between services and state management
 */

class SessionRepository {
    /**
     * @param {StateManager} stateManager - State management service
     * @param {EventBus} eventBus - Event bus for notifications
     */
    constructor(stateManager, eventBus) {
        this.stateManager = stateManager;
        this.eventBus = eventBus;
    }

    /**
     * Get all sessions for a specific activity
     * @param {string} activityKey - Activity key (e.g., 'volleyball', 'basketball')
     * @returns {Object} Sessions object with session IDs as keys
     */
    getAllForActivity(activityKey) {
        const sessions = this.stateManager.get('sessions') || {};
        return sessions[activityKey] || {};
    }

    /**
     * Get specific session by ID
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID
     * @returns {Object|null} Session data or null if not found
     */
    getById(activityKey, sessionId) {
        const sessions = this.getAllForActivity(activityKey);
        return sessions[sessionId] || null;
    }

    /**
     * Get active session ID for an activity
     * @param {string} activityKey - Activity key
     * @returns {string|null} Active session ID or null
     */
    getActiveSessionId(activityKey) {
        const activeSessions = this.stateManager.get('activeSessions') || {};
        return activeSessions[activityKey] || null;
    }

    /**
     * Get active session data for an activity
     * @param {string} activityKey - Activity key
     * @returns {Object|null} Active session data or null
     */
    getActiveSession(activityKey) {
        const sessionId = this.getActiveSessionId(activityKey);
        if (!sessionId) return null;
        return this.getById(activityKey, sessionId);
    }

    /**
     * Create a new session for an activity
     * @param {string} activityKey - Activity key
     * @param {Object} sessionData - Initial session data
     * @returns {Object} Created session
     */
    create(activityKey, sessionData = {}) {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();

        const newSession = {
            id: sessionId,
            createdAt: timestamp,
            players: [],
            comparisons: 0,
            settings: {},
            teamBuilderSettings: null,
            generatedTeams: null,
            ...sessionData
        };

        const state = this.stateManager.getState();
        const sessions = state.sessions || {};
        const activitySessions = sessions[activityKey] || {};

        // Add new session
        const updatedSessions = {
            ...sessions,
            [activityKey]: {
                ...activitySessions,
                [sessionId]: newSession
            }
        };

        this.stateManager.setState({
            sessions: updatedSessions
        }, {
            event: 'session:created',
            save: true
        });

        this.eventBus.emit('session:created', {
            activityKey,
            session: newSession
        });

        return newSession;
    }

    /**
     * Update existing session
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID
     * @param {Object} updates - Fields to update
     * @returns {Object} Updated session
     * @throws {Error} If session not found
     */
    update(activityKey, sessionId, updates) {
        const session = this.getById(activityKey, sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found for activity ${activityKey}`);
        }

        const updatedSession = {
            ...session,
            ...updates
        };

        const state = this.stateManager.getState();
        const sessions = state.sessions || {};
        const activitySessions = sessions[activityKey] || {};

        const updatedSessions = {
            ...sessions,
            [activityKey]: {
                ...activitySessions,
                [sessionId]: updatedSession
            }
        };

        this.stateManager.setState({
            sessions: updatedSessions
        }, {
            event: 'session:updated',
            save: true
        });

        this.eventBus.emit('session:updated', {
            activityKey,
            sessionId,
            session: updatedSession
        });

        return updatedSession;
    }

    /**
     * Delete a session
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID
     * @returns {Object} Deleted session
     * @throws {Error} If session not found
     */
    delete(activityKey, sessionId) {
        const session = this.getById(activityKey, sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found for activity ${activityKey}`);
        }

        const state = this.stateManager.getState();
        const sessions = state.sessions || {};
        const activitySessions = { ...sessions[activityKey] };

        // Remove session
        delete activitySessions[sessionId];

        // Clean up: if no sessions left for this activity, remove the activity key entirely
        const remainingSessions = Object.keys(activitySessions);
        let updatedSessions;
        if (remainingSessions.length === 0) {
            // Remove the activity key entirely when last session is deleted
            updatedSessions = { ...sessions };
            delete updatedSessions[activityKey];
        } else {
            // Keep the activity key with remaining sessions
            updatedSessions = {
                ...sessions,
                [activityKey]: activitySessions
            };
        }

        // If deleted session was active, set a new active session
        const activeSessions = state.activeSessions || {};
        const activeSessionId = activeSessions[activityKey];

        if (activeSessionId === sessionId) {
            // Don't auto-select another session - let user choose manually
            const newActiveSessionId = null;

            this.stateManager.setState({
                sessions: updatedSessions,
                activeSessions: {
                    ...activeSessions,
                    [activityKey]: newActiveSessionId
                }
            }, {
                event: 'session:deleted',
                save: true
            });
        } else {
            this.stateManager.setState({
                sessions: updatedSessions
            }, {
                event: 'session:deleted',
                save: true
            });
        }

        this.eventBus.emit('session:deleted', {
            activityKey,
            sessionId,
            session
        });

        return session;
    }

    /**
     * Set active session for an activity
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID to activate
     * @returns {Object} Activated session
     * @throws {Error} If session not found
     */
    setActiveSession(activityKey, sessionId) {
        const session = this.getById(activityKey, sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found for activity ${activityKey}`);
        }

        const state = this.stateManager.getState();
        const activeSessions = state.activeSessions || {};

        this.stateManager.setState({
            activeSessions: {
                ...activeSessions,
                [activityKey]: sessionId
            }
        }, {
            event: 'session:activated',
            save: true
        });

        this.eventBus.emit('session:activated', {
            activityKey,
            sessionId,
            session
        });

        return session;
    }

    /**
     * Get all sessions sorted by creation date (newest first)
     * @param {string} activityKey - Activity key
     * @returns {Array<Object>} Array of sessions sorted by date
     */
    getAllSorted(activityKey) {
        const sessions = this.getAllForActivity(activityKey);
        const sessionArray = Object.values(sessions);

        return sessionArray.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }

    /**
     * Get count of sessions for an activity
     * @param {string} activityKey - Activity key
     * @returns {number} Number of sessions
     */
    count(activityKey) {
        const sessions = this.getAllForActivity(activityKey);
        return Object.keys(sessions).length;
    }

    /**
     * Check if a session exists
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID
     * @returns {boolean} True if session exists
     */
    exists(activityKey, sessionId) {
        return this.getById(activityKey, sessionId) !== null;
    }

    /**
     * Get all players for a specific session
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID
     * @returns {Array<Object>} Array of players
     */
    getPlayers(activityKey, sessionId) {
        const session = this.getById(activityKey, sessionId);
        return session?.players || [];
    }

    /**
     * Update players for a specific session
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID
     * @param {Array<Object>} players - Updated players array
     * @returns {Object} Updated session
     */
    updatePlayers(activityKey, sessionId, players) {
        return this.update(activityKey, sessionId, { players });
    }

    /**
     * Get team builder settings for a specific session
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID
     * @returns {Object|null} Team builder settings or null
     */
    getTeamBuilderSettings(activityKey, sessionId) {
        const session = this.getById(activityKey, sessionId);
        return session?.teamBuilderSettings || null;
    }

    /**
     * Update team builder settings for a specific session
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID
     * @param {Object} teamBuilderSettings - Team builder settings
     * @returns {Object} Updated session
     */
    updateTeamBuilderSettings(activityKey, sessionId, teamBuilderSettings) {
        return this.update(activityKey, sessionId, { teamBuilderSettings });
    }

    /**
     * Get generated teams for a specific session
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID
     * @returns {Array|null} Generated teams or null
     */
    getGeneratedTeams(activityKey, sessionId) {
        const session = this.getById(activityKey, sessionId);
        return session?.generatedTeams || null;
    }

    /**
     * Update generated teams for a specific session
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID
     * @param {Array} generatedTeams - Generated teams array
     * @returns {Object} Updated session
     */
    updateGeneratedTeams(activityKey, sessionId, generatedTeams) {
        return this.update(activityKey, sessionId, { generatedTeams });
    }
}

export default SessionRepository;
