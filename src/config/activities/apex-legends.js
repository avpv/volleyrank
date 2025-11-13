// src/config/activities/apex-legends.js
// Apex Legends activity configuration

/**
 * Apex Legends configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'Apex Legends',

    // Activity metadata
    activityType: 'esport',
    teamSize: 3,
    description: 'Apex Legends team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'IGL': 'IGL/Recon',
        'FRAG': 'Fragger/Assault',
        'SUP': 'Support/Controller'
    },

    // Position weights for team balancing
    positionWeights: {
        'IGL': 1.0,
        'FRAG': 1.0,
        'SUP': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['IGL', 'FRAG', 'SUP'],

    // Default team composition (3-player team)
    defaultComposition: {
        'IGL': 1,  // 1 IGL/Recon
        'FRAG': 1, // 1 Fragger/Assault
        'SUP': 1   // 1 Support/Controller
    }
    // Total team size: 3 players
};
