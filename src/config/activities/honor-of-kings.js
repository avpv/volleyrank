// src/config/activities/honor-of-kings.js
// Honor of Kings activity configuration

/**
 * Honor of Kings configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'Honor of Kings',

    // Activity metadata
    activityType: 'esport',
    teamSize: 5,
    description: 'Honor of Kings team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'SOLO': 'Solo Lane',
        'JGL': 'Jungle',
        'MID': 'Mid Lane',
        'FARM': 'Farm Lane',
        'ROAM': 'Roam/Support'
    },

    // Position weights for team balancing
    positionWeights: {
        'SOLO': 1.0,
        'JGL': 1.0,
        'MID': 1.0,
        'FARM': 1.0,
        'ROAM': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['SOLO', 'JGL', 'MID', 'FARM', 'ROAM'],

    // Default team composition (5-player team)
    defaultComposition: {
        'SOLO': 1,  // 1 Solo Laner
        'JGL': 1,   // 1 Jungler
        'MID': 1,   // 1 Mid Laner
        'FARM': 1,  // 1 Farm Lane
        'ROAM': 1   // 1 Roam/Support
    }
    // Total team size: 5 players
};
