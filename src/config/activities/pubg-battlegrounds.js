// src/config/activities/pubg-battlegrounds.js
// PUBG: Battlegrounds activity configuration

/**
 * PUBG: Battlegrounds configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'PUBG: Battlegrounds',

    // Activity metadata
    activityType: 'esport',
    teamSize: 4,
    description: 'PUBG: Battlegrounds team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'IGL': 'In-Game Leader',
        'SCOUT': 'Scout',
        'SUP': 'Support',
        'FRAG': 'Fragger'
    },

    // Position weights for team balancing
    positionWeights: {
        'IGL': 1.0,
        'SCOUT': 1.0,
        'SUP': 1.0,
        'FRAG': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['IGL', 'SCOUT', 'SUP', 'FRAG'],

    // Default team composition (4-player team)
    defaultComposition: {
        'IGL': 1,   // 1 IGL
        'SCOUT': 1, // 1 Scout
        'SUP': 1,   // 1 Support
        'FRAG': 1   // 1 Fragger
    }
    // Total team size: 4 players
};
