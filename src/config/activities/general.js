// src/config/activities/general.js
// General activity configuration - universal for any team distribution

/**
 * General/Universal configuration for team optimizer
 * Simple single-position configuration for generic team balancing
 * Use this when you don't need specific positions or roles
 */
export default {
    name: 'General',

    // Activity metadata
    activityType: 'general',
    teamSize: 1,
    description: 'Universal team balancing without specific positions',

    // Position abbreviations and full names
    positions: {
        'PLAYER': 'Player'
    },

    // Position weights for team balancing
    // Equal weight for all players
    positionWeights: {
        'PLAYER': 1.0  // Neutral weight - all players equal
    },

    // Order in which positions should be displayed
    positionOrder: ['PLAYER'],

    // Default team composition (flexible)
    defaultComposition: {
        'PLAYER': 1  // 1 player per position
    }
    // Total team size: Flexible based on number of players
};
