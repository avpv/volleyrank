// src/config/activities/wild-rift.js
// Wild Rift activity configuration

/**
 * Wild Rift configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'Wild Rift',

    // Activity metadata
    activityType: 'esport',
    teamSize: 5,
    description: 'Wild Rift team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'BARON': 'Baron Lane',
        'JGL': 'Jungle',
        'MID': 'Mid Lane',
        'DRAGON': 'Dragon Lane',
        'SUP': 'Support'
    },

    // Position weights for team balancing
    positionWeights: {
        'BARON': 1.0,
        'JGL': 1.0,
        'MID': 1.0,
        'DRAGON': 1.0,
        'SUP': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['BARON', 'JGL', 'MID', 'DRAGON', 'SUP'],

    // Default team composition (5-player team)
    defaultComposition: {
        'BARON': 1,   // 1 Baron Laner
        'JGL': 1,     // 1 Jungler
        'MID': 1,     // 1 Mid Laner
        'DRAGON': 1,  // 1 Dragon Laner
        'SUP': 1      // 1 Support
    }
    // Total team size: 5 players
};
