// src/services/optimizer/algorithms/AntColonyOptimizer.js

import IOptimizer from '../IOptimizer.js';
import { cloneTeams } from '../utils/solutionUtils.js';
import { generateInitialSolutions } from '../utils/solutionGenerators.js';

/**
 * Ant Colony Optimization
 * Inspired by foraging behavior of ants using pheromone trails
 */
class AntColonyOptimizer extends IOptimizer {
    constructor(config) {
        super(config);
        this.stats = {
            iterations: 0,
            improvements: 0
        };
    }

    /**
     * Solve using Ant Colony Optimization
     * @param {Object} problemContext - Problem context
     * @returns {Promise<Array>} Best solution found
     */
    async solve(problemContext) {
        const {
            composition,
            teamCount,
            playersByPosition,
            evaluateFn
        } = problemContext;

        try {
            // Initialize pheromone matrix: [playerId][teamIndex] = pheromone level
            const allPlayers = Object.values(playersByPosition).flat();
        const pheromones = new Map();
        allPlayers.forEach(player => {
            const teamPheromones = Array(teamCount).fill(1.0);
            pheromones.set(player.id, teamPheromones);
        });
        
        let globalBest = null;
        let globalBestScore = Infinity;
        
        for (let iter = 0; iter < this.config.iterations; iter++) {
            this.stats.iterations = iter + 1;
            const iterationSolutions = [];
            
            // Each ant constructs a solution
            for (let ant = 0; ant < this.config.antCount; ant++) {
                const solution = this.constructAntSolution(
                    composition, 
                    teamCount, 
                    playersByPosition, 
                    pheromones
                );
                
                const score = evaluateFn(solution);
                iterationSolutions.push({ solution, score });
                
                if (score < globalBestScore) {
                    globalBest = cloneTeams(solution);
                    globalBestScore = score;
                    this.stats.improvements++;
                }
            }
            
            // Evaporate pheromones
            pheromones.forEach((teamPheromones, playerId) => {
                for (let t = 0; t < teamCount; t++) {
                    teamPheromones[t] *= (1 - this.config.evaporationRate);
                }
            });
            
            // Deposit pheromones
            iterationSolutions.forEach(({ solution, score }) => {
                const deposit = this.config.pheromoneDeposit / (1 + score);
                solution.forEach((team, teamIndex) => {
                    team.forEach(player => {
                        const teamPheromones = pheromones.get(player.id);
                        if (teamPheromones) {
                            teamPheromones[teamIndex] += deposit;
                        }
                    });
                });
            });
            
            // Elitist strategy: extra pheromones for best solution
            if (globalBest) {
                const elitistDeposit = this.config.pheromoneDeposit * this.config.elitistWeight / (1 + globalBestScore);
                globalBest.forEach((team, teamIndex) => {
                    team.forEach(player => {
                        const teamPheromones = pheromones.get(player.id);
                        if (teamPheromones) {
                            teamPheromones[teamIndex] += elitistDeposit;
                        }
                    });
                });
            }
            
            // Yield control periodically
            if (iter % 10 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }

        return globalBest || generateInitialSolutions(composition, teamCount, playersByPosition)[0];
        } catch (error) {
            console.error('Ant Colony: Error during optimization:', error);
            throw error; // Re-throw to be caught by Promise.allSettled
        }
    }

    /**
     * Construct a solution using ant colony principles
     * @param {Object} composition - Position composition
     * @param {number} teamCount - Number of teams
     * @param {Object} playersByPosition - Players grouped by position
     * @param {Map} pheromones - Pheromone matrix
     * @returns {Array} Constructed solution
     */
    constructAntSolution(composition, teamCount, playersByPosition, pheromones) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        
        // Smart position ordering: fill scarce positions first
        const positionPriority = ['MB', 'S', 'L', 'OPP', 'OH'];
        const positionOrder = positionPriority
            .map(pos => [pos, composition[pos]])
            .filter(([, count]) => count && count > 0);
        
        positionOrder.forEach(([position, neededCount]) => {
            const availablePlayers = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id));
            
            for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                for (let slot = 0; slot < neededCount; slot++) {
                    if (availablePlayers.length === 0) break;
                    
                    // Calculate probabilities based on pheromones and heuristic
                    const probabilities = this.calculateAntProbabilities(
                        availablePlayers,
                        teamIdx,
                        position,
                        pheromones
                    );
                    
                    // Select player based on probabilities
                    const selectedPlayer = this.rouletteWheelSelection(availablePlayers, probabilities);
                    
                    teams[teamIdx].push(selectedPlayer);
                    usedIds.add(selectedPlayer.id);
                    
                    // Remove from available
                    const idx = availablePlayers.indexOf(selectedPlayer);
                    if (idx > -1) availablePlayers.splice(idx, 1);
                }
            }
        });
        
        return teams;
    }

    /**
     * Calculate selection probabilities for ant colony
     * @param {Array} players - Available players
     * @param {number} teamIndex - Current team index
     * @param {string} position - Position being filled
     * @param {Map} pheromones - Pheromone matrix
     * @returns {Array} Probabilities for each player
     */
    calculateAntProbabilities(players, teamIndex, position, pheromones) {
        const probabilities = [];
        let totalProbability = 0;
        
        players.forEach(player => {
            const teamPheromones = pheromones.get(player.id) || Array(10).fill(1.0);
            const pheromone = teamPheromones[teamIndex] || 1.0;
            
            // Heuristic: rating strength
            const rating = player.ratings?.[position] || 1500;
            const heuristic = rating / 1500; // Normalize around 1.0
            
            // Probability = pheromone^alpha * heuristic^beta
            const probability = Math.pow(pheromone, this.config.alpha) * Math.pow(heuristic, this.config.beta);
            probabilities.push(probability);
            totalProbability += probability;
        });
        
        // Normalize probabilities
        return probabilities.map(p => 
            totalProbability > 0 ? p / totalProbability : 1 / players.length
        );
    }

    /**
     * Roulette wheel selection
     * @param {Array} players - Available players
     * @param {Array} probabilities - Selection probabilities
     * @returns {Object} Selected player
     */
    rouletteWheelSelection(players, probabilities) {
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < players.length; i++) {
            cumulative += probabilities[i];
            if (random <= cumulative) {
                return players[i];
            }
        }
        
        return players[players.length - 1]; // Fallback
    }

    getStatistics() {
        return this.stats;
    }
}

export default AntColonyOptimizer;
