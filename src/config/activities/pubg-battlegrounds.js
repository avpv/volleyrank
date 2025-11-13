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
    // Higher weight = more important position
    positionWeights: {
        'IGL': 1.3,   // IGL - strategic caller and decision maker
        'SCOUT': 1.2, // Scout - information and rotation planning
        'SUP': 1.15,  // Support - utility and backup
        'FRAG': 1.2   // Fragger - main kill pressure
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
