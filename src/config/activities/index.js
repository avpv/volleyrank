// src/config/activities/index.js
// Activity configurations for TeamBuilding

import volleyball from './volleyball.js';
import basketball from './basketball.js';
import soccer from './soccer.js';
import workProject from './work-project.js';

/**
 * Available activity configurations
 * Add your custom activity config here
 */
export const activities = {
    volleyball,
    basketball,
    soccer,
    workProject
};

/**
 * Get activity config by name
 * @param {string} activityName - Name of the activity (e.g., 'volleyball', 'basketball')
 * @returns {object} Activity configuration
 */
export function getActivityConfig(activityName) {
    const config = activities[activityName];
    if (!config) {
        throw new Error(`Activity config '${activityName}' not found. Available: ${Object.keys(activities).join(', ')}`);
    }
    return config;
}

/**
 * Default activity - can be changed based on preference
 */
export const defaultActivity = volleyball;

export default {
    activities,
    getActivityConfig,
    defaultActivity
};
