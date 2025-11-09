// src/config/activities/ice-hockey.js
// Ice Hockey activity configuration

/**
 * Ice Hockey configuration for team optimizer
 * Defines positions, weights, and default team composition (6-player)
 */
export default {
    name: 'Ice Hockey',

    // Activity metadata
    activityType: 'sport',
    teamSize: 6,
    description: 'Ice Hockey team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'G': 'Goaltender',
        'LD': 'Left Defense',
        'RD': 'Right Defense',
        'LW': 'Left Wing',
        'C': 'Center',
        'RW': 'Right Wing'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'G': 1.0,   // Goaltender is critical
        'C': 1.0,   // Center
        'LD': 1.0,  // Left Defense
        'RD': 1.0,  // Right Defense
        'LW': 1.0, // Left Wing
        'RW': 1.0  // Right Wing
    },

    // Order in which positions should be displayed
    positionOrder: ['G', 'LD', 'RD', 'C', 'LW', 'RW'],

    // Default team composition (6-player ice hockey)
    defaultComposition: {
        'G': 1,   // 1 Goaltender
        'LD': 1,  // 1 Left Defense
        'RD': 1,  // 1 Right Defense
        'C': 1,   // 1 Center
        'LW': 1,  // 1 Left Wing
        'RW': 1   // 1 Right Wing
    }
    // Total team size: 6 players
};
