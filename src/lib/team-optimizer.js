// src/lib/team-optimizer.js
/**
 * Team Optimizer Integration Module
 *
 * Centralized module for importing team-optimizer library from CDN
 * Provides volleyball configuration and TeamOptimizerService
 *
 * External dependency:
 * - team-optimizer: https://github.com/avpv/team-optimizer
 * - Version: baf498c (2024-11-08)
 */

// Import volleyball configuration from local copy
// This ensures we have a stable configuration even if CDN is unavailable
import volleyballConfig from '../config/volleyball.js';

// CDN version pinned to specific commit for stability
const TEAM_OPTIMIZER_VERSION = 'baf498c';
const CDN_BASE_URL = `https://cdn.jsdelivr.net/gh/avpv/team-optimizer@${TEAM_OPTIMIZER_VERSION}`;

/**
 * Import TeamOptimizerService from CDN
 * Using specific commit hash instead of @main for stability
 */
let TeamOptimizerService;
let loadError = null;

try {
    // Dynamic import of TeamOptimizerService from CDN
    const module = await import(`${CDN_BASE_URL}/src/core/TeamOptimizerService.js`);
    TeamOptimizerService = module.default || module.TeamOptimizerService;
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
