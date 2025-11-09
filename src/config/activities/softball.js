// src/config/activities/softball.js
// Softball activity configuration

/**
 * Softball configuration for team optimizer
 * Defines positions, weights, and default team composition (9-player)
 */
export default {
    name: 'Softball',

    // Activity metadata
    activityType: 'sport',
    teamSize: 9,
    description: 'Softball team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'P': 'Pitcher',
        'C': 'Catcher',
        '1B': 'First Base',
        '2B': 'Second Base',
        '3B': 'Third Base',
        'SS': 'Shortstop',
        'LF': 'Left Field',
        'CF': 'Center Field',
        'RF': 'Right Field'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'P': 1.0,    // Pitcher is most critical
        'C': 1.0,    // Catcher
        'SS': 1.0,  // Shortstop
        '2B': 1.0,   // Second Base
        '3B': 1.0,  // Third Base
        '1B': 1.0,   // First Base
        'CF': 1.0,   // Center Field
        'LF': 1.0,   // Left Field
        'RF': 1.0    // Right Field
    },

    // Order in which positions should be displayed
    positionOrder: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'],

    // Default team composition (9-player softball)
    defaultComposition: {
        'P': 1,   // 1 Pitcher
        'C': 1,   // 1 Catcher
        '1B': 1,  // 1 First Base
        '2B': 1,  // 1 Second Base
        '3B': 1,  // 1 Third Base
        'SS': 1,  // 1 Shortstop
        'LF': 1,  // 1 Left Field
        'CF': 1,  // 1 Center Field
        'RF': 1   // 1 Right Field
    }
    // Total team size: 9 players
};
