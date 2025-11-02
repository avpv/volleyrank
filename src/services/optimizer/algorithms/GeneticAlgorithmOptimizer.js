// src/services/optimizer/algorithms/GeneticAlgorithmOptimizer.js

import IOptimizer from '../IOptimizer.js';
import { cloneTeams } from '../utils/solutionUtils.js';
import { performUniversalSwap } from '../utils/swapOperations.js';
import { createRandomSolution } from '../utils/solutionGenerators.js';

/**
 * Genetic Algorithm Optimizer
 * Uses evolution-inspired mechanisms: selection, crossover, and mutation
 */
class GeneticAlgorithmOptimizer extends IOptimizer {
    constructor(config, adaptiveParams) {
        super(config);
        this.adaptiveParams = adaptiveParams;
        this.stats = {
            generations: 0,
            improvements: 0
        };
    }

    /**
     * Solve using Genetic Algorithm with diversity preservation
     * @param {Object} problemContext - Problem context
     * @returns {Promise<Array>} Best solution found
     */
    async solve(problemContext) {
        const {
            initialSolution,
            composition,
            teamCount,
            playersByPosition,
            positions,
            evaluateFn
        } = problemContext;

        try {
            let population = Array.isArray(initialSolution[0]) ? [...initialSolution] : [initialSolution];

        // Fill population to required size with diverse solutions
        while (population.length < this.config.populationSize) {
            population.push(createRandomSolution(composition, teamCount, playersByPosition));
        }

        let bestScore = Infinity;
        let stagnationCount = 0;

        for (let gen = 0; gen < this.config.generationCount; gen++) {
            this.stats.generations = gen + 1;

            const scored = population.map(individual => ({
                teams: individual,
                score: evaluateFn(individual)
            })).sort((a, b) => a.score - b.score);

            if (scored[0].score < bestScore) {
                bestScore = scored[0].score;
                stagnationCount = 0;
                this.stats.improvements++;
            } else {
                stagnationCount++;
            }

            // Create new population with diversity preservation
            const newPopulation = scored.slice(0, this.config.elitismCount).map(s => s.teams);

            while (newPopulation.length < this.config.populationSize) {
                const parent1 = this.tournamentSelection(scored, this.config.tournamentSize);
                if (Math.random() < this.config.crossoverRate) {
                    const parent2 = this.tournamentSelection(scored, this.config.tournamentSize);
                    const child = this.enhancedCrossover(parent1, parent2, composition);

                    // Diversity check: avoid adding very similar solutions
                    if (this.isDiverse(child, newPopulation)) {
                        newPopulation.push(child);
                    } else {
                        // If too similar, create a random solution instead
                        newPopulation.push(createRandomSolution(composition, teamCount, playersByPosition));
                    }
                } else {
                    newPopulation.push(cloneTeams(parent1));
                }
            }

            // Apply mutation with higher rate when stagnating
            const currentMutationRate = stagnationCount > 10
                ? Math.min(0.5, this.config.mutationRate * 2)
                : this.config.mutationRate;

            for (let i = this.config.elitismCount; i < newPopulation.length; i++) {
                if (Math.random() < currentMutationRate) {
                    // Apply multiple swaps when stagnating for more diversity
                    const swapCount = stagnationCount > 10 ? 2 : 1;
                    for (let s = 0; s < swapCount; s++) {
                        performUniversalSwap(newPopulation[i], positions, this.adaptiveParams);
                    }
                }
            }

            // Handle stagnation - inject diversity
            if (stagnationCount >= this.config.maxStagnation) {
                const replacementCount = Math.ceil(newPopulation.length / 2);
                for (let i = newPopulation.length - replacementCount; i < newPopulation.length; i++) {
                    newPopulation[i] = createRandomSolution(composition, teamCount, playersByPosition);
                }
                stagnationCount = 0;
            }

            population = newPopulation;

            // Yield control periodically
            if (gen % 10 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }

        return population.map(ind => ({ teams: ind, score: evaluateFn(ind) }))
            .sort((a, b) => a.score - b.score)[0].teams;
        } catch (error) {
            console.error('GA: Error during optimization:', error);
            throw error; // Re-throw to be caught by Promise.allSettled
        }
    }

    /**
     * Check if a solution is sufficiently diverse from existing population
     * @param {Array} solution - Solution to check
     * @param {Array} population - Current population
     * @returns {boolean} True if solution is diverse enough
     */
    isDiverse(solution, population) {
        if (population.length === 0) return true;

        // Sample a few individuals from population to compare
        const sampleSize = Math.min(5, population.length);
        let minDifference = Infinity;

        for (let i = 0; i < sampleSize; i++) {
            const idx = Math.floor(Math.random() * population.length);
            const difference = this.calculateSolutionDifference(solution, population[idx]);
            minDifference = Math.min(minDifference, difference);
        }

        // If at least 20% of players are different, consider it diverse
        const totalPlayers = solution.flat().length;
        const diversityThreshold = totalPlayers * 0.2;

        return minDifference >= diversityThreshold;
    }

    /**
     * Calculate how different two solutions are (number of different player assignments)
     * @param {Array} solution1 - First solution
     * @param {Array} solution2 - Second solution
     * @returns {number} Number of different player assignments
     */
    calculateSolutionDifference(solution1, solution2) {
        let differences = 0;

        for (let teamIdx = 0; teamIdx < solution1.length; teamIdx++) {
            const team1Ids = new Set(solution1[teamIdx].map(p => p.id));
            const team2Ids = new Set(solution2[teamIdx].map(p => p.id));

            // Count players in team1 that are not in team2
            solution1[teamIdx].forEach(player => {
                if (!team2Ids.has(player.id)) {
                    differences++;
                }
            });
        }

        return differences;
    }

    /**
     * Tournament selection
     * @param {Array} scoredPopulation - Population with scores
     * @param {number} size - Tournament size
     * @returns {Array} Selected individual
     */
    tournamentSelection(scoredPopulation, size) {
        let best = null;
        for (let i = 0; i < size; i++) {
            const idx = Math.floor(Math.random() * scoredPopulation.length);
            if (!best || scoredPopulation[idx].score < best.score) {
                best = scoredPopulation[idx];
            }
        }
        return best.teams;
    }

    /**
     * Enhanced crossover operation
     * @param {Array} parent1 - First parent
     * @param {Array} parent2 - Second parent
     * @param {Object} composition - Position composition
     * @returns {Array} Child solution
     */
    enhancedCrossover(parent1, parent2, composition) {
        const child = Array.from({ length: parent1.length }, () => []);
        const usedIds = new Set();
        const slicePoint = Math.floor(Math.random() * parent1.length);
        
        // Copy first part from parent1
        for (let i = 0; i < slicePoint; i++) {
            child[i] = parent1[i].map(p => ({ ...p }));
            parent1[i].forEach(p => usedIds.add(p.id));
        }
        
        // Fill remaining with players from parent2
        const remainingPlayers = parent2.flat().filter(p => !usedIds.has(p.id));
        remainingPlayers.forEach(player => {
            let placed = false;
            for (let i = 0; i < child.length; i++) {
                const needsPos = (child[i].filter(p => p.assignedPosition === player.assignedPosition).length) < (composition[player.assignedPosition] || 0);
                if (needsPos) {
                    child[i].push({ ...player });
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                const smallestTeam = child.reduce((smallest, current) => 
                    current.length < smallest.length ? current : smallest, child[0]);
                smallestTeam.push({ ...player });
            }
        });
        return child;
    }

    getStatistics() {
        return this.stats;
    }
}

export default GeneticAlgorithmOptimizer;
