// src/config/activities/rocket-league.js
// Rocket League activity configuration

/**
 * Rocket League configuration for team optimizer
 * Defines positions, weights, and default team composition
 */
export default {
    name: 'Rocket League',

    // Activity metadata
    activityType: 'esport',
    teamSize: 3,
    description: 'Rocket League team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'STR': 'Striker',
        'MID': 'Midfielder',
        'DEF': 'Defender/Goalie'
    },

    // Position weights for team balancing
    positionWeights: {
        'STR': 1.0,
        'MID': 1.0,
        'DEF': 1.0
    },

    // Order in which positions should be displayed
    positionOrder: ['STR', 'MID', 'DEF'],

    // Default team composition (3-player team)
    defaultComposition: {
        'STR': 1,  // 1 Striker
        'MID': 1,  // 1 Midfielder
        'DEF': 1   // 1 Defender/Goalie
    }
    // Total team size: 3 players
};
