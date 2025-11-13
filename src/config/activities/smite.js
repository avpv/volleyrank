// src/config/activities/smite.js
// SMITE activity configuration

/**
 * SMITE configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'SMITE',

    // Activity metadata
    activityType: 'esport',
    teamSize: 5,
    description: 'SMITE team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'SOLO': 'Solo Lane',
        'JGL': 'Jungle',
        'MID': 'Mid Lane',
        'CARRY': 'Carry',
        'SUP': 'Support'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'SOLO': 1.1,   // Solo Lane - frontline warrior
        'JGL': 1.3,    // Jungle - ganking and objective control
        'MID': 1.2,    // Mid Lane - burst mage
        'CARRY': 1.2,  // Carry - main damage dealer
        'SUP': 1.15    // Support - guardian and protection
    },

    // Order in which positions should be displayed
    positionOrder: ['SOLO', 'JGL', 'MID', 'CARRY', 'SUP'],

    // Default team composition (5-player team)
    defaultComposition: {
        'SOLO': 1,   // 1 Solo Laner
        'JGL': 1,    // 1 Jungler
        'MID': 1,    // 1 Mid Laner
        'CARRY': 1,  // 1 Carry
        'SUP': 1     // 1 Support
    }
    // Total team size: 5 players
};
