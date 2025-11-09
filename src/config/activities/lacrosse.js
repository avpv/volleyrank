// src/config/activities/lacrosse.js
// Lacrosse activity configuration

/**
 * Lacrosse configuration for team optimizer
 * Defines positions, weights, and default team composition (10-player)
 */
export default {
    name: 'Lacrosse',

    // Activity metadata
    activityType: 'sport',
    teamSize: 10,
    description: 'Lacrosse team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'G': 'Goalie',
        'D': 'Defenseman',
        'LSM': 'Long Stick Middie',
        'M': 'Midfielder',
        'A': 'Attack'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'G': 1.0,   // Goalie
        'LSM': 1.0, // Long Stick Middie
        'M': 1.0,    // Midfielder
        'A': 1.0,    // Attack
        'D': 1.0     // Defenseman
    },

    // Order in which positions should be displayed
    positionOrder: ['G', 'D', 'LSM', 'M', 'A'],

    // Default team composition (10-player lacrosse)
    defaultComposition: {
        'G': 1,   // 1 Goalie
        'D': 2,   // 2 Defensemen
        'LSM': 1, // 1 Long Stick Middie
        'M': 3,   // 3 Midfielders
        'A': 3    // 3 Attack
    }
    // Total team size: 10 players
};
