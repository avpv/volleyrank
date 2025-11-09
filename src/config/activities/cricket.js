// src/config/activities/cricket.js
// Cricket activity configuration

/**
 * Cricket configuration for team optimizer
 * Defines positions, weights, and default team composition (11-player)
 */
export default {
    name: 'Cricket',

    // Activity metadata
    activityType: 'sport',
    teamSize: 11,
    description: 'Cricket team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'WK': 'Wicket-keeper',
        'BAT': 'Batsman',
        'AR': 'All-rounder',
        'FAST': 'Fast Bowler',
        'SPIN': 'Spin Bowler'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'WK': 1.3,    // Wicket-keeper
        'AR': 1.25,   // All-rounder - most versatile
        'FAST': 1.2,  // Fast Bowler
        'SPIN': 1.15, // Spin Bowler
        'BAT': 1.1    // Batsman
    },

    // Order in which positions should be displayed
    positionOrder: ['WK', 'BAT', 'AR', 'FAST', 'SPIN'],

    // Default team composition (11-player cricket)
    defaultComposition: {
        'WK': 1,    // 1 Wicket-keeper
        'BAT': 4,   // 4 Batsmen
        'AR': 2,    // 2 All-rounders
        'FAST': 2,  // 2 Fast Bowlers
        'SPIN': 2   // 2 Spin Bowlers
    }
    // Total team size: 11 players
};
