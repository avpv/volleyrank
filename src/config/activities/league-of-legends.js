// src/config/activities/league-of-legends.js
// League of Legends activity configuration

/**
 * League of Legends configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'League of Legends',

    // Activity metadata
    activityType: 'esport',
    teamSize: 5,
    description: 'League of Legends team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'TOP': 'Top Lane',
        'JGL': 'Jungle',
        'MID': 'Mid Lane',
        'ADC': 'ADC',
        'SUP': 'Support'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'TOP': 1.1,  // Top Lane - split pusher/team fighter
        'JGL': 1.3,  // Jungle - map control and objective control
        'MID': 1.2,  // Mid Lane - central carry position
        'ADC': 1.2,  // ADC - main damage dealer
        'SUP': 1.15  // Support - vision and utility
    },

    // Order in which positions should be displayed
    positionOrder: ['TOP', 'JGL', 'MID', 'ADC', 'SUP'],

    // Default team composition (5-player team)
    defaultComposition: {
        'TOP': 1,  // 1 Top Laner
        'JGL': 1,  // 1 Jungler
        'MID': 1,  // 1 Mid Laner
        'ADC': 1,  // 1 ADC
        'SUP': 1   // 1 Support
    }
    // Total team size: 5 players
};
