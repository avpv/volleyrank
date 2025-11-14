/**
 * Validation Layer
 * Centralized validation functions for data integrity and consistency
 *
 * This module provides comprehensive validation for all data types used in the application,
 * ensuring consistency, security, and data quality throughout the codebase.
 */

import { isEmpty } from './stringUtils.js';
import ratingConfig from '../config/rating.js';
import { activities } from '../config/activities/index.js';
import storage from '../core/StorageAdapter.js';

/**
 * Validation constants
 * Centralized limits and constraints
 */
export const VALIDATION_LIMITS = {
    /** Player name constraints */
    NAME: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 50,
        PATTERN: /^[a-zA-Z0-9\s\-_.'']+$/
    },

    /** Player constraints */
    PLAYER: {
        MIN_POSITIONS: 1,
        MAX_POSITIONS: 3
    },

    /** Comparison constraints */
    COMPARISON: {
        MIN_PLAYERS: 2,
        MIN_POOL_SIZE: 1
    },

    /** Team constraints */
    TEAM: {
        MIN_TEAMS: 1,
        MAX_TEAMS: 10,
        MIN_PLAYERS_PER_TEAM: 1,
        MAX_PLAYERS_PER_TEAM: 20
    },

    /** Rating constraints (from config) */
    RATING: {
        MIN: ratingConfig.RATING_CONSTANTS.MIN,
        MAX: ratingConfig.RATING_CONSTANTS.MAX,
        DEFAULT: ratingConfig.RATING_CONSTANTS.DEFAULT
    }
};

/**
 * Validation error class
 * Provides structured error information for validation failures
 */
export class ValidationError extends Error {
    constructor(message, field = null, code = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.code = code;
    }
}

/**
 * Player Name Validation
 * Validates player name meets all requirements
 *
 * @param {string} name - The name to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.required - Whether name is required
 * @param {boolean} options.throwError - Whether to throw on validation failure
 * @returns {boolean|ValidationError} True if valid, false or throws ValidationError if invalid
 *
 * @example
 * validatePlayerName('John Doe') // Returns: true
 * validatePlayerName('') // Returns: false
 * validatePlayerName('', { throwError: true }) // Throws: ValidationError
 */
export function validatePlayerName(name, options = {}) {
    const { required = true, throwError = false } = options;

    // Check if name is provided
    if (isEmpty(name)) {
        if (required) {
            const error = new ValidationError(
                'Player name is required',
                'name',
                'NAME_REQUIRED'
            );
            if (throwError) throw error;
            return false;
        }
        return true; // Not required and empty is OK
    }

    // Check minimum length
    if (name.trim().length < VALIDATION_LIMITS.NAME.MIN_LENGTH) {
        const error = new ValidationError(
            `Player name must be at least ${VALIDATION_LIMITS.NAME.MIN_LENGTH} character`,
            'name',
            'NAME_TOO_SHORT'
        );
        if (throwError) throw error;
        return false;
    }

    // Check maximum length
    if (name.length > VALIDATION_LIMITS.NAME.MAX_LENGTH) {
        const error = new ValidationError(
            `Player name must not exceed ${VALIDATION_LIMITS.NAME.MAX_LENGTH} characters`,
            'name',
            'NAME_TOO_LONG'
        );
        if (throwError) throw error;
        return false;
    }

    // Check pattern
    if (!VALIDATION_LIMITS.NAME.PATTERN.test(name)) {
        const error = new ValidationError(
            'Player name contains invalid characters',
            'name',
            'NAME_INVALID_CHARS'
        );
        if (throwError) throw error;
        return false;
    }

    return true;
}

/**
 * Position Validation
 * Validates that a position is valid for the sport
 *
 * @param {string} position - The position to validate
 * @param {Object} options - Validation options
 * @returns {boolean} True if valid position
 *
 * @example
 * validatePosition('S') // Returns: true
 * validatePosition('INVALID') // Returns: false
 */
export function validatePosition(position, options = {}) {
    const { throwError = false } = options;

    if (!position || typeof position !== 'string') {
        const error = new ValidationError(
            'Position must be a non-empty string',
            'position',
            'POSITION_INVALID_TYPE'
        );
        if (throwError) throw error;
        return false;
    }

    // Get currently selected activity
    const selectedActivity = storage.get('selectedActivity', null);
    if (!selectedActivity || !activities[selectedActivity]) {
        const error = new ValidationError(
            'No activity selected',
            'position',
            'NO_ACTIVITY_SELECTED'
        );
        if (throwError) throw error;
        return false;
    }

    const validPositions = Object.keys(activities[selectedActivity].positions);
    if (!validPositions.includes(position)) {
        const error = new ValidationError(
            `Invalid position. Must be one of: ${validPositions.join(', ')}`,
            'position',
            'POSITION_INVALID'
        );
        if (throwError) throw error;
        return false;
    }

    return true;
}

/**
 * Position Array Validation
 * Validates an array of positions
 *
 * @param {Array} positions - Array of positions to validate
 * @param {Object} options - Validation options
 * @returns {boolean} True if all positions are valid
 *
 * @example
 * validatePositions(['S', 'OH']) // Returns: true
 * validatePositions(['S', 'INVALID']) // Returns: false
 */
export function validatePositions(positions, options = {}) {
    const { throwError = false, required = true } = options;

    // Check if positions is an array
    if (!Array.isArray(positions)) {
        const error = new ValidationError(
            'Positions must be an array',
            'positions',
            'POSITIONS_NOT_ARRAY'
        );
        if (throwError) throw error;
        return false;
    }

    // Check if empty
    if (positions.length === 0) {
        if (required) {
            const error = new ValidationError(
                'Player must have at least one position',
                'positions',
                'POSITIONS_EMPTY'
            );
            if (throwError) throw error;
            return false;
        }
        return true;
    }

    // Check minimum positions
    if (positions.length < VALIDATION_LIMITS.PLAYER.MIN_POSITIONS) {
        const error = new ValidationError(
            `Player must have at least ${VALIDATION_LIMITS.PLAYER.MIN_POSITIONS} position`,
            'positions',
            'POSITIONS_TOO_FEW'
        );
        if (throwError) throw error;
        return false;
    }

    // Check maximum positions
    if (positions.length > VALIDATION_LIMITS.PLAYER.MAX_POSITIONS) {
        const error = new ValidationError(
            `Player cannot have more than ${VALIDATION_LIMITS.PLAYER.MAX_POSITIONS} positions`,
            'positions',
            'POSITIONS_TOO_MANY'
        );
        if (throwError) throw error;
        return false;
    }

    // Check for duplicates
    const uniquePositions = new Set(positions);
    if (uniquePositions.size !== positions.length) {
        const error = new ValidationError(
            'Duplicate positions are not allowed',
            'positions',
            'POSITIONS_DUPLICATE'
        );
        if (throwError) throw error;
        return false;
    }

    // Validate each position
    for (const position of positions) {
        if (!validatePosition(position, { throwError: false })) {
            const error = new ValidationError(
                `Invalid position: ${position}`,
                'positions',
                'POSITION_INVALID'
            );
            if (throwError) throw error;
            return false;
        }
    }

    return true;
}

/**
 * Rating Validation
 * Validates a rating value
 *
 * @param {number} rating - The rating to validate
 * @param {Object} options - Validation options
 * @returns {boolean} True if valid rating
 *
 * @example
 * validateRating(1500) // Returns: true
 * validateRating(-100) // Returns: false
 * validateRating(5000) // Returns: false
 */
export function validateRating(rating, options = {}) {
    const { throwError = false, allowUndefined = true } = options;

    // Allow undefined/null if option is set
    if ((rating === undefined || rating === null) && allowUndefined) {
        return true;
    }

    // Check type
    if (typeof rating !== 'number') {
        const error = new ValidationError(
            'Rating must be a number',
            'rating',
            'RATING_INVALID_TYPE'
        );
        if (throwError) throw error;
        return false;
    }

    // Check if finite
    if (!isFinite(rating)) {
        const error = new ValidationError(
            'Rating must be a finite number',
            'rating',
            'RATING_NOT_FINITE'
        );
        if (throwError) throw error;
        return false;
    }

    // Check minimum
    if (rating < VALIDATION_LIMITS.RATING.MIN) {
        const error = new ValidationError(
            `Rating cannot be less than ${VALIDATION_LIMITS.RATING.MIN}`,
            'rating',
            'RATING_TOO_LOW'
        );
        if (throwError) throw error;
        return false;
    }

    // Check maximum
    if (rating > VALIDATION_LIMITS.RATING.MAX) {
        const error = new ValidationError(
            `Rating cannot exceed ${VALIDATION_LIMITS.RATING.MAX}`,
            'rating',
            'RATING_TOO_HIGH'
        );
        if (throwError) throw error;
        return false;
    }

    return true;
}

/**
 * Player Object Validation
 * Validates a complete player object
 *
 * @param {Object} player - The player object to validate
 * @param {Object} options - Validation options
 * @returns {boolean} True if valid player
 *
 * @example
 * validatePlayer({ id: '1', name: 'John', positions: ['S'] })
 * // Returns: true
 */
export function validatePlayer(player, options = {}) {
    const { throwError = false, requireRatings = false } = options;

    // Check if player is an object
    if (!player || typeof player !== 'object') {
        const error = new ValidationError(
            'Player must be an object',
            'player',
            'PLAYER_INVALID_TYPE'
        );
        if (throwError) throw error;
        return false;
    }

    // Validate ID
    if (!player.id || typeof player.id !== 'string') {
        const error = new ValidationError(
            'Player must have a valid ID',
            'player.id',
            'PLAYER_ID_INVALID'
        );
        if (throwError) throw error;
        return false;
    }

    // Validate name
    if (!validatePlayerName(player.name, { throwError })) {
        return false;
    }

    // Validate positions
    if (!validatePositions(player.positions, { throwError })) {
        return false;
    }

    // Validate ratings if present or required
    if (player.ratings || requireRatings) {
        if (!player.ratings || typeof player.ratings !== 'object') {
            const error = new ValidationError(
                'Player ratings must be an object',
                'player.ratings',
                'PLAYER_RATINGS_INVALID'
            );
            if (throwError) throw error;
            return false;
        }

        // Validate each rating
        for (const [position, rating] of Object.entries(player.ratings)) {
            if (!validatePosition(position, { throwError: false })) {
                const error = new ValidationError(
                    `Invalid position in ratings: ${position}`,
                    'player.ratings',
                    'PLAYER_RATING_POSITION_INVALID'
                );
                if (throwError) throw error;
                return false;
            }

            if (!validateRating(rating, { throwError, allowUndefined: false })) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Player ID Validation
 * Validates that two player IDs are different
 *
 * @param {string} playerId1 - First player ID
 * @param {string} playerId2 - Second player ID
 * @param {Object} options - Validation options
 * @returns {boolean} True if IDs are different
 */
export function validateDifferentPlayers(playerId1, playerId2, options = {}) {
    const { throwError = false } = options;

    if (playerId1 === playerId2) {
        const error = new ValidationError(
            'Cannot compare a player with themselves',
            'playerId',
            'PLAYERS_SAME'
        );
        if (throwError) throw error;
        return false;
    }

    return true;
}

/**
 * Team Validation
 * Validates a team structure
 *
 * @param {Array} team - Team players array
 * @param {Object} options - Validation options
 * @returns {boolean} True if valid team
 */
export function validateTeam(team, options = {}) {
    const { throwError = false } = options;

    // Check if team is an array
    if (!Array.isArray(team)) {
        const error = new ValidationError(
            'Team must be an array',
            'team',
            'TEAM_NOT_ARRAY'
        );
        if (throwError) throw error;
        return false;
    }

    // Check minimum players
    if (team.length < VALIDATION_LIMITS.TEAM.MIN_PLAYERS_PER_TEAM) {
        const error = new ValidationError(
            `Team must have at least ${VALIDATION_LIMITS.TEAM.MIN_PLAYERS_PER_TEAM} player`,
            'team',
            'TEAM_TOO_FEW_PLAYERS'
        );
        if (throwError) throw error;
        return false;
    }

    // Check maximum players
    if (team.length > VALIDATION_LIMITS.TEAM.MAX_PLAYERS_PER_TEAM) {
        const error = new ValidationError(
            `Team cannot have more than ${VALIDATION_LIMITS.TEAM.MAX_PLAYERS_PER_TEAM} players`,
            'team',
            'TEAM_TOO_MANY_PLAYERS'
        );
        if (throwError) throw error;
        return false;
    }

    // Validate each player
    for (const player of team) {
        if (!validatePlayer(player, { throwError })) {
            return false;
        }
    }

    // Check for duplicate players
    const playerIds = team.map(p => p.id);
    const uniqueIds = new Set(playerIds);
    if (uniqueIds.size !== playerIds.length) {
        const error = new ValidationError(
            'Team contains duplicate players',
            'team',
            'TEAM_DUPLICATE_PLAYERS'
        );
        if (throwError) throw error;
        return false;
    }

    return true;
}

/**
 * Import Data Validation
 * Validates imported player data structure
 *
 * @param {Array} data - Imported data array
 * @param {Object} options - Validation options
 * @returns {boolean} True if valid import data
 */
export function validateImportData(data, options = {}) {
    const { throwError = false } = options;

    // Check if data is an array
    if (!Array.isArray(data)) {
        const error = new ValidationError(
            'Import data must be an array',
            'importData',
            'IMPORT_NOT_ARRAY'
        );
        if (throwError) throw error;
        return false;
    }

    // Check if empty
    if (data.length === 0) {
        const error = new ValidationError(
            'Import data cannot be empty',
            'importData',
            'IMPORT_EMPTY'
        );
        if (throwError) throw error;
        return false;
    }

    // Validate each player
    for (let i = 0; i < data.length; i++) {
        const player = data[i];
        if (!validatePlayer(player, { throwError: false })) {
            const error = new ValidationError(
                `Invalid player at index ${i}`,
                `importData[${i}]`,
                'IMPORT_INVALID_PLAYER'
            );
            if (throwError) throw error;
            return false;
        }
    }

    return true;
}

/**
 * Sanitize and validate player data
 * Cleans and validates player data for safe storage
 *
 * @param {Object} player - Player data to sanitize
 * @returns {Object} Sanitized player object
 */
export function sanitizePlayerData(player) {
    if (!player || typeof player !== 'object') {
        throw new ValidationError('Invalid player data', 'player', 'PLAYER_INVALID');
    }

    // Import stringUtils locally to avoid circular deps
    const { sanitizeName } = await import('./stringUtils.js');

    return {
        id: player.id,
        name: sanitizeName(player.name),
        positions: Array.isArray(player.positions) ? [...player.positions] : [],
        ratings: player.ratings ? { ...player.ratings } : {},
        comparisons: player.comparisons ? { ...player.comparisons } : {},
        comparedWith: player.comparedWith ? { ...player.comparedWith } : {},
        createdAt: player.createdAt || Date.now(),
        updatedAt: Date.now()
    };
}

/**
 * Default export with all validators
 */
export default {
    VALIDATION_LIMITS,
    ValidationError,
    validatePlayerName,
    validatePosition,
    validatePositions,
    validateRating,
    validatePlayer,
    validateDifferentPlayers,
    validateTeam,
    validateImportData,
    sanitizePlayerData
};
