/**
 * UI Configuration
 * Centralized UI constraints and settings
 *
 * This file provides a single source of truth for all UI-related constants
 * such as input constraints, form limits, and display settings.
 */

/**
 * Input Field Constraints
 */
export const INPUT_CONSTRAINTS = {
    /** Team count input */
    TEAM_COUNT: {
        MIN: 1,
        MAX: 10,
        DEFAULT: 2
    },

    /** Position composition input */
    COMPOSITION: {
        MIN: 0,
        MAX: 6,
        DEFAULT: 1
    },

    /** Position weight input */
    WEIGHT: {
        MIN: 0.1,
        MAX: 5.0,
        STEP: 0.1,
        DEFAULT: 1.0  // Default position weight
    },

    /** Position composition default value */
    COMPOSITION_DEFAULT: 0,

    /** Text truncation */
    TEXT_TRUNCATE: {
        DEFAULT_MAX_LENGTH: 50
    }
};

/**
 * Balance Quality Display Thresholds
 * NOTE: These should match BALANCE_THRESHOLDS.QUALITY in config/rating.js
 * Used for UI display only - calculation uses rating.js values
 */
export const BALANCE_DISPLAY = {
    /** Excellent balance indicator */
    EXCELLENT: 100,

    /** Very Good balance indicator */
    VERY_GOOD: 200,

    /** Good balance indicator */
    GOOD: 300,

    /** Fair balance indicator */
    FAIR: 500,

    /** Poor balance (above FAIR threshold) */
    // POOR: > 500
};

/**
 * Animation and Transition Settings
 */
export const ANIMATION = {
    /** Immediate/instant delay for display changes (ms) */
    IMMEDIATE: 10,

    /** Short animation duration (ms) */
    SHORT: 100,

    /** Standard animation duration (ms) */
    STANDARD: 300,

    /** Long animation duration (ms) */
    LONG: 500
};

/**
 * Debounce Settings
 */
export const DEBOUNCE = {
    /** Event handling debounce (ms) */
    EVENT: 100,

    /** Input field debounce (ms) */
    INPUT: 300,

    /** Auto-save debounce (ms) */
    SAVE: 500,

    /** Search debounce (ms) */
    SEARCH: 300
};

/**
 * Toast Notification Settings
 */
export const TOAST = {
    /** Toast animation duration (ms) */
    ANIMATION_DURATION: 300,

    /** Very short toast duration (ms) - for quick confirmations */
    SHORT_DURATION: 1500,

    /** Quick toast duration (ms) - for simple actions */
    QUICK_DURATION: 2000,

    /** Medium toast duration (ms) - for important info */
    MEDIUM_DURATION: 2500,

    /** Default toast display duration (ms) - standard notifications */
    DEFAULT_DURATION: 3000,

    /** Error toast display duration (ms) - errors need more time */
    ERROR_DURATION: 5000,

    /** Long toast duration (ms) - for processes that take time */
    LONG_DURATION: 10000
};

/**
 * Modal Settings
 */
export const MODAL = {
    /** Modal animation duration (ms) */
    ANIMATION_DURATION: 100,

    /** Modal z-index */
    Z_INDEX: 1000
};

/**
 * Layout Settings
 */
export const LAYOUT = {
    /** Layout adjustment delay (ms) */
    ADJUSTMENT_DELAY: 300,

    /** Sidebar transition duration (ms) */
    SIDEBAR_TRANSITION: 300
};

/**
 * Export default configuration object
 */
export default {
    INPUT_CONSTRAINTS,
    BALANCE_DISPLAY,
    ANIMATION,
    DEBOUNCE,
    TOAST,
    MODAL,
    LAYOUT
};
