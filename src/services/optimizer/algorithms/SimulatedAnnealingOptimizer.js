// src/services/optimizer/algorithms/SimulatedAnnealingOptimizer.js

import IOptimizer from '../IOptimizer.js';
import { cloneTeams } from '../utils/solutionUtils.js';
import { performUniversalSwap } from '../utils/swapOperations.js';

/**
 * Simulated Annealing Optimizer
 * Probabilistically accepts worse solutions to escape local minima
 */
class SimulatedAnnealingOptimizer extends IOptimizer {
    constructor(config, adaptiveParams) {
        super(config);
        this.adaptiveParams = adaptiveParams;
        this.stats = {
            iterations: 0,
            improvements: 0,
            temperature: config.initialTemperature
        };
    }

    /**
     * Solve using Simulated Annealing
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
        let best = cloneTeams(current);
        let currentScore = evaluateFn(current);
        let bestScore = currentScore;
        let temp = this.config.initialTemperature;
        let iterationSinceImprovement = 0;

        for (let iter = 0; iter < this.config.iterations; iter++) {
            this.stats.iterations = iter + 1;
            this.stats.temperature = temp;
            
            const neighbor = cloneTeams(current);
            performUniversalSwap(neighbor, positions, this.adaptiveParams);
            const neighborScore = evaluateFn(neighbor);
            const delta = neighborScore - currentScore;
            
            // Accept if better, or probabilistically if worse
            if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
                current = neighbor;
                currentScore = neighborScore;
                
                if (neighborScore < bestScore) {
                    best = cloneTeams(neighbor);
                    bestScore = neighborScore;
                    iterationSinceImprovement = 0;
                    this.stats.improvements++;
                } else {
                    iterationSinceImprovement++;
                }
            }
            
            // Cool down temperature
            temp *= this.config.coolingRate;
            
            // Reheat if enabled and stagnating
            if (this.config.reheatEnabled && iterationSinceImprovement > this.config.reheatIterations) {
                temp = this.config.reheatTemperature;
                iterationSinceImprovement = 0;
            }
            
            // Yield control periodically
            if (iter % 5000 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }

        return best;
        } catch (error) {
            console.error('Simulated Annealing: Error during optimization:', error);
            throw error; // Re-throw to be caught by Promise.allSettled
        }
    }

    getStatistics() {
        return this.stats;
    }
}

export default SimulatedAnnealingOptimizer;
