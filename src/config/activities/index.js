// src/config/activities/index.js
// Activity configurations for TeamBuilding

/**
 * Activity file mappings
 *
 * To add a new activity:
 * 1. Create a config file in src/config/activities/ (e.g., tennis.js)
 * 2. Add the mapping below: 'tennis': 'tennis.js'
 *
 * That's it! No need to add imports or update the activities object.
 */
const ACTIVITY_FILES = {
    // Original activities
    volleyball: 'volleyball.js',
    basketball: 'basketball.js',
    soccer: 'soccer.js',
    workProject: 'work-project.js',

    // Team sports
    americanFootball: 'american-football.js',
    baseball: 'baseball.js',
    iceHockey: 'ice-hockey.js',
    handball: 'handball.js',
    rugby: 'rugby.js',
    waterPolo: 'water-polo.js',
    cricket: 'cricket.js',
    futsal: 'futsal.js',
    beachVolleyball: 'beach-volleyball.js',
    ultimateFrisbee: 'ultimate-frisbee.js',
    fieldHockey: 'field-hockey.js',
    lacrosse: 'lacrosse.js',
    softball: 'softball.js',
    netball: 'netball.js',

    // Esports - MOBAs (5v5)
    leagueOfLegends: 'league-of-legends.js',
    dota2: 'dota2.js',
    honorOfKings: 'honor-of-kings.js',
    mobileLegends: 'mobile-legends.js',
    wildRift: 'wild-rift.js',
    smite: 'smite.js',

    // Esports - FPS/Tactical Shooters (5v5)
    valorant: 'valorant.js',
    counterStrike2: 'counter-strike-2.js',
    rainbowSixSiege: 'rainbow-six-siege.js',
    overwatch2: 'overwatch-2.js',

    // Esports - Battle Royale
    pubgMobile: 'pubg-mobile.js',
    pubgBattlegrounds: 'pubg-battlegrounds.js',
    fortnite: 'fortnite.js',
    apexLegends: 'apex-legends.js',

    // Esports - Other
    rocketLeague: 'rocket-league.js',

    // Universal
    general: 'general.js'
};

/**
 * Cache for loaded activity modules
 * @type {Object.<string, Object>}
 */
const activityCache = {};

/**
 * Load an activity configuration dynamically
 * @param {string} activityName - Name of the activity (e.g., 'volleyball')
 * @returns {Promise<Object>} Activity configuration
 */
async function loadActivity(activityName) {
    // Return from cache if already loaded
    if (activityCache[activityName]) {
        return activityCache[activityName];
    }

    const fileName = ACTIVITY_FILES[activityName];
    if (!fileName) {
        throw new Error(
            `Activity '${activityName}' not found. Available: ${Object.keys(ACTIVITY_FILES).join(', ')}`
        );
    }

    try {
        const module = await import(`./${fileName}`);
        const config = module.default;
        activityCache[activityName] = config;
        return config;
    } catch (error) {
        throw new Error(`Failed to load activity '${activityName}': ${error.message}`);
    }
}

/**
 * Load all activities at once
 * @returns {Promise<Object>} Object with all activity configurations
 */
async function loadAllActivities() {
    const activityNames = Object.keys(ACTIVITY_FILES);
    const configs = await Promise.all(
        activityNames.map(name => loadActivity(name))
    );

    const activities = {};
    activityNames.forEach((name, index) => {
        activities[name] = configs[index];
    });

    return activities;
}

/**
 * Get activity config by name (synchronous version)
 * Throws if activity is not loaded yet
 * @param {string} activityName - Name of the activity
 * @returns {Object} Activity configuration
 */
export function getActivityConfig(activityName) {
    const config = activityCache[activityName];
    if (!config) {
        throw new Error(
            `Activity '${activityName}' not loaded. Call loadActivity('${activityName}') first or use activities.${activityName} after initialization.`
        );
    }
    return config;
}

/**
 * Available activity configurations (loaded synchronously)
 * This will be populated during app initialization
 * Note: This is an object that gets populated, not reassigned
 */
export const activities = {};

/**
 * Initialize all activities
 * This should be called once during app startup
 * @returns {Promise<Object>} Loaded activities object
 */
export async function initializeActivities() {
    const loadedActivities = await loadAllActivities();

    // Populate the activities object (don't reassign, update in place)
    Object.keys(loadedActivities).forEach(key => {
        activities[key] = loadedActivities[key];
    });

    return activities;
}

// Named exports for async loading
export { loadActivity, loadAllActivities, ACTIVITY_FILES };

export default {
    activities,
    getActivityConfig,
    loadActivity,
    loadAllActivities,
    initializeActivities
};
