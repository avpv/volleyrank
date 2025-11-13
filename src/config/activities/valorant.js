// src/config/activities/valorant.js
// Valorant activity configuration

/**
 * Valorant configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'Valorant',

    // Activity metadata
    activityType: 'esport',
    teamSize: 5,
    description: 'Valorant team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'DUEL': 'Duelist',
        'INIT': 'Initiator',
        'CTRL': 'Controller',
        'SENT': 'Sentinel',
        'FLEX': 'Flex/IGL'
    },

    // Position weights for team balancing
    positionWeights: {
        'DUEL': 1.0,
        'INIT': 1.0,
        'CTRL': 1.0,
        'SENT': 1.0,
        'FLEX': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['DUEL', 'INIT', 'CTRL', 'SENT', 'FLEX'],

    // Default team composition (5-player team)
    defaultComposition: {
        'DUEL': 1,  // 1 Duelist
        'INIT': 1,  // 1 Initiator
        'CTRL': 1,  // 1 Controller
        'SENT': 1,  // 1 Sentinel
        'FLEX': 1   // 1 Flex/IGL
    }
    // Total team size: 5 players
};
