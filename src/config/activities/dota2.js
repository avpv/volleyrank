// src/config/activities/dota2.js
// Dota 2 activity configuration

/**
 * Dota 2 configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'Dota 2',

    // Activity metadata
    activityType: 'esport',
    teamSize: 5,
    description: 'Dota 2 team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'CARRY': 'Carry',
        'MID': 'Mid',
        'OFF': 'Offlane',
        'SSUP': 'Soft Support',
        'HSUP': 'Hard Support'
    },

    // Position weights for team balancing
    positionWeights: {
        'CARRY': 1.0,
        'MID': 1.0,
        'OFF': 1.0,
        'SSUP': 1.0,
        'HSUP': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['CARRY', 'MID', 'OFF', 'SSUP', 'HSUP'],

    // Default team composition (5-player team)
    defaultComposition: {
        'CARRY': 1,  // 1 Carry
        'MID': 1,    // 1 Mid
        'OFF': 1,    // 1 Offlane
        'SSUP': 1,   // 1 Soft Support
        'HSUP': 1    // 1 Hard Support
    }
    // Total team size: 5 players
};
