// src/config/activities/pubg-mobile.js
// PUBG Mobile activity configuration

/**
 * PUBG Mobile configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'PUBG Mobile',

    // Activity metadata
    activityType: 'esport',
    teamSize: 4,
    description: 'PUBG Mobile team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'IGL': 'In-Game Leader',
        'FRAG': 'Fragger',
        'SCOUT': 'Scout',
        'SUP': 'Support'
    },

    // Position weights for team balancing
    positionWeights: {
        'IGL': 1.0,
        'FRAG': 1.0,
        'SCOUT': 1.0,
        'SUP': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['IGL', 'FRAG', 'SCOUT', 'SUP'],

    // Default team composition (4-player team)
    defaultComposition: {
        'IGL': 1,   // 1 IGL
        'FRAG': 1,  // 1 Fragger
        'SCOUT': 1, // 1 Scout
        'SUP': 1    // 1 Support
    }
    // Total team size: 4 players
};
