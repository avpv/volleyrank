// src/config/activities/beach-volleyball.js
// Beach Volleyball activity configuration

/**
 * Beach Volleyball configuration for team optimizer
 * Defines positions, weights, and default team composition (2-player)
 */
export default {
    name: 'Beach Volleyball',

    // Activity metadata
    activityType: 'sport',
    teamSize: 2,
    description: 'Beach Volleyball team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'BLK': 'Blocker',
        'DEF': 'Defender'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'BLK': 1.15,  // Blocker
        'DEF': 1.15   // Defender - equal importance
    },

    // Order in which positions should be displayed
    positionOrder: ['BLK', 'DEF'],

    // Default team composition (2-player beach volleyball)
    defaultComposition: {
        'BLK': 1,  // 1 Blocker
        'DEF': 1   // 1 Defender
    }
    // Total team size: 2 players
};
