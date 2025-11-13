// src/config/activities/fortnite.js
// Fortnite (Competitive) activity configuration

/**
 * Fortnite configuration for team optimizer
 * Defines positions, weights, and default team composition (Squad format)
 */
export default {
    name: 'Fortnite (Competitive)',

    // Activity metadata
    activityType: 'esport',
    teamSize: 4,
    description: 'Fortnite competitive team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'FRAG': 'Frag',
        'SUPPORT': 'Support',
        'IGL': 'IGL',
        'ANCHOR': 'Anchor'
    },

    // Position weights for team balancing
    positionWeights: {
        'FRAG': 1.0,
        'SUPPORT': 1.0,
        'IGL': 1.0,
        'ANCHOR': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['FRAG', 'SUPPORT', 'IGL', 'ANCHOR'],

    // Default team composition (4-player squad)
    defaultComposition: {
        'FRAG': 1,     // 1 Frag
        'SUPPORT': 1,  // 1 Support
        'IGL': 1,      // 1 IGL
        'ANCHOR': 1    // 1 Anchor
    }
    // Total team size: 4 players (squad format)
};
