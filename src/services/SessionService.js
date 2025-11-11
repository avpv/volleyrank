// src/services/SessionService.js

/**
 * SessionService - Business Logic for Session Management
 *
 * Responsibilities:
 * - Handle session lifecycle (create, switch, delete)
 * - Manage active session state
 * - Coordinate with other services
 * - Provide high-level session operations
 *
 * This service acts as the main interface for session-related operations
 * and ensures business rules are enforced.
 */

class SessionService {
    /**
     * @param {SessionRepository} sessionRepository - Session data access
     * @param {EventBus} eventBus - Event bus for notifications
     */
    constructor(sessionRepository, eventBus) {
        this.sessionRepository = sessionRepository;
        this.eventBus = eventBus;
    }

    /**
     * Create a new session for an activity
     * @param {string} activityKey - Activity key (e.g., 'volleyball', 'basketball')
     * @returns {Object} Created session with metadata
     */
    createSession(activityKey) {
        const session = this.sessionRepository.create(activityKey);

        // Automatically set as active session
        this.sessionRepository.setActiveSession(activityKey, session.id);

        return {
            success: true,
            session,
            message: 'Session created successfully'
        };
    }

    /**
     * Switch to a different session
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID to switch to
     * @returns {Object} Result with session data
     */
    switchSession(activityKey, sessionId) {
        try {
            const session = this.sessionRepository.setActiveSession(activityKey, sessionId);

            return {
                success: true,
                session,
                message: 'Session switched successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to switch session'
            };
        }
    }

    /**
     * Delete a session
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID to delete
     * @returns {Object} Result of deletion
     */
    deleteSession(activityKey, sessionId) {
        try {
            const session = this.sessionRepository.delete(activityKey, sessionId);

            return {
                success: true,
                deletedSession: session,
                message: 'Session deleted successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to delete session'
            };
        }
    }

    /**
     * Get active session for an activity
     * @param {string} activityKey - Activity key
     * @returns {Object|null} Active session or null
     */
    getActiveSession(activityKey) {
        return this.sessionRepository.getActiveSession(activityKey);
    }

    /**
     * Get active session ID for an activity
     * @param {string} activityKey - Activity key
     * @returns {string|null} Active session ID or null
     */
    getActiveSessionId(activityKey) {
        return this.sessionRepository.getActiveSessionId(activityKey);
    }

    /**
     * Get all sessions for an activity (sorted by date)
     * @param {string} activityKey - Activity key
     * @returns {Array<Object>} Array of sessions
     */
    getAllSessions(activityKey) {
        return this.sessionRepository.getAllSorted(activityKey);
    }

    /**
     * Get session by ID
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID
     * @returns {Object|null} Session data or null
     */
    getSession(activityKey, sessionId) {
        return this.sessionRepository.getById(activityKey, sessionId);
    }

    /**
     * Get session count for an activity
     * @param {string} activityKey - Activity key
     * @returns {number} Number of sessions
     */
    getSessionCount(activityKey) {
        return this.sessionRepository.count(activityKey);
    }

    /**
     * Update session data
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID
     * @param {Object} updates - Fields to update
     * @returns {Object} Result with updated session
     */
    updateSession(activityKey, sessionId, updates) {
        try {
            const session = this.sessionRepository.update(activityKey, sessionId, updates);

            return {
                success: true,
                session,
                message: 'Session updated successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to update session'
            };
        }
    }

    /**
     * Check if an activity has any sessions
     * @param {string} activityKey - Activity key
     * @returns {boolean} True if activity has sessions
     */
    hasSessions(activityKey) {
        return this.getSessionCount(activityKey) > 0;
    }

    /**
     * Ensure at least one session exists for an activity
     * If no sessions exist, create one and set it as active
     * @param {string} activityKey - Activity key
     * @returns {Object} Active session (existing or newly created)
     */
    ensureActiveSession(activityKey) {
        let activeSession = this.getActiveSession(activityKey);

        // If no active session, check if any sessions exist
        if (!activeSession) {
            const allSessions = this.getAllSessions(activityKey);

            if (allSessions.length > 0) {
                // Set the most recent session as active
                this.sessionRepository.setActiveSession(activityKey, allSessions[0].id);
                activeSession = allSessions[0];
            } else {
                // No sessions exist, create a new one
                const result = this.createSession(activityKey);
                activeSession = result.session;
            }
        }

        return activeSession;
    }

    /**
     * Get session statistics
     * @param {string} activityKey - Activity key
     * @param {string} sessionId - Session ID
     * @returns {Object} Session statistics
     */
    getSessionStats(activityKey, sessionId) {
        const session = this.getSession(activityKey, sessionId);

        if (!session) {
            return null;
        }

        return {
            id: session.id,
            createdAt: session.createdAt,
            playerCount: session.players?.length || 0,
            comparisonCount: session.comparisons || 0,
            hasPlayers: (session.players?.length || 0) > 0
        };
    }

    /**
     * Get all session statistics for an activity
     * @param {string} activityKey - Activity key
     * @returns {Array<Object>} Array of session statistics
     */
    getAllSessionStats(activityKey) {
        const sessions = this.getAllSessions(activityKey);
        return sessions.map(session => this.getSessionStats(activityKey, session.id));
    }
}

export default SessionService;
