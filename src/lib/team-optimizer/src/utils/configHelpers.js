// Configuration helper utilities

/**
 * Calculate team size from composition
 * @param {Object} composition - Position composition (e.g., { S: 1, OH: 2, MB: 2, L: 1 })
 * @returns {number} Team size
 */
export function getTeamSize(composition) {
    return Object.values(composition).reduce((sum, count) => sum + count, 0);
}

/**
 * Validate sport configuration
 * @param {Object} config - Sport configuration
 * @returns {boolean} Is valid
 */
export function validateSportConfig(config) {
    const required = ['positions', 'positionWeights', 'positionOrder', 'defaultComposition'];

    for (const field of required) {
        if (!config[field]) {
            console.error(`Missing required field: ${field}`);
            return false;
        }
    }

    // Check all positions have weights
    for (const pos of Object.keys(config.positions)) {
        if (!config.positionWeights[pos]) {
            console.warn(`Missing weight for position: ${pos}, using 1.0`);
            config.positionWeights[pos] = 1.0;
        }
    }

    // Check positionOrder contains all positions from defaultComposition
    const compositionPositions = Object.keys(config.defaultComposition);
    for (const pos of compositionPositions) {
        if (!config.positionOrder.includes(pos)) {
            console.warn(`Position ${pos} from defaultComposition not in positionOrder`);
        }
    }

    return true;
}

/**
 * Get team size from config
 * @param {Object} config - Sport configuration
 * @returns {number} Team size
 */
export function getConfigTeamSize(config) {
    return getTeamSize(config.defaultComposition);
}

/**
 * Merge custom composition with default config
 * @param {Object} config - Sport configuration
 * @param {Object} customComposition - Custom composition (optional)
 * @returns {Object} Effective composition
 */
export function getEffectiveComposition(config, customComposition = null) {
    return customComposition || config.defaultComposition;
}
