// src/config/activities/basketball.js
// Basketball activity configuration

/**
 * Basketball configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'Basketball',

    // Activity metadata
    activityType: 'sport',
    teamSize: 5,
    description: 'Basketball team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'PG': 'Point Guard',
        'SG': 'Shooting Guard',
        'SF': 'Small Forward',
        'PF': 'Power Forward',
        'C': 'Center'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'PG': 1.0,  // Point Guard - floor general
        'SG': 1.0,  // Shooting Guard
        'SF': 1.0,   // Small Forward - versatile
        'PF': 1.0,   // Power Forward
        'C': 1.0     // Center - rim protector
    },

    // Order in which positions should be displayed
    positionOrder: ['PG', 'SG', 'SF', 'PF', 'C'],

    // Default team composition (5-player basketball)
    defaultComposition: {
        'PG': 1,  // 1 Point Guard
        'SG': 1,  // 1 Shooting Guard
        'SF': 1,  // 1 Small Forward
        'PF': 1,  // 1 Power Forward
        'C': 1    // 1 Center
    }
    // Total team size: 5 players
};
