// src/config/activities/handball.js
// Handball activity configuration

/**
 * Handball configuration for team optimizer
 * Defines positions, weights, and default team composition (7-player)
 */
export default {
    name: 'Handball',

    // Activity metadata
    activityType: 'sport',
    teamSize: 7,
    description: 'Handball team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'GK': 'Goalkeeper',
        'LW': 'Left Wing',
        'RW': 'Right Wing',
        'LB': 'Left Back',
        'CB': 'Center Back',
        'RB': 'Right Back',
        'P': 'Pivot'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'GK': 1.35,  // Goalkeeper
        'CB': 1.25,  // Center Back - playmaker
        'P': 1.2,    // Pivot
        'LB': 1.15,  // Left Back
        'RB': 1.15,  // Right Back
        'LW': 1.1,   // Left Wing
        'RW': 1.1    // Right Wing
    },

    // Order in which positions should be displayed
    positionOrder: ['GK', 'LW', 'LB', 'CB', 'RB', 'RW', 'P'],

    // Default team composition (7-player handball)
    defaultComposition: {
        'GK': 1,  // 1 Goalkeeper
        'LW': 1,  // 1 Left Wing
        'RW': 1,  // 1 Right Wing
        'LB': 1,  // 1 Left Back
        'CB': 1,  // 1 Center Back
        'RB': 1,  // 1 Right Back
        'P': 1    // 1 Pivot
    }
    // Total team size: 7 players
};
