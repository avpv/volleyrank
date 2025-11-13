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
    // Higher weight = more important position
    positionWeights: {
        'BARON': 1.1,   // Baron Lane - split pusher and tank
        'JGL': 1.3,     // Jungle - map control and objectives
        'MID': 1.2,     // Mid Lane - burst and roaming
        'DRAGON': 1.2,  // Dragon Lane - main carry
        'SUP': 1.15     // Support - vision and utility
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
