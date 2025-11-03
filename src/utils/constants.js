// src/utils/constants.js

/**
 * Application Constants
 */

export const APP_VERSION = '4.0.0';
export const APP_NAME = 'VolleyRank';

export const POSITIONS = {
    S: 'Setter',
    OPP: 'Opposite',
    OH: 'Outside Hitter',
    MB: 'Middle Blocker',
    L: 'Libero'
};

export const POSITION_KEYS = Object.keys(POSITIONS);

export const DEFAULT_RATING = 1500;
export const MIN_RATING = 0;
export const MAX_RATING = 3000;

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
