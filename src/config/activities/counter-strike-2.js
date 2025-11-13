// src/config/activities/counter-strike-2.js
// Counter-Strike 2 activity configuration

/**
 * Counter-Strike 2 configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'Counter-Strike 2',

    // Activity metadata
    activityType: 'esport',
    teamSize: 5,
    description: 'Counter-Strike 2 team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'ENTRY': 'Entry Fragger',
        'LURK': 'Lurker',
        'AWP': 'AWPer',
        'IGL': 'In-Game Leader',
        'SUP': 'Support'
    },

    // Position weights for team balancing
    positionWeights: {
        'ENTRY': 1.0,
        'LURK': 1.0,
        'AWP': 1.0,
        'IGL': 1.0,
        'SUP': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['ENTRY', 'LURK', 'AWP', 'IGL', 'SUP'],

    // Default team composition (5-player team)
    defaultComposition: {
        'ENTRY': 1,  // 1 Entry Fragger
        'LURK': 1,   // 1 Lurker
        'AWP': 1,    // 1 AWPer
        'IGL': 1,    // 1 IGL
        'SUP': 1     // 1 Support
    }
    // Total team size: 5 players
};
