// src/config/activities/american-football.js
// American Football activity configuration

/**
 * American Football configuration for team optimizer
 * Defines positions, weights, and default team composition (11-player)
 */
export default {
    name: 'American Football',

    // Activity metadata
    activityType: 'sport',
    teamSize: 11,
    description: 'American Football team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'QB': 'Quarterback',
        'RB': 'Running Back',
        'WR': 'Wide Receiver',
        'TE': 'Tight End',
        'OL': 'Offensive Line',
        'DL': 'Defensive Line',
        'LB': 'Linebacker',
        'CB': 'Cornerback',
        'S': 'Safety'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'QB': 1.5,   // Quarterback is most critical
        'OL': 1.3,   // Offensive Line
        'WR': 1.2,   // Wide Receiver
        'RB': 1.15,  // Running Back
        'TE': 1.1,   // Tight End
        'DL': 1.25,  // Defensive Line
        'LB': 1.2,   // Linebacker
        'CB': 1.15,  // Cornerback
        'S': 1.1     // Safety
    },

    // Order in which positions should be displayed
    positionOrder: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'],

    // Default team composition (11-player)
    defaultComposition: {
        'QB': 1,  // 1 Quarterback
        'RB': 1,  // 1 Running Back
        'WR': 2,  // 2 Wide Receivers
        'TE': 1,  // 1 Tight End
        'OL': 2,  // 2 Offensive Linemen
        'DL': 1,  // 1 Defensive Lineman
        'LB': 1,  // 1 Linebacker
        'CB': 1,  // 1 Cornerback
        'S': 1    // 1 Safety
    }
    // Total team size: 11 players
};
