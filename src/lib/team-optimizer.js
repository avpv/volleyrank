// src/lib/team-optimizer.js
/**
 * Team Optimizer Integration Module
 *
 * Centralized module for importing team-optimizer library from CDN
 * Provides volleyball configuration and TeamOptimizerService
 *
 * External dependency:
 * - team-optimizer: https://github.com/avpv/team-optimizer
 * - Version: @main (latest)
 */

// Import volleyball configuration from local copy
// This ensures we have a stable configuration even if CDN is unavailable
import volleyballConfig from '../config/volleyball.js';

// CDN version uses @main to always get latest algorithms and improvements
const TEAM_OPTIMIZER_VERSION = 'main';
const CDN_BASE_URL = `https://cdn.jsdelivr.net/gh/avpv/team-optimizer@${TEAM_OPTIMIZER_VERSION}`;

/**
 * Import TeamOptimizerService from CDN
 * Using @main to get latest algorithms and improvements
 */
let TeamOptimizerService;
let loadError = null;

try {
    // Dynamic import of TeamOptimizerService from CDN main export
    // Using src/index.js ensures all internal dependencies are properly resolved
    const module = await import(`${CDN_BASE_URL}/src/index.js`);
    TeamOptimizerService = module.TeamOptimizerService;
} catch (error) {
    loadError = error;
    console.error('Failed to load TeamOptimizerService from CDN:', error);
    console.error('Make sure you have an internet connection and the CDN is accessible.');

    // Provide helpful error message for users
    TeamOptimizerService = class TeamOptimizerServiceFallback {
        constructor() {
            throw new Error(
                'TeamOptimizerService could not be loaded from CDN. ' +
                'Please check your internet connection and try again. ' +
                `Error: ${error.message}`
            );
        }
    };
}

// Export volleyball configuration and TeamOptimizerService
export { volleyballConfig, TeamOptimizerService, loadError };

// Default export provides quick access to config
export default volleyballConfig;
