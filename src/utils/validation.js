// src/utils/validation.js

import { activities } from '../config/activities/index.js';
import storage from '../core/StorageAdapter.js';

/**
 * Validation Utilities
 */

export const VALIDATION_RULES = {
    MAX_NAME_LENGTH: 50,
    MIN_NAME_LENGTH: 1,
    MAX_POSITIONS: 5,
    MIN_POSITIONS: 1
};

/**
 * Get valid positions from currently selected activity
 * @returns {string[]} Array of valid position keys, empty if no activity selected
 */
export function getValidPositions() {
    const selectedActivity = storage.get('selectedActivity', null);
    if (!selectedActivity || !activities[selectedActivity]) {
        return [];
    }
    return Object.keys(activities[selectedActivity].positions);
}

/**
 * Validate player name
 */
export function validateName(name) {
    const errors = [];
    
    if (!name || typeof name !== 'string') {
        errors.push('Name is required');
        return { isValid: false, errors };
    }
    
    const trimmed = name.trim();
    
    if (trimmed.length < VALIDATION_RULES.MIN_NAME_LENGTH) {
        errors.push('Name cannot be empty');
    }
    
    if (trimmed.length > VALIDATION_RULES.MAX_NAME_LENGTH) {
        errors.push(`Name too long (max ${VALIDATION_RULES.MAX_NAME_LENGTH} characters)`);
    }
    
    if (!/^[a-zA-Z\s\u0400-\u04FF'-]+$/.test(trimmed)) {
        errors.push('Name contains invalid characters');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        value: trimmed
    };
}

/**
 * Validate positions array
 */
export function validatePositions(positions) {
    const errors = [];

    if (!Array.isArray(positions)) {
        errors.push('Positions must be an array');
        return { isValid: false, errors };
    }

    if (positions.length < VALIDATION_RULES.MIN_POSITIONS) {
        errors.push('At least one position required');
    }

    if (positions.length > VALIDATION_RULES.MAX_POSITIONS) {
        errors.push(`Maximum ${VALIDATION_RULES.MAX_POSITIONS} positions allowed`);
    }

    // Get valid positions dynamically
    const validPositions = getValidPositions();
    const invalid = positions.filter(pos => !validPositions.includes(pos));
    if (invalid.length > 0) {
        errors.push(`Invalid positions: ${invalid.join(', ')}`);
    }

    const unique = [...new Set(positions)];
    if (unique.length !== positions.length) {
        errors.push('Duplicate positions not allowed');
    }

    return {
        isValid: errors.length === 0,
        errors,
        value: unique
    };
}

/**
 * Validate team count
 */
export function validateTeamCount(count) {
    const num = parseInt(count);
    
    if (isNaN(num) || num < 1) {
        return { isValid: false, error: 'Team count must be at least 1' };
    }
    
    if (num > 10) {
        return { isValid: false, error: 'Maximum 10 teams allowed' };
    }
    
    return { isValid: true, value: num };
}

/**
 * Validate team composition
 */
export function validateComposition(composition) {
    const errors = [];
    
    if (!composition || typeof composition !== 'object') {
        return { isValid: false, errors: ['Invalid composition format'] };
    }
    
    const total = Object.values(composition).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    
    if (total === 0) {
        errors.push('At least one player per team required');
    }
    
    if (total > 12) {
        errors.push('Maximum 12 players per team');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        total
    };
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHTML(text) {
    if (typeof text !== 'string') return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'/]/g, m => map[m]);
}

/**
 * Validate email (for future features)
 */
export function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validate number in range
 */
export function validateNumberInRange(value, min, max) {
    const num = parseInt(value);
    
    if (isNaN(num)) {
        return { isValid: false, error: 'Must be a number' };
    }
    
    if (num < min) {
        return { isValid: false, error: `Minimum value is ${min}` };
    }
    
    if (num > max) {
        return { isValid: false, error: `Maximum value is ${max}` };
    }
    
    return { isValid: true, value: num };
}

export default {
    validateName,
    validatePositions,
    validateTeamCount,
    validateComposition,
    sanitizeHTML,
    validateEmail,
    validateNumberInRange,
    getValidPositions,
    VALIDATION_RULES,
    VALID_POSITIONS
};
