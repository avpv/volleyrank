// src/config/activities/rainbow-six-siege.js
// Tom Clancy's Rainbow Six Siege activity configuration

/**
 * Rainbow Six Siege configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: "Tom Clancy's Rainbow Six Siege",

    // Activity metadata
    activityType: 'esport',
    teamSize: 5,
    description: "Rainbow Six Siege team building and player ranking",

    // Position abbreviations and full names
    positions: {
        'ENTRY': 'Entry Fragger',
        'BREACH': 'Hard Breacher',
        'SUP': 'Support',
        'FLEX': 'Flex',
        'ANCHOR': 'Roamer/Anchor'
    },

    // Position weights for team balancing
    positionWeights: {
        'ENTRY': 1.0,
        'BREACH': 1.0,
        'SUP': 1.0,
        'FLEX': 1.0,
        'ANCHOR': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['ENTRY', 'BREACH', 'SUP', 'FLEX', 'ANCHOR'],

    // Default team composition (5-player team)
    defaultComposition: {
        'ENTRY': 1,   // 1 Entry Fragger
        'BREACH': 1,  // 1 Hard Breacher
        'SUP': 1,     // 1 Support
        'FLEX': 1,    // 1 Flex
        'ANCHOR': 1   // 1 Roamer/Anchor
    }
    // Total team size: 5 players
};
