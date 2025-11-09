// src/config/activities/soccer.js
// Soccer (Football) activity configuration

/**
 * Soccer configuration for team optimizer
 * Defines positions, weights, and default team composition (5-a-side)
 */
export default {
    name: 'Soccer',

    // Activity metadata
    activityType: 'sport',
    teamSize: 5,
    description: 'Soccer (5-a-side) team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'GK': 'Goalkeeper',
        'DF': 'Defender',
        'MF': 'Midfielder',
        'FW': 'Forward'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'GK': 1.3,   // Goalkeeper is critical
        'DF': 1.15,  // Defender
        'MF': 1.2,   // Midfielder - most versatile
        'FW': 1.1    // Forward
    },

    // Order in which positions should be displayed
    positionOrder: ['GK', 'DF', 'MF', 'FW'],

    // Default team composition (5-a-side soccer)
    defaultComposition: {
        'GK': 1,  // 1 Goalkeeper
        'DF': 1,  // 1 Defender
        'MF': 2,  // 2 Midfielders
        'FW': 1   // 1 Forward
    }
    // Total team size: 5 players
};
