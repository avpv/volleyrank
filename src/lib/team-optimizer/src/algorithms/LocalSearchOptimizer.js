// src/services/optimizer/algorithms/LocalSearchOptimizer.js

import IOptimizer from '../IOptimizer.js';
import { cloneTeams } from '../utils/solutionUtils.js';
import { performUniversalSwap } from '../utils/swapOperations.js';

/**
 * Local Search Optimizer
 * Performs hill-climbing to refine an existing solution
 */
class LocalSearchOptimizer extends IOptimizer {
    constructor(config, adaptiveParams) {
        super(config);
        this.adaptiveParams = adaptiveParams;
        this.stats = {
            iterations: 0,
            improvements: 0
        };
    }

    /**
     * Solve using Local Search (hill climbing)
     * @param {Object} problemContext - Problem context
     * @returns {Promise<Array>} Best solution found
     */
    async solve(problemContext) {
        const {
            initialSolution,
            positions,
            evaluateFn
        } = problemContext;

        try {
            let current = cloneTeams(initialSolution);
            let currentScore = evaluateFn(current);

            for (let iter = 0; iter < this.config.iterations; iter++) {
                this.stats.iterations = iter + 1;

                const neighbor = cloneTeams(current);
                performUniversalSwap(neighbor, positions, this.adaptiveParams);
                const neighborScore = evaluateFn(neighbor);

                // Accept only improvements (greedy hill climbing)
                if (neighborScore < currentScore) {
                    current = neighbor;
                    currentScore = neighborScore;
                    this.stats.improvements++;
                }

                // Yield control periodically
                if (iter % 100 === 0) await new Promise(resolve => setTimeout(resolve, 1));
            }

            return current;
        } catch (error) {
            console.error('Local Search: Error during optimization:', error);
            // For local search, if it fails, just return the initial solution
            return cloneTeams(initialSolution);
        }
    }

    getStatistics() {
        return this.stats;
    }
}

export default LocalSearchOptimizer;
