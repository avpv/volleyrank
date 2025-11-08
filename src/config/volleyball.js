// src/config/volleyball.js
// Volleyball activity configuration for team-optimizer
// Source: https://github.com/avpv/team-optimizer/blob/main/examples/configs/volleyball.js

/**
 * Volleyball configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'Volleyball',

    // Position abbreviations and full names
    positions: {
        'S': 'Setter',
        'OPP': 'Opposite',
        'OH': 'Outside Hitter',
        'MB': 'Middle Blocker',
        'L': 'Libero'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'S': 1.3,    // Setter is most important
        'OPP': 1.2,  // Opposite
        'OH': 1.15,  // Outside Hitter
        'MB': 1.1,   // Middle Blocker
        'L': 1.0     // Libero
    },

    // Order in which positions should be displayed
    positionOrder: ['S', 'OPP', 'OH', 'MB', 'L'],

    // Default team composition (6-player volleyball)
    defaultComposition: {
        'S': 1,   // 1 Setter
        'OPP': 1, // 1 Opposite
        'OH': 2,  // 2 Outside Hitters
        'MB': 2,  // 2 Middle Blockers
        'L': 1    // 1 Libero
    }
    // Total team size: 7 players
};
