// src/config/activities/work-project.js
// Work project team configuration - demonstrates non-sport usage

/**
 * Work project team configuration
 * Shows TeamBuilding library can be used for any team distribution
 */
export default {
    name: 'Project Team',

    // Activity metadata
    activityType: 'work',
    teamSize: 6,
    description: 'Balanced project team building based on roles and skills',

    // Role abbreviations and full names
    positions: {
        'TL': 'Tech Lead',
        'BE': 'Backend Developer',
        'FE': 'Frontend Developer',
        'QA': 'QA Engineer',
        'UX': 'UX Designer',
        'PM': 'Product Manager'
    },

    // Role weights for team balancing
    // Higher weight = more critical role for project success
    positionWeights: {
        'TL': 1.3,   // Tech Lead - most critical
        'PM': 1.25,  // Product Manager
        'BE': 1.2,   // Backend Developer
        'FE': 1.15,  // Frontend Developer
        'QA': 1.1,   // QA Engineer
        'UX': 1.1    // UX Designer
    },

    // Order in which roles should be displayed
    positionOrder: ['TL', 'PM', 'BE', 'FE', 'UX', 'QA'],

    // Default team composition
    defaultComposition: {
        'TL': 1,  // 1 Tech Lead
        'PM': 1,  // 1 Product Manager
        'BE': 2,  // 2 Backend Developers
        'FE': 1,  // 1 Frontend Developer
        'UX': 0,  // UX shared across teams
        'QA': 1   // 1 QA Engineer
    }
    // Total team size: 6 people per project team
};
