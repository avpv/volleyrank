// src/config/activities/valorant.js
// Valorant activity configuration

/**
 * Valorant configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'Valorant',

    // Activity metadata
    activityType: 'esport',
    teamSize: 5,
    description: 'Valorant team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'DUEL': 'Duelist',
        'INIT': 'Initiator',
        'CTRL': 'Controller',
        'SENT': 'Sentinel',
        'FLEX': 'Flex/IGL'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'DUEL': 1.2,  // Duelist - entry fragger
        'INIT': 1.2,  // Initiator - information gatherer
        'CTRL': 1.25, // Controller - map control (smoke)
        'SENT': 1.15, // Sentinel - site anchor and defense
        'FLEX': 1.2   // Flex/IGL - adaptable player/caller
    },

    // Order in which positions should be displayed
    positionOrder: ['DUEL', 'INIT', 'CTRL', 'SENT', 'FLEX'],

    // Default team composition (5-player team)
    defaultComposition: {
        'DUEL': 1,  // 1 Duelist
        'INIT': 1,  // 1 Initiator
        'CTRL': 1,  // 1 Controller
        'SENT': 1,  // 1 Sentinel
        'FLEX': 1   // 1 Flex/IGL
    }
    // Total team size: 5 players
};
