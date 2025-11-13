// src/config/activities/mobile-legends.js
// Mobile Legends: Bang Bang activity configuration

/**
 * Mobile Legends: Bang Bang configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'Mobile Legends: Bang Bang',

    // Activity metadata
    activityType: 'esport',
    teamSize: 5,
    description: 'Mobile Legends: Bang Bang team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'GOLD': 'Gold Lane',
        'EXP': 'EXP Lane',
        'MID': 'Mid Lane',
        'JGL': 'Jungle',
        'ROAM': 'Roam'
    },

    // Position weights for team balancing
    positionWeights: {
        'GOLD': 1.0,
        'EXP': 1.0,
        'MID': 1.0,
        'JGL': 1.0,
        'ROAM': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['GOLD', 'EXP', 'MID', 'JGL', 'ROAM'],

    // Default team composition (5-player team)
    defaultComposition: {
        'GOLD': 1,  // 1 Gold Laner
        'EXP': 1,   // 1 EXP Laner
        'MID': 1,   // 1 Mid Laner
        'JGL': 1,   // 1 Jungler
        'ROAM': 1   // 1 Roamer
    }
    // Total team size: 5 players
};
