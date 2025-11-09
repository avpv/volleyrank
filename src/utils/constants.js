// src/utils/constants.js

/**
 * Application Constants
 *
 * IMPORTANT: Rating-related constants have been moved to config/rating.js
 * IMPORTANT: Position constants should use config/volleyball.js
 */

import ratingConfig from '../config/rating.js';

export const APP_VERSION = '4.0.0';
export const APP_NAME = 'VolleyRank';

// DEPRECATED: Use volleyballConfig.positions from config/volleyball.js instead
// These constants are kept for backwards compatibility only
// Import: import volleyballConfig from '../config/volleyball.js';
export const POSITIONS = {
    S: 'Setter',
    OPP: 'Opposite',
    OH: 'Outside Hitter',
    MB: 'Middle Blocker',
    L: 'Libero'
};

export const POSITION_KEYS = Object.keys(POSITIONS);

// Rating constants - imported from centralized config
// DEPRECATED: Import directly from config/rating.js instead
export const DEFAULT_RATING = ratingConfig.RATING_CONSTANTS.DEFAULT;
export const MIN_RATING = ratingConfig.RATING_CONSTANTS.MIN;
export const MAX_RATING = ratingConfig.RATING_CONSTANTS.MAX;

export const ROUTES = {
    HOME: '/',
    SETTINGS: '/',
    COMPARE: '/compare/',
    RANKINGS: '/rankings/',
    TEAMS: '/teams/'
};

export const STORAGE_KEYS = {
    STATE: 'app_state',
    SETTINGS: 'app_settings'
};

export const EVENTS = {
    // State events
    STATE_LOADED: 'state:loaded',
    STATE_SAVED: 'state:saved',
    STATE_CHANGED: 'state:changed',
    STATE_RESET: 'state:reset',
    STATE_MIGRATED: 'state:migrated',
    STATE_IMPORTED: 'state:imported',
    
    // Player events
    PLAYER_ADDED: 'player:added',
    PLAYER_REMOVED: 'player:removed',
    PLAYER_UPDATED: 'player:updated',
    PLAYER_RESET: 'player:reset',
    
    // Comparison events
    COMPARISON_COMPLETED: 'comparison:completed',
    COMPARISON_RESET_ALL: 'comparison:reset-all',
    
    // Route events
    ROUTE_CHANGED: 'route:changed',
    ROUTE_BEFORE_CHANGE: 'route:before-change',
    ROUTE_ERROR: 'route:error'
};

export const VALIDATION = {
    MAX_NAME_LENGTH: 50,
    MAX_POSITIONS_PER_PLAYER: 3,
    MIN_PLAYERS_FOR_COMPARISON: 2,
    MIN_TEAMS: 1,
    MAX_TEAMS: 10
};

export default {
    APP_VERSION,
    APP_NAME,
    POSITIONS,
    POSITION_KEYS,
    DEFAULT_RATING,
    ROUTES,
    STORAGE_KEYS,
    EVENTS,
    VALIDATION
};
