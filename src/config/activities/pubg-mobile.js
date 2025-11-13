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
    // Higher weight = more important position
    positionWeights: {
        'IGL': 1.3,   // IGL - strategic caller and decision maker
        'FRAG': 1.2,  // Fragger - main kill pressure
        'SCOUT': 1.2, // Scout - information and positioning
        'SUP': 1.15   // Support - utility and backup
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
