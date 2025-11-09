// src/config/activities/index.js
// Activity configurations for TeamBuilding

import volleyball from './volleyball.js';
import basketball from './basketball.js';
import soccer from './soccer.js';
import workProject from './work-project.js';
import americanFootball from './american-football.js';
import baseball from './baseball.js';
import iceHockey from './ice-hockey.js';
import handball from './handball.js';
import rugby from './rugby.js';
import waterPolo from './water-polo.js';
import cricket from './cricket.js';
import futsal from './futsal.js';
import beachVolleyball from './beach-volleyball.js';
import ultimateFrisbee from './ultimate-frisbee.js';
import fieldHockey from './field-hockey.js';
import lacrosse from './lacrosse.js';
import softball from './softball.js';
import netball from './netball.js';
import general from './general.js';

/**
 * Available activity configurations
 * Add your custom activity config here
 */
export const activities = {
    // Original activities
    volleyball,
    basketball,
    soccer,
    workProject,

    // Team sports
    americanFootball,
    baseball,
    iceHockey,
    handball,
    rugby,
    waterPolo,
    cricket,
    futsal,
    beachVolleyball,
    ultimateFrisbee,
    fieldHockey,
    lacrosse,
    softball,
    netball,

    // Universal
    general
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
