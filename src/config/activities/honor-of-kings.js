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
    // Higher weight = more important position
    positionWeights: {
        'SOLO': 1.1,  // Solo Lane - frontline and tankiness
        'JGL': 1.3,   // Jungle - objective and gank control
        'MID': 1.2,   // Mid Lane - burst damage and rotation
        'FARM': 1.2,  // Farm Lane - sustained damage dealer
        'ROAM': 1.15  // Roam/Support - vision and initiation
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
