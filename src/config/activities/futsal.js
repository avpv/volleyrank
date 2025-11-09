// src/config/activities/futsal.js
// Futsal activity configuration

/**
 * Futsal configuration for team optimizer
 * Defines positions, weights, and default team composition (5-player)
 */
export default {
    name: 'Futsal',

    // Activity metadata
    activityType: 'sport',
    teamSize: 5,
    description: 'Futsal team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'GK': 'Goalkeeper',
        'FIX': 'Fixo (Defender)',
        'ALA': 'Ala (Winger)',
        'PIV': 'Pivot (Target player)'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'GK': 1.0,   // Goalkeeper
        'PIV': 1.0, // Pivot
        'FIX': 1.0,  // Fixo
        'ALA': 1.0  // Ala
    },

    // Order in which positions should be displayed
    positionOrder: ['GK', 'FIX', 'ALA', 'PIV'],

    // Default team composition (5-player futsal)
    defaultComposition: {
        'GK': 1,   // 1 Goalkeeper
        'FIX': 1,  // 1 Fixo
        'ALA': 2,  // 2 Alas
        'PIV': 1   // 1 Pivot
    }
    // Total team size: 5 players
};
