// src/services/ValidationService.js

/**
 * ValidationService - Centralized validation logic
 *
 * Responsibilities:
 * - Validate player data
 * - Validate position data
 * - Sanitize inputs
 * - Provide validation rules
 *
 * Benefits:
 * - Single Responsibility Principle
 * - Reusable validation logic
 * - Easy to test
 * - Easy to extend with new validation rules
 */

class ValidationService {
    /**
     * @param {Object} activityConfig - Activity configuration
     */
    constructor(activityConfig) {
        this.config = activityConfig;
        this.positions = activityConfig.positions;

        // Validation rules
        this.rules = {
            playerName: {
                minLength: 1,
                maxLength: 50,
                pattern: /^[a-zA-Z\s\u0400-\u04FF'-]+$/,
                patternMessage: 'Player name contains invalid characters'
            }
        };
    }

    /**
     * Validate player name
     * @param {string} name - Player name
     * @returns {Object} Validation result
     */
    validateName(name) {
        const errors = [];

        if (!name || typeof name !== 'string') {
            errors.push('Player name is required');
            return { isValid: false, errors, sanitized: '' };
        }

        const trimmed = name.trim();

        if (trimmed.length === 0) {
            errors.push('Player name cannot be empty');
        } else if (trimmed.length < this.rules.playerName.minLength) {
            errors.push(`Player name is too short (min ${this.rules.playerName.minLength} characters)`);
        } else if (trimmed.length > this.rules.playerName.maxLength) {
            errors.push(`Player name is too long (max ${this.rules.playerName.maxLength} characters)`);
        } else if (!this.rules.playerName.pattern.test(trimmed)) {
            errors.push(this.rules.playerName.patternMessage);
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitized: trimmed
        };
    }

    /**
     * Validate positions array
     * @param {Array<string>} positions - Array of position codes
     * @returns {Object} Validation result
     */
    validatePositions(positions) {
        const errors = [];

        if (!Array.isArray(positions)) {
            errors.push('Positions must be an array');
            return { isValid: false, errors, sanitized: [] };
        }

        if (positions.length === 0) {
            errors.push('At least one position is required');
            return { isValid: false, errors, sanitized: [] };
        }

        const validPositions = Object.keys(this.positions);
        const invalid = positions.filter(pos => !validPositions.includes(pos));

        if (invalid.length > 0) {
            errors.push(`Invalid positions: ${invalid.join(', ')}`);
        }

        // Remove duplicates
        const unique = [...new Set(positions)];

        if (unique.length !== positions.length) {
            errors.push('Duplicate positions not allowed');
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitized: unique
        };
    }

    /**
     * Validate player data
     * @param {string} name - Player name
     * @param {Array<string>} positions - Player positions
     * @returns {Object} Validation result
     */
    validatePlayer(name, positions) {
        const nameValidation = this.validateName(name);
        const positionsValidation = this.validatePositions(positions);

        const errors = [
            ...nameValidation.errors,
            ...positionsValidation.errors
        ];

        return {
            isValid: errors.length === 0,
            errors,
            sanitized: {
                name: nameValidation.sanitized,
                positions: positionsValidation.sanitized
            }
        };
    }

    /**
     * Validate rating value
     * @param {number} rating - Rating value
     * @returns {Object} Validation result
     */
    validateRating(rating) {
        const errors = [];

        if (typeof rating !== 'number') {
            errors.push('Rating must be a number');
            return { isValid: false, errors };
        }

        if (!isFinite(rating)) {
            errors.push('Rating must be a finite number');
        }

        if (rating < 0) {
            errors.push('Rating cannot be negative');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate comparison data
     * @param {string} winnerId - Winner ID
     * @param {string} loserId - Loser ID
     * @param {string} position - Position
     * @returns {Object} Validation result
     */
    validateComparison(winnerId, loserId, position) {
        const errors = [];

        if (!winnerId) {
            errors.push('Winner ID is required');
        }

        if (!loserId) {
            errors.push('Loser ID is required');
        }

        if (winnerId === loserId) {
            errors.push('Cannot compare a player with themselves');
        }

        if (!position) {
            errors.push('Position is required');
        } else if (!Object.keys(this.positions).includes(position)) {
            errors.push(`Invalid position: ${position}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate team composition
     * @param {Object} composition - Position composition requirements
     * @returns {Object} Validation result
     */
    validateComposition(composition) {
        const errors = [];

        if (!composition || typeof composition !== 'object') {
            errors.push('Composition must be an object');
            return { isValid: false, errors };
        }

        const validPositions = Object.keys(this.positions);

        Object.entries(composition).forEach(([position, count]) => {
            if (!validPositions.includes(position)) {
                errors.push(`Invalid position in composition: ${position}`);
            }

            if (typeof count !== 'number' || count < 0 || !Number.isInteger(count)) {
                errors.push(`Invalid count for position ${position}: must be a non-negative integer`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate team count
     * @param {number} teamCount - Number of teams
     * @returns {Object} Validation result
     */
    validateTeamCount(teamCount) {
        const errors = [];

        if (typeof teamCount !== 'number') {
            errors.push('Team count must be a number');
            return { isValid: false, errors };
        }

        if (!Number.isInteger(teamCount)) {
            errors.push('Team count must be an integer');
        }

        if (teamCount < 2) {
            errors.push('Team count must be at least 2');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

export default ValidationService;
