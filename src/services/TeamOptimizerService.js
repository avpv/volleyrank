// src/services/TeamOptimizerService.js

/**
 * Volleyball Team Optimizer Service
 * Wrapper around team-optimizer library with EloService integration
 */

import eloService from './EloService.js';
import { TeamOptimizerService } from '../lib/team-optimizer/src/index.js';
import volleyballConfig from '../config/volleyball.js';


class VolleyballOptimizerService {
    constructor() {
        // Create custom evaluation function that uses EloService
        const customEvaluationFn = (teams, optimizer) => {
            return this.evaluateWithElo(teams, optimizer);
        };

        // Initialize optimizer with volleyball config and custom evaluation
        this.optimizer = new TeamOptimizerService(volleyballConfig, customEvaluationFn);

        // Expose positions for backward compatibility
        this.positions = volleyballConfig.positions;
        this.positionOrder = volleyballConfig.positionOrder;

        // Expose config for external access
        this.config = this.optimizer.config;
        this.algorithmConfigs = this.optimizer.algorithmConfigs;
    }

    /**
     * Custom evaluation function using EloService
     * @param {Array} teams - Teams to evaluate
     * @param {Object} optimizer - Optimizer instance
     * @returns {number} Quality score (lower is better)
     */
    evaluateWithElo(teams, optimizer) {
        if (!teams || !Array.isArray(teams) || teams.length === 0) return Infinity;

        // Use EloService to calculate team strengths with position weights
        const teamStrengths = teams.map(team => {
            if (!Array.isArray(team)) return 0;
            return eloService.calculateTeamStrength(team, true).weightedRating;
        });

        if (teamStrengths.some(isNaN)) return Infinity;

        const balance = Math.max(...teamStrengths) - Math.min(...teamStrengths);
        const avg = teamStrengths.reduce((a, b) => a + b, 0) / teamStrengths.length;
        const variance = teamStrengths.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / teamStrengths.length;

        // Position-level balance with volleyball config position weights
        let positionImbalance = 0;
        Object.keys(volleyballConfig.positions).forEach(pos => {
            const positionWeight = volleyballConfig.positionWeights[pos] || 1.0;
            const posStrengths = teams.map(team =>
                team.filter(p => p.assignedPosition === pos)
                    .reduce((sum, p) => sum + (p.positionRating * positionWeight), 0)
            );
            if (posStrengths.length > 1 && posStrengths.some(s => s > 0)) {
                positionImbalance += (Math.max(...posStrengths) - Math.min(...posStrengths));
            }
        });

        return balance + Math.sqrt(variance) * optimizer.adaptiveParameters.varianceWeight +
            positionImbalance * optimizer.adaptiveParameters.positionBalanceWeight;
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
     * Delegates to optimizer with custom evaluation
     */
    evaluateSolution(teams) {
        return this.optimizer.evaluateSolution(teams);
    }
}

export default new VolleyballOptimizerService();
