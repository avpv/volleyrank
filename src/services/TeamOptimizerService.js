// src/services/TeamOptimizerService.js

/**
 * Team Optimizer Service - Orchestrator
 * Coordinates multiple optimization algorithms and manages the optimization lifecycle
 */

import eloService from './EloService.js';

// Import optimizers
import GeneticAlgorithmOptimizer from './optimizer/algorithms/GeneticAlgorithmOptimizer.js';
import TabuSearchOptimizer from './optimizer/algorithms/TabuSearchOptimizer.js';
import SimulatedAnnealingOptimizer from './optimizer/algorithms/SimulatedAnnealingOptimizer.js';
import AntColonyOptimizer from './optimizer/algorithms/AntColonyOptimizer.js';
import ConstraintProgrammingOptimizer from './optimizer/algorithms/ConstraintProgrammingOptimizer.js';
import LocalSearchOptimizer from './optimizer/algorithms/LocalSearchOptimizer.js';

// Import utilities
import { sortTeamByPosition, getUnusedPlayers } from './optimizer/utils/solutionUtils.js';
import { generateInitialSolutions } from './optimizer/utils/solutionGenerators.js';

class TeamOptimizerService {
    constructor() {
        this.positions = {
            'S': 'Setter',
            'OPP': 'Opposite',
            'OH': 'Outside Hitter',
            'MB': 'Middle Blocker',
            'L': 'Libero'
        };
        
        // Position order for sorting players in teams
        this.positionOrder = ['S', 'OPP', 'OH', 'MB', 'L'];
        
        // Main configuration - which algorithms to use
        this.config = {
            useGeneticAlgorithm: true,
            useTabuSearch: true,
            useSimulatedAnnealing: true,
            useAntColony: true,
            useConstraintProgramming: true,
            adaptiveSwapEnabled: true,
            adaptiveParameters: {
                strongWeakSwapProbability: 0.6,
                positionBalanceWeight: 0.3,
                varianceWeight: 0.5
            }
        };
        
        // Algorithm-specific configurations
        this.algorithmConfigs = {
            geneticAlgorithm: {
                populationSize: 20,
                generationCount: 100,
                mutationRate: 0.2,
                crossoverRate: 0.7,
                elitismCount: 2,
                tournamentSize: 3,
                maxStagnation: 20
            },
            tabuSearch: {
                tabuTenure: 100,
                iterations: 5000,
                neighborCount: 20,
                diversificationFrequency: 1000
            },
            simulatedAnnealing: {
                initialTemperature: 1000,
                coolingRate: 0.995,
                iterations: 50000,
                reheatEnabled: true,
                reheatTemperature: 500,
                reheatIterations: 10000
            },
            antColony: {
                antCount: 20,
                iterations: 100,
                alpha: 1.0,
                beta: 2.0,
                evaporationRate: 0.1,
                pheromoneDeposit: 100,
                elitistWeight: 2.0
            },
            constraintProgramming: {
                maxBacktracks: 1000,
                variableOrderingHeuristic: 'most-constrained',
                valueOrderingHeuristic: 'least-constraining',
                propagationLevel: 'full',
                restartStrategy: 'luby',
                conflictAnalysis: true
            },
            localSearch: {
                iterations: 1500,
                neighborhoodSize: 10
            }
        };
        
        this.algorithmStats = {};
    }

    /**
     * Main optimization entry point
     * @param {Object} composition - Position composition requirements
     * @param {number} teamCount - Number of teams to create
     * @param {Array} players - Available players
     * @returns {Promise<Object>} Optimization result
     */
    async optimize(composition, teamCount, players) {
        // Validate input
        const validation = this.enhancedValidate(composition, teamCount, players);
        if (!validation.isValid) {
            throw new Error(validation.errors.map(e => e.message).join(', '));
        }

        // Prepare data
        this.adaptParameters(teamCount, players.length);
        const playersByPosition = this.groupByPosition(players);
        const positions = Object.keys(composition).filter(pos => composition[pos] > 0);
        
        // Generate initial solutions
        const initialSolutions = generateInitialSolutions(composition, teamCount, playersByPosition);
        this.resetAlgorithmStats();

        // Create problem context that will be passed to all optimizers
        const problemContext = {
            composition,
            teamCount,
            playersByPosition,
            positions,
            evaluateFn: (teams) => this.evaluateSolution(teams)
        };

        // Run algorithms in parallel
        const { results, algorithmNames } = await this.runOptimizationAlgorithms(
            initialSolutions,
            problemContext
        );

        // Select best result
        const scores = results.map(r => this.evaluateSolution(r));
        const bestIdx = scores.indexOf(Math.min(...scores));
        
        console.log(`Best initial result from: ${algorithmNames[bestIdx]}`);
        
        // Refine with local search
        const localSearchContext = {
            ...problemContext,
            initialSolution: results[bestIdx]
        };
        const localSearchOptimizer = new LocalSearchOptimizer(
            this.algorithmConfigs.localSearch,
            this.config.adaptiveParameters
        );
        const bestTeams = await localSearchOptimizer.solve(localSearchContext);
        this.algorithmStats.localSearch = localSearchOptimizer.getStatistics();

        // Sort teams by strength (strongest first)
        bestTeams.sort((a, b) => {
            const aStrength = eloService.calculateTeamStrength(a).totalRating;
            const bStrength = eloService.calculateTeamStrength(b).totalRating;
            return bStrength - aStrength;
        });

        // Sort players within each team by position order
        bestTeams.forEach(team => sortTeamByPosition(team, this.positionOrder));

        const balance = eloService.evaluateBalance(bestTeams);
        const unused = getUnusedPlayers(bestTeams, players);

        return {
            teams: bestTeams,
            balance,
            unusedPlayers: unused,
            validation,
            algorithm: `${algorithmNames[bestIdx]} + Local Search Refinement`,
            statistics: this.getAlgorithmStatistics()
        };
    }

    /**
     * Run all enabled optimization algorithms in parallel
     * @param {Array} initialSolutions - Initial candidate solutions
     * @param {Object} problemContext - Problem context
     * @returns {Promise<Object>} Results and algorithm names
     */
    async runOptimizationAlgorithms(initialSolutions, problemContext) {
        const algorithmPromises = [];
        const algorithmNames = [];

        // Genetic Algorithm
        if (this.config.useGeneticAlgorithm) {
            const optimizer = new GeneticAlgorithmOptimizer(
                this.algorithmConfigs.geneticAlgorithm,
                this.config.adaptiveParameters
            );
            const context = { ...problemContext, initialSolution: initialSolutions };
            algorithmPromises.push(
                optimizer.solve(context).then(result => {
                    this.algorithmStats.geneticAlgorithm = optimizer.getStatistics();
                    return result;
                })
            );
            algorithmNames.push('Genetic Algorithm');
        }

        // Tabu Search (Multi-Start)
        if (this.config.useTabuSearch) {
            const startCount = Math.min(3, initialSolutions.length);
            const tabuResults = [];
            
            for (let i = 0; i < startCount; i++) {
                const optimizer = new TabuSearchOptimizer(
                    this.algorithmConfigs.tabuSearch,
                    this.config.adaptiveParameters
                );
                const context = { ...problemContext, initialSolution: initialSolutions[i] };
                tabuResults.push(optimizer.solve(context));
            }
            
            algorithmPromises.push(
                Promise.all(tabuResults).then(results => {
                    const scores = results.map(r => this.evaluateSolution(r));
                    const bestIdx = scores.indexOf(Math.min(...scores));
                    this.algorithmStats.tabuSearch = { iterations: startCount * this.algorithmConfigs.tabuSearch.iterations, improvements: 0 };
                    return results[bestIdx];
                })
            );
            algorithmNames.push('Tabu Search');
        }

        // Simulated Annealing
        if (this.config.useSimulatedAnnealing) {
            const optimizer = new SimulatedAnnealingOptimizer(
                this.algorithmConfigs.simulatedAnnealing,
                this.config.adaptiveParameters
            );
            const context = { ...problemContext, initialSolution: initialSolutions[0] };
            algorithmPromises.push(
                optimizer.solve(context).then(result => {
                    this.algorithmStats.simulatedAnnealing = optimizer.getStatistics();
                    return result;
                })
            );
            algorithmNames.push('Simulated Annealing');
        }

        // Ant Colony Optimization
        if (this.config.useAntColony) {
            const optimizer = new AntColonyOptimizer(this.algorithmConfigs.antColony);
            algorithmPromises.push(
                optimizer.solve(problemContext).then(result => {
                    this.algorithmStats.antColony = optimizer.getStatistics();
                    return result;
                })
            );
            algorithmNames.push('Ant Colony Optimization');
        }

        // Constraint Programming
        if (this.config.useConstraintProgramming) {
            const optimizer = new ConstraintProgrammingOptimizer(this.algorithmConfigs.constraintProgramming);
            algorithmPromises.push(
                optimizer.solve(problemContext).then(result => {
                    this.algorithmStats.constraintProgramming = optimizer.getStatistics();
                    return result;
                })
            );
            algorithmNames.push('Constraint Programming');
        }

        // Fallback: if no algorithms enabled, enable defaults
        if (algorithmPromises.length === 0) {
            this.config.useGeneticAlgorithm = true;
            this.config.useTabuSearch = true;
            return this.runOptimizationAlgorithms(initialSolutions, problemContext);
        }

        const results = await Promise.all(algorithmPromises);
        return { results, algorithmNames };
    }

    /**
     * Evaluate solution quality (lower is better)
     * @param {Array} teams - Solution to evaluate
     * @returns {number} Quality score
     */
    evaluateSolution(teams) {
        if (!teams || !Array.isArray(teams) || teams.length === 0) return Infinity;
        
        const teamStrengths = teams.map(team => {
            if (!Array.isArray(team)) return 0;
            return eloService.calculateTeamStrength(team).totalRating;
        });
        
        if (teamStrengths.some(isNaN)) return Infinity;

        const balance = Math.max(...teamStrengths) - Math.min(...teamStrengths);
        const avg = teamStrengths.reduce((a, b) => a + b, 0) / teamStrengths.length;
        const variance = teamStrengths.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / teamStrengths.length;

        // Position-level balance
        let positionImbalance = 0;
        Object.keys(this.positions).forEach(pos => {
            const posStrengths = teams.map(team =>
                team.filter(p => p.assignedPosition === pos).reduce((sum, p) => sum + p.positionRating, 0)
            );
            if (posStrengths.length > 1 && posStrengths.some(s => s > 0)) {
                positionImbalance += (Math.max(...posStrengths) - Math.min(...posStrengths));
            }
        });

        return balance + Math.sqrt(variance) * this.config.adaptiveParameters.varianceWeight + 
               positionImbalance * this.config.adaptiveParameters.positionBalanceWeight;
    }

    /**
     * Enhanced validation of input parameters
     * @param {Object} composition - Position composition
     * @param {number} teamCount - Number of teams
     * @param {Array} players - Available players
     * @returns {Object} Validation result
     */
    enhancedValidate(composition, teamCount, players) {
        const errors = [];
        const warnings = [];
        let totalNeeded = 0;
        
        Object.entries(composition).forEach(([position, count]) => {
            if (count > 0) {
                const needed = count * teamCount;
                const available = players.filter(p => p.positions.includes(position)).length;
                totalNeeded += needed;
                if (available < needed) {
                    errors.push({ 
                        position, 
                        needed, 
                        available, 
                        message: `Not enough ${this.positions[position]}s: need ${needed}, have ${available}` 
                    });
                }
            }
        });
        
        if (players.length < totalNeeded) {
            errors.push({
                message: `Not enough total players: need ${totalNeeded}, have ${players.length}`
            });
        }

        return { isValid: errors.length === 0, errors, warnings };
    }

    /**
     * Group players by their positions
     * @param {Array} players - All players
     * @returns {Object} Players grouped by position
     */
    groupByPosition(players) {
        const grouped = {};
        players.forEach(player => {
            if (player.positions && Array.isArray(player.positions)) {
                player.positions.forEach(position => {
                    if (!grouped[position]) grouped[position] = [];
                    grouped[position].push({ 
                        ...player, 
                        assignedPosition: position, 
                        positionRating: player.ratings[position] || 1500 
                    });
                });
            }
        });
        return grouped;
    }

    /**
     * Adapt parameters based on problem size (placeholder for future enhancements)
     * @param {number} teamCount - Number of teams
     * @param {number} totalPlayers - Total number of players
     */
    adaptParameters(teamCount, totalPlayers) {
        // Future: dynamically adjust algorithm parameters based on problem size
    }
    
    /**
     * Reset algorithm statistics
     */
    resetAlgorithmStats() {
        this.algorithmStats = {
            geneticAlgorithm: { generations: 0, improvements: 0 },
            tabuSearch: { iterations: 0, improvements: 0 },
            simulatedAnnealing: { iterations: 0, improvements: 0, temperature: 0 },
            antColony: { iterations: 0, improvements: 0 },
            constraintProgramming: { iterations: 0, improvements: 0, backtracks: 0, conflicts: 0 },
            localSearch: { iterations: 0, improvements: 0 }
        };
    }

    /**
     * Get algorithm statistics
     * @returns {Object} Statistics for all algorithms
     */
    getAlgorithmStatistics() {
        return this.algorithmStats;
    }
}

export default new TeamOptimizerService();
