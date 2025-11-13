// src/config/activities/mobile-legends.js
// Mobile Legends: Bang Bang activity configuration

/**
 * Mobile Legends: Bang Bang configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'Mobile Legends: Bang Bang',

    // Activity metadata
    activityType: 'esport',
    teamSize: 5,
    description: 'Mobile Legends: Bang Bang team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'GOLD': 'Gold Lane',
        'EXP': 'EXP Lane',
        'MID': 'Mid Lane',
        'JGL': 'Jungle',
        'ROAM': 'Roam'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'GOLD': 1.2,  // Gold Lane - main damage dealer
        'EXP': 1.15,  // EXP Lane - frontline and initiator
        'MID': 1.2,   // Mid Lane - burst damage and wave clear
        'JGL': 1.3,   // Jungle - objective control and ganking
        'ROAM': 1.15  // Roam - vision and team support
    },

    // Order in which positions should be displayed
    positionOrder: ['GOLD', 'EXP', 'MID', 'JGL', 'ROAM'],

    // Default team composition (5-player team)
    defaultComposition: {
        'GOLD': 1,  // 1 Gold Laner
        'EXP': 1,   // 1 EXP Laner
        'MID': 1,   // 1 Mid Laner
        'JGL': 1,   // 1 Jungler
        'ROAM': 1   // 1 Roamer
    }
    // Total team size: 5 players
};
