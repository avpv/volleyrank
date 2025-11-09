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
        'PM': 'Product Manager',
        'DA': 'Data Analyst',
        'DE': 'Data Engineer',
        'DS': 'Data Scientist',
        'AD': 'App Developer'
    },

    // Role weights for team balancing
    // Higher weight = more critical role for project success
    positionWeights: {
        'TL': 1.0,   // Tech Lead - most critical
        'PM': 1.0,  // Product Manager
        'BE': 1.0,   // Backend Developer
        'DS': 1.0,   // Data Scientist
        'FE': 1.0,  // Frontend Developer
        'DE': 1.0,  // Data Engineer
        'AD': 1.0,  // App Developer
        'QA': 1.0,   // QA Engineer
        'UX': 1.0,   // UX Designer
        'DA': 1.0    // Data Analyst
    },

    // Order in which roles should be displayed
    positionOrder: ['TL', 'PM', 'BE', 'FE', 'DS', 'DE', 'DA', 'AD', 'UX', 'QA'],

    // Default team composition
    defaultComposition: {
        'TL': 1,  // 1 Tech Lead
        'PM': 1,  // 1 Product Manager
        'BE': 2,  // 2 Backend Developers
        'FE': 1,  // 1 Frontend Developer
        'DS': 0,  // Data Scientist (optional)
        'DE': 0,  // Data Engineer (optional)
        'DA': 0,  // Data Analyst (optional)
        'AD': 0,  // App Developer (optional)
        'UX': 0,  // UX shared across teams
        'QA': 1   // 1 QA Engineer
    }
    // Total team size: 6 people per project team
};
