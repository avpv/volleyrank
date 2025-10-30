// src/services/optimizer/GeneticAlgorithmOptimizer.js

import IOptimizer from './IOptimizer.js';
import { cloneTeams } from './utils/solutionUtils.js';
import { performUniversalSwap } from './utils/swapOperations.js';
import { createRandomSolution } from './utils/solutionGenerators.js';

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
     * Solve using Genetic Algorithm
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

        let population = Array.isArray(initialSolution[0]) ? [...initialSolution] : [initialSolution];
        
        // Fill population to required size
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

            // Create new population
            const newPopulation = scored.slice(0, this.config.elitismCount).map(s => s.teams);

            while (newPopulation.length < this.config.populationSize) {
                const parent1 = this.tournamentSelection(scored, this.config.tournamentSize);
                if (Math.random() < this.config.crossoverRate) {
                    const parent2 = this.tournamentSelection(scored, this.config.tournamentSize);
                    newPopulation.push(this.enhancedCrossover(parent1, parent2, composition));
                } else {
                    newPopulation.push(cloneTeams(parent1));
                }
            }

            // Apply mutation
            for (let i = this.config.elitismCount; i < newPopulation.length; i++) {
                if (Math.random() < this.config.mutationRate) {
                    performUniversalSwap(newPopulation[i], positions, this.adaptiveParams);
                }
            }

            // Handle stagnation
            if (stagnationCount >= this.config.maxStagnation) {
                for (let i = Math.ceil(population.length / 2); i < population.length; i++) {
                    population[i] = createRandomSolution(composition, teamCount, playersByPosition);
                }
                stagnationCount = 0;
            }
            
            population = newPopulation;
            
            // Yield control periodically
            if (gen % 10 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }

        return population.map(ind => ({ teams: ind, score: evaluateFn(ind) }))
            .sort((a, b) => a.score - b.score)[0].teams;
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
