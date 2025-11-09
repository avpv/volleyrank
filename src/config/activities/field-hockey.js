// src/config/activities/field-hockey.js
// Field Hockey activity configuration

/**
 * Field Hockey configuration for team optimizer
 * Defines positions, weights, and default team composition (11-player)
 */
export default {
    name: 'Field Hockey',

    // Activity metadata
    activityType: 'sport',
    teamSize: 11,
    description: 'Field Hockey team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'GK': 'Goalkeeper',
        'FB': 'Fullback',
        'HB': 'Halfback',
        'W': 'Winger',
        'IF': 'Inside Forward',
        'CF': 'Center Forward'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'GK': 1.0,  // Goalkeeper
        'CF': 1.0,  // Center Forward
        'HB': 1.0,   // Halfback
        'FB': 1.0,   // Fullback
        'IF': 1.0,  // Inside Forward
        'W': 1.0     // Winger
    },

    // Order in which positions should be displayed
    positionOrder: ['GK', 'FB', 'HB', 'W', 'IF', 'CF'],

    // Default team composition (11-player field hockey)
    defaultComposition: {
        'GK': 1,  // 1 Goalkeeper
        'FB': 2,  // 2 Fullbacks
        'HB': 3,  // 3 Halfbacks
        'W': 2,   // 2 Wingers
        'IF': 2,  // 2 Inside Forwards
        'CF': 1   // 1 Center Forward
    }
    // Total team size: 11 players
};
