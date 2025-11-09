// src/config/activities/rugby.js
// Rugby Union activity configuration

/**
 * Rugby Union configuration for team optimizer
 * Defines positions, weights, and default team composition (15-player)
 */
export default {
    name: 'Rugby',

    // Activity metadata
    activityType: 'sport',
    teamSize: 15,
    description: 'Rugby Union team building and player ranking',

    // Position abbreviations and full names
    positions: {
        'PR': 'Prop',
        'HK': 'Hooker',
        'LK': 'Lock',
        'FL': 'Flanker',
        'N8': 'Number 8',
        'SH': 'Scrum-half',
        'FH': 'Fly-half',
        'CT': 'Center',
        'WG': 'Wing',
        'FB': 'Fullback'
    },

    // Position weights for team balancing
    // Higher weight = more important position
    positionWeights: {
        'FH': 1.35,  // Fly-half - playmaker
        'SH': 1.3,   // Scrum-half
        'HK': 1.25,  // Hooker
        'N8': 1.25,  // Number 8
        'PR': 1.2,   // Prop
        'LK': 1.2,   // Lock
        'FL': 1.2,   // Flanker
        'CT': 1.15,  // Center
        'FB': 1.15,  // Fullback
        'WG': 1.1    // Wing
    },

    // Order in which positions should be displayed
    positionOrder: ['PR', 'HK', 'LK', 'FL', 'N8', 'SH', 'FH', 'CT', 'WG', 'FB'],

    // Default team composition (15-player rugby)
    defaultComposition: {
        'PR': 2,  // 2 Props
        'HK': 1,  // 1 Hooker
        'LK': 2,  // 2 Locks
        'FL': 2,  // 2 Flankers
        'N8': 1,  // 1 Number 8
        'SH': 1,  // 1 Scrum-half
        'FH': 1,  // 1 Fly-half
        'CT': 2,  // 2 Centers
        'WG': 2,  // 2 Wings
        'FB': 1   // 1 Fullback
    }
    // Total team size: 15 players
};
