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
        'DPS': 'DPS',
        'SUP': 'Support'
    },

    // Position weights for team balancing
    positionWeights: {
        'TANK': 1.0,
        'DPS': 1.0,
        'SUP': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['TANK', 'DPS', 'SUP'],

    // Default team composition (5-player team: 1-2-2)
    defaultComposition: {
        'TANK': 1,  // 1 Tank
        'DPS': 2,   // 2 DPS
        'SUP': 2    // 2 Supports
    }
    // Total team size: 5 players (1 Tank, 2 DPS, 2 Supports)
};
