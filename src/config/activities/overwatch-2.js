// src/config/activities/overwatch-2.js
// Overwatch 2 activity configuration

/**
 * Overwatch 2 configuration for team optimizer
 * Defines positions, weights, and default team composition (5v5 format)
 */
export default {
    name: 'Overwatch 2',

    // Activity metadata
    activityType: 'esport',
    teamSize: 5,
    description: 'Overwatch 2 team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'TANK': 'Tank',
        'DPS1': 'DPS 1',
        'DPS2': 'DPS 2',
        'SUP1': 'Support 1',
        'SUP2': 'Support 2'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'TANK': 1.3,  // Tank - frontline and space creation (critical in 5v5)
        'DPS1': 1.2,  // DPS 1 - primary damage dealer
        'DPS2': 1.2,  // DPS 2 - secondary damage dealer
        'SUP1': 1.2,  // Support 1 - healing and utility
        'SUP2': 1.2   // Support 2 - healing and utility
    },

    // Order in which positions should be displayed
    positionOrder: ['TANK', 'DPS1', 'DPS2', 'SUP1', 'SUP2'],

    // Default team composition (5-player team: 1-2-2)
    defaultComposition: {
        'TANK': 1,  // 1 Tank
        'DPS1': 1,  // 1 DPS
        'DPS2': 1,  // 1 DPS
        'SUP1': 1,  // 1 Support
        'SUP2': 1   // 1 Support
    }
    // Total team size: 5 players (1 Tank, 2 DPS, 2 Supports)
};
