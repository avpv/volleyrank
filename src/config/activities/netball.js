// src/config/activities/netball.js
// Netball activity configuration

/**
 * Netball configuration for team optimizer
 * Defines positions, weights, and default team composition (7-player)
 */
export default {
    name: 'Netball',

    // Activity metadata
    activityType: 'sport',
    teamSize: 7,
    description: 'Netball team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'GS': 'Goal Shooter',
        'GA': 'Goal Attack',
        'WA': 'Wing Attack',
        'C': 'Center',
        'WD': 'Wing Defense',
        'GD': 'Goal Defense',
        'GK': 'Goal Keeper'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'C': 1.3,    // Center - most versatile
        'GS': 1.25,  // Goal Shooter
        'GA': 1.2,   // Goal Attack
        'GK': 1.2,   // Goal Keeper
        'GD': 1.15,  // Goal Defense
        'WA': 1.1,   // Wing Attack
        'WD': 1.1    // Wing Defense
    },

    // Order in which positions should be displayed
    positionOrder: ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'],

    // Default team composition (7-player netball)
    defaultComposition: {
        'GS': 1,  // 1 Goal Shooter
        'GA': 1,  // 1 Goal Attack
        'WA': 1,  // 1 Wing Attack
        'C': 1,   // 1 Center
        'WD': 1,  // 1 Wing Defense
        'GD': 1,  // 1 Goal Defense
        'GK': 1   // 1 Goal Keeper
    }
    // Total team size: 7 players
};
