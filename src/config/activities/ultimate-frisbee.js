// src/config/activities/ultimate-frisbee.js
// Ultimate Frisbee activity configuration

/**
 * Ultimate Frisbee configuration for team optimizer
 * Defines positions, weights, and default team composition (7-player)
 */
export default {
    name: 'Ultimate Frisbee',

    // Activity metadata
    activityType: 'sport',
    teamSize: 7,
    description: 'Ultimate Frisbee team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'HAND': 'Handler',
        'CUT': 'Cutter',
        'DEEP': 'Deep',
        'MID': 'Mid'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'HAND': 1.0,  // Handler - primary thrower
        'CUT': 1.0,    // Cutter
        'DEEP': 1.0,  // Deep
        'MID': 1.0    // Mid
    },

    // Order in which positions should be displayed
    positionOrder: ['HAND', 'CUT', 'MID', 'DEEP'],

    // Default team composition (7-player ultimate)
    defaultComposition: {
        'HAND': 2,  // 2 Handlers
        'CUT': 2,   // 2 Cutters
        'MID': 2,   // 2 Mids
        'DEEP': 1   // 1 Deep
    }
    // Total team size: 7 players
};
