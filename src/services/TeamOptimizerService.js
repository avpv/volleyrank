// src/services/TeamOptimizerService.js

/**
 * Team Optimizer Service
 * Wrapper around team-optimizer library
 * Activity-agnostic - works with any activity configuration
 */

import { TeamOptimizerService as LibraryTeamOptimizer } from '../lib/team-optimizer/src/index.js';


class TeamOptimizerServiceWrapper {
    constructor(activityConfig, eloService) {
        // Store dependencies
        this.activityConfig = activityConfig;
        this.eloService = eloService;

        // Initialize optimizer with activity config (only if config provided)
        // No custom evaluation needed - EvaluationService uses the same player.ratings[position] data
        this.optimizer = activityConfig ? new LibraryTeamOptimizer(activityConfig) : null;

        // Expose positions for backward compatibility
        this.positions = activityConfig?.positions || {};
        this.positionOrder = activityConfig?.positionOrder || [];

        // Expose config for external access
        this.config = this.optimizer?.config || null;
        this.algorithmConfigs = this.optimizer?.algorithmConfigs || null;
    }

    /**
     * Main optimization entry point
     * @param {Object} composition - Position composition requirements
     * @param {number} teamCount - Number of teams to create
     * @param {Array} players - Available players
     * @returns {Promise<Object>} Optimization result
     */
    async optimize(composition, teamCount, players) {
        return await this.optimizer.optimize(composition, teamCount, players);
    }

    /**
     * Enhanced validation of input parameters
     * Delegates to optimizer library
     */
    enhancedValidate(composition, teamCount, players) {
        return this.optimizer.enhancedValidate(composition, teamCount, players);
    }

    /**
     * Get algorithm statistics
     */
    getAlgorithmStatistics() {
        return this.optimizer.getAlgorithmStatistics();
    }

    /**
     * Evaluate solution quality
     * Delegates to optimizer's EvaluationService
     */
    evaluateSolution(teams) {
        return this.optimizer.evaluateSolution(teams);
    }
}

export default TeamOptimizerServiceWrapper;
