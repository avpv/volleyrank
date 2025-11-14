/**
 * Validation Configuration
 * Centralized validation constants and limits
 *
 * This file provides a single source of truth for all validation-related constants
 * across the application, ensuring consistency in validation rules.
 */

/**
 * Player Name Validation
 */
export const NAME_VALIDATION = {
    /** Minimum name length */
    MIN_LENGTH: 1,

    /** Maximum name length */
    MAX_LENGTH: 50,

    /** Valid name pattern (letters, numbers, spaces, hyphens, underscores, apostrophes, Cyrillic) */
    PATTERN: /^[a-zA-Z0-9\s\-_.'']+$/,

    /** Extended pattern including Cyrillic characters */
    PATTERN_EXTENDED: /^[a-zA-Z\s\u0400-\u04FF'-]+$/
};

/**
 * Player Position Validation
 */
export const POSITION_VALIDATION = {
    /** Minimum positions per player */
    MIN_POSITIONS: 1,

    /** Maximum positions per player */
    MAX_POSITIONS: 3
};

/**
 * Team Validation
 */
export const TEAM_VALIDATION = {
    /** Minimum number of teams */
    MIN_TEAMS: 1,

    /** Maximum number of teams */
    MAX_TEAMS: 10,

    /** Minimum players per team */
    MIN_PLAYERS_PER_TEAM: 1,

    /** Maximum players per team */
    MAX_PLAYERS_PER_TEAM: 20
};

/**
 * Comparison Validation
 */
export const COMPARISON_VALIDATION = {
    /** Minimum players required for comparison */
    MIN_PLAYERS: 2,

    /** Minimum pool size for comparisons */
    MIN_POOL_SIZE: 1
};

/**
 * Combined Validation Limits
 * All validation limits in one object for convenience
 */
export const VALIDATION_LIMITS = {
    NAME: NAME_VALIDATION,
    POSITION: POSITION_VALIDATION,
    TEAM: TEAM_VALIDATION,
    COMPARISON: COMPARISON_VALIDATION
};

/**
 * Export default configuration object
 */
export default {
    NAME_VALIDATION,
    POSITION_VALIDATION,
    TEAM_VALIDATION,
    COMPARISON_VALIDATION,
    VALIDATION_LIMITS
};
