// src/services/optimizer/algorithms/TabuSearchOptimizer.js

import IOptimizer from '../IOptimizer.js';
import { cloneTeams, hashSolution } from '../utils/solutionUtils.js';
import { performUniversalSwap } from '../utils/swapOperations.js';

/**
 * Tabu Search Optimizer
 * Uses memory structures to avoid cycling and encourage exploration
 */
class TabuSearchOptimizer extends IOptimizer {
    constructor(config, adaptiveParams) {
        super(config);
        this.adaptiveParams = adaptiveParams;
        this.stats = {
            iterations: 0,
            improvements: 0
        };
    }

    /**
     * Solve using Tabu Search
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
        let bestScore = evaluateFn(best);
        const tabuSet = new Set(); // Use Set for O(1) lookup
        const tabuQueue = []; // Keep queue for FIFO removal
        let iterationSinceImprovement = 0;

        for (let iter = 0; iter < this.config.iterations; iter++) {
            this.stats.iterations = iter + 1;
            const neighbors = this.generateNeighborhood(current, positions, this.config.neighborCount);
            
            let bestNeighbor = null;
            let bestNeighborScore = Infinity;
            let bestNonTabuNeighbor = null;
            let bestNonTabuScore = Infinity;
            
            // Find best neighbor (considering tabu list and aspiration criterion)
            for (const neighbor of neighbors) {
                const hash = hashSolution(neighbor);
                const score = evaluateFn(neighbor);
                const isTabu = tabuSet.has(hash);
                
                // Track best non-tabu neighbor as fallback
                if (!isTabu && score < bestNonTabuScore) {
                    bestNonTabuNeighbor = neighbor;
                    bestNonTabuScore = score;
                }
                
                // Aspiration criterion: accept tabu if better than global best
                if ((!isTabu || score < bestScore) && score < bestNeighborScore) {
                    bestNeighbor = neighbor;
                    bestNeighborScore = score;
                }
            }
            
            // If all neighbors are tabu and worse than bestScore,
            // accept the best non-tabu neighbor to prevent getting stuck
            if (bestNeighbor === null && bestNonTabuNeighbor !== null) {
                bestNeighbor = bestNonTabuNeighbor;
                bestNeighborScore = bestNonTabuScore;
            }
            
            if (bestNeighbor) {
                current = bestNeighbor;
                const currentScore = bestNeighborScore;
                const currentHash = hashSolution(current);
                
                // Add to tabu set and queue
                tabuSet.add(currentHash);
                tabuQueue.push(currentHash);
                
                // Remove oldest if exceeds tenure
                if (tabuQueue.length > this.config.tabuTenure) {
                    const oldHash = tabuQueue.shift();
                    tabuSet.delete(oldHash);
                }
                
                if (currentScore < bestScore) {
                    best = cloneTeams(current);
                    bestScore = currentScore;
                    iterationSinceImprovement = 0;
                    this.stats.improvements++;
                } else {
                    iterationSinceImprovement++;
                }
            } else {
                // Force diversification if stuck
                iterationSinceImprovement++;
            }
            
            // Periodic diversification to escape local minima
            if (iter > 0 && iter % this.config.diversificationFrequency === 0) {
                current = cloneTeams(best);
                // Perform multiple random swaps for strong diversification
                const swapCount = Math.max(3, Math.floor(current[0].length / 2));
                for (let i = 0; i < swapCount; i++) {
                    performUniversalSwap(current, positions, this.adaptiveParams);
                }
                // Partially clear tabu structures (keep 50%)
                const keepCount = Math.floor(this.config.tabuTenure / 2);
                while (tabuQueue.length > keepCount) {
                    const oldHash = tabuQueue.shift();
                    tabuSet.delete(oldHash);
                }
                iterationSinceImprovement = 0;
            }
            
            // Restart on long stagnation
            if (iterationSinceImprovement > 500) {
                current = cloneTeams(best);
                for (let i = 0; i < 5; i++) {
                    performUniversalSwap(current, positions, this.adaptiveParams);
                }
                iterationSinceImprovement = 0;
            }
            
            // Yield control periodically
            if (iter % 500 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }
        return best;
        } catch (error) {
            console.error('Tabu Search: Error during optimization:', error);
            throw error; // Re-throw to be caught by Promise.allSettled
        }
    }

    /**
     * Generate neighborhood of solutions
     * @param {Array} teams - Current solution
     * @param {Array} positions - Available positions
     * @param {number} size - Neighborhood size
     * @returns {Array} Array of neighbor solutions
     */
    generateNeighborhood(teams, positions, size) {
        return Array.from({ length: size }, () => {
            const neighbor = cloneTeams(teams);
            performUniversalSwap(neighbor, positions, this.adaptiveParams);
            return neighbor;
        });
    }

    getStatistics() {
        return this.stats;
    }
}

export default TabuSearchOptimizer;
