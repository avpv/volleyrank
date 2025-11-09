// src/config/activities/water-polo.js
// Water Polo activity configuration

/**
 * Water Polo configuration for team optimizer
 * Defines positions, weights, and default team composition (7-player)
 */
export default {
    name: 'Water Polo',

    // Activity metadata
    activityType: 'sport',
    teamSize: 7,
    description: 'Water Polo team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'GK': 'Goalkeeper',
        'CF': 'Center Forward',
        'CD': 'Center Defender',
        'LW': 'Left Wing',
        'RW': 'Right Wing',
        'LD': 'Left Driver',
        'RD': 'Right Driver'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'GK': 1.0,  // Goalkeeper
        'CF': 1.0,   // Center Forward - hole set
        'CD': 1.0,  // Center Defender
        'LD': 1.0,   // Left Driver
        'RD': 1.0,   // Right Driver
        'LW': 1.0,  // Left Wing
        'RW': 1.0   // Right Wing
    },

    // Order in which positions should be displayed
    positionOrder: ['GK', 'CF', 'CD', 'LW', 'RW', 'LD', 'RD'],

    // Default team composition (7-player water polo)
    defaultComposition: {
        'GK': 1,  // 1 Goalkeeper
        'CF': 1,  // 1 Center Forward
        'CD': 1,  // 1 Center Defender
        'LW': 1,  // 1 Left Wing
        'RW': 1,  // 1 Right Wing
        'LD': 1,  // 1 Left Driver
        'RD': 1   // 1 Right Driver
    }
    // Total team size: 7 players
};
