// src/config/activities/dota2.js
// Dota 2 activity configuration

/**
 * Dota 2 configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'Dota 2',

    // Activity metadata
    activityType: 'esport',
    teamSize: 5,
    description: 'Dota 2 team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'POS1': 'Carry',
        'POS2': 'Mid',
        'POS3': 'Offlane',
        'POS4': 'Soft Support',
        'POS5': 'Hard Support'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'POS1': 1.2,  // Carry - late game win condition
        'POS2': 1.25, // Mid - tempo and playmaker
        'POS3': 1.15, // Offlane - space creator and initiator
        'POS4': 1.2,  // Soft Support - roaming and vision
        'POS5': 1.2   // Hard Support - lane babysitter and ward placer
    },

    // Order in which positions should be displayed
    positionOrder: ['POS1', 'POS2', 'POS3', 'POS4', 'POS5'],

    // Default team composition (5-player team)
    defaultComposition: {
        'POS1': 1,  // 1 Carry
        'POS2': 1,  // 1 Mid
        'POS3': 1,  // 1 Offlane
        'POS4': 1,  // 1 Soft Support
        'POS5': 1   // 1 Hard Support
    }
    // Total team size: 5 players
};
