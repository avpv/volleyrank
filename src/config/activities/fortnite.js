// src/config/activities/fortnite.js
// Fortnite (Competitive) activity configuration

/**
 * Fortnite configuration for team optimizer
 * Defines positions, weights, and default team composition (Trio format)
 */
export default {
    name: 'Fortnite (Competitive)',

    // Activity metadata
    activityType: 'esport',
    teamSize: 3,
    description: 'Fortnite competitive team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'FRAG': 'Fragger',
        'IGL': 'IGL/Support',
        'ANCHOR': 'Anchor'
    },

    // Position weights for team balancing
    positionWeights: {
        'FRAG': 1.0,
        'IGL': 1.0,
        'ANCHOR': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['FRAG', 'IGL', 'ANCHOR'],

    // Default team composition (3-player trio)
    defaultComposition: {
        'FRAG': 1,   // 1 Fragger
        'IGL': 1,    // 1 IGL/Support
        'ANCHOR': 1  // 1 Anchor
    }
    // Total team size: 3 players (common competitive trio format)
};
