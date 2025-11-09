/**
 * Rating System Configuration
 * Centralized configuration for ELO rating calculations and thresholds
 *
 * This file provides a single source of truth for all rating-related constants
 * across the application, ensuring consistency and ease of modification.
 */

/**
 * Core Rating Constants
 * Default values for player ratings and boundaries
 */
export const RATING_CONSTANTS = {
    /** Default starting rating for new players */
    DEFAULT: 1500,

    /** Minimum possible rating value */
    MIN: 0,

    /** Maximum possible rating value */
    MAX: 3000,

    /** Rating difference formula divisor (standard ELO) */
    RATING_DIVISOR: 400,

    /** Base for probability calculation (standard ELO) */
    PROBABILITY_BASE: 10
};

/**
 * K-Factor Configuration
 * Controls rating volatility based on experience and skill level
 */
export const K_FACTORS = {
    /** Base K-factor for experienced players */
    BASE: 30,

    /** High K-factor for new players (< 20 comparisons) */
    NOVICE: 40,

    /** Low K-factor for masters (> 2000 rating, > 50 comparisons) */
    MASTER: 15,

    /** Low K-factor for experts (> 1800 rating, > 30 comparisons) */
    EXPERT: 20,

    /** Experience thresholds */
    THRESHOLDS: {
        /** Comparisons threshold for novice/experienced split */
        NOVICE_COMPARISONS: 20,

        /** Comparisons threshold for expert level */
        EXPERT_COMPARISONS: 30,

        /** Comparisons threshold for master level */
        MASTER_COMPARISONS: 50,

        /** Rating threshold for expert level */
        EXPERT_RATING: 1800,

        /** Rating threshold for master level */
        MASTER_RATING: 2000
    }
};

/**
 * Pool Adjustment Configuration
 * Adjusts K-factors based on position pool size for fairness
 */
export const POOL_ADJUSTMENT = {
    /** Reference pool size for baseline adjustments */
    REFERENCE_SIZE: 15,

    /** Minimum adjustment factor (prevents over-dampening) */
    MIN_FACTOR: 0.5,

    /** Maximum adjustment factor (prevents over-inflation) */
    MAX_FACTOR: 2.0,

    /** Enable/disable pool size adjustments */
    ENABLED: true
};

/**
 * Balance Thresholds
 * Defines what constitutes balanced teams or matchups
 */
export const BALANCE_THRESHOLDS = {
    /** Rating difference for "balanced" 1v1 matchup */
    MATCHUP_BALANCED: 200,

    /** Maximum weighted rating difference for balanced teams */
    TEAM_BALANCED: 350,

    /** Thresholds for balance quality indicators */
    QUALITY: {
        /** Excellent balance (very close teams) */
        EXCELLENT: 100,

        /** Good balance */
        GOOD: 200,

        /** Fair balance */
        FAIR: 300,

        /** Poor balance (approaching threshold) */
        POOR: 500
    }
};

/**
 * Confidence Level Configuration
 * Determines confidence in rating accuracy based on comparison count
 */
export const CONFIDENCE_LEVELS = {
    /** Minimum comparisons percentage for each confidence level */
    VERY_LOW: 0,   // < 20% of possible comparisons
    LOW: 20,       // 20-39% of possible comparisons
    MEDIUM: 40,    // 40-59% of possible comparisons
    HIGH: 60,      // 60-79% of possible comparisons
    VERY_HIGH: 80  // >= 80% of possible comparisons
};

/**
 * Percentile Calculation Settings
 * Configuration for ranking players within position pools
 */
export const PERCENTILE_CONFIG = {
    /** Top percentile value (best player) */
    TOP: 100,

    /** Bottom percentile value (lowest player) */
    BOTTOM: 0,

    /** Enable percentile caching for performance */
    CACHE_ENABLED: false
};

/**
 * Export default configuration object
 * Provides all rating configuration in one place
 */
export default {
    RATING_CONSTANTS,
    K_FACTORS,
    POOL_ADJUSTMENT,
    BALANCE_THRESHOLDS,
    CONFIDENCE_LEVELS,
    PERCENTILE_CONFIG,

    // Legacy compatibility exports
    DEFAULT_RATING: RATING_CONSTANTS.DEFAULT,
    MIN_RATING: RATING_CONSTANTS.MIN,
    MAX_RATING: RATING_CONSTANTS.MAX,
    BASE_K_FACTOR: K_FACTORS.BASE
};
