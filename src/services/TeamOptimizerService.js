// src/services/TeamOptimizerService.js

/**
 * Volleyball Team Optimizer Service
 * Wrapper around team-optimizer library
 */

import { TeamOptimizerService } from '../lib/team-optimizer/src/index.js';
import volleyballConfig from '../config/volleyball.js';


class VolleyballOptimizerService {
    constructor() {
        // Initialize optimizer with volleyball config
        // No custom evaluation needed - EvaluationService uses the same player.ratings[position] data
        this.optimizer = new TeamOptimizerService(volleyballConfig);

        // Expose positions for backward compatibility
        this.positions = volleyballConfig.positions;
        this.positionOrder = volleyballConfig.positionOrder;

        // Expose config for external access
        this.config = this.optimizer.config;
        this.algorithmConfigs = this.optimizer.algorithmConfigs;
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

export default new VolleyballOptimizerService();
