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
    // Higher weight = more important position
    positionWeights: {
        'ENTRY': 1.2,  // Entry Fragger - opening kills
        'LURK': 1.15,  // Lurker - flanking and map control
        'AWP': 1.3,    // AWPer - high impact weapon specialist
        'IGL': 1.25,   // IGL - strategy and calling
        'SUP': 1.15    // Support - utility and trade fragging
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
