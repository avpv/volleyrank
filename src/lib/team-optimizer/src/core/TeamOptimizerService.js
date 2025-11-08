// Team Optimizer Service - Universal team balancing for any sport
// Orchestrates multiple optimization algorithms and manages the optimization lifecycle

import GeneticAlgorithmOptimizer from '../algorithms/GeneticAlgorithmOptimizer.js';
import TabuSearchOptimizer from '../algorithms/TabuSearchOptimizer.js';
import SimulatedAnnealingOptimizer from '../algorithms/SimulatedAnnealingOptimizer.js';
import AntColonyOptimizer from '../algorithms/AntColonyOptimizer.js';
import ConstraintProgrammingOptimizer from '../algorithms/ConstraintProgrammingOptimizer.js';
import LocalSearchOptimizer from '../algorithms/LocalSearchOptimizer.js';

import { sortTeamByPosition, getUnusedPlayers } from '../utils/solutionUtils.js';
import { generateInitialSolutions } from '../utils/solutionGenerators.js';
import { getTeamSize, validateSportConfig } from '../utils/configHelpers.js';

class TeamOptimizerService {
    /**
     * @param {Object} sportConfig - Sport-specific configuration
     * @param {Function} customEvaluationFn - Optional custom evaluation function for team strength
     */
    constructor(sportConfig, customEvaluationFn = null) {
        // Validate sport configuration
        if (!validateSportConfig(sportConfig)) {
            throw new Error('Invalid sport configuration');
        }

        this.sportConfig = sportConfig;
        this.customEvaluationFn = customEvaluationFn;

        // Calculate team size from composition
        this.teamSize = getTeamSize(sportConfig.defaultComposition);

        console.log(`Initialized ${sportConfig.name || 'Team'} Optimizer (${this.teamSize} players per team)`);

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
                maxBacktracks: 10000,
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

        // Log algorithm performance for debugging
        console.log('=== Algorithm Performance ===');
        algorithmNames.forEach((name, idx) => {
            console.log(`${name}: score ${scores[idx].toFixed(2)}`);
        });
        console.log(`Best result from: ${algorithmNames[bestIdx]} (score: ${scores[bestIdx].toFixed(2)})`);
        console.log('============================');

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

        // Sort teams by strength (strongest first) using weighted ratings
        bestTeams.sort((a, b) => {
            const aStrength = this.calculateTeamStrength(a);
            const bStrength = this.calculateTeamStrength(b);
            return bStrength - aStrength;
        });

        // Sort players within each team by position order
        bestTeams.forEach(team => sortTeamByPosition(team, this.sportConfig.positionOrder));

        const balance = this.evaluateBalance(bestTeams);
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
     * Calculate team strength using sport-specific position weights
     * @param {Array} team - Team to evaluate
     * @returns {number} Team strength
     */
    calculateTeamStrength(team) {
        if (!team || !Array.isArray(team)) return 0;

        let totalRating = 0;
        let totalWeight = 0;

        team.forEach(player => {
            const position = player.assignedPosition;
            const rating = player.positionRating || 1500;
            const weight = this.sportConfig.positionWeights[position] || 1.0;

            totalRating += rating * weight;
            totalWeight += weight;
        });

        return totalWeight > 0 ? totalRating / totalWeight : 0;
    }

    /**
     * Evaluate balance of multiple teams
     * @param {Array} teams - Teams to evaluate
     * @returns {Object} Balance metrics
     */
    evaluateBalance(teams) {
        const teamStrengths = teams.map(team => this.calculateTeamStrength(team));

        const maxStrength = Math.max(...teamStrengths);
        const minStrength = Math.min(...teamStrengths);
        const avgStrength = teamStrengths.reduce((a, b) => a + b, 0) / teamStrengths.length;
        const variance = teamStrengths.reduce((sum, s) => sum + Math.pow(s - avgStrength, 2), 0) / teamStrengths.length;
        const stdDev = Math.sqrt(variance);

        return {
            difference: maxStrength - minStrength,
            variance,
            standardDeviation: stdDev,
            average: avgStrength,
            min: minStrength,
            max: maxStrength,
            teamStrengths
        };
    }

    /**
     * Run all enabled optimization algorithms in parallel
     * Each algorithm now starts from a randomly selected initial solution for diversity
     * @param {Array} initialSolutions - Initial candidate solutions
     * @param {Object} problemContext - Problem context
     * @returns {Promise<Object>} Results and algorithm names
     */
    async runOptimizationAlgorithms(initialSolutions, problemContext) {
        const algorithmPromises = [];
        const algorithmNames = [];

        // Helper to get a random initial solution
        const getRandomInitialSolution = () => {
            return initialSolutions[Math.floor(Math.random() * initialSolutions.length)];
        };

        // Genetic Algorithm - uses entire population
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

        // Tabu Search (Multi-Start with random starting points)
        if (this.config.useTabuSearch) {
            const startCount = Math.min(3, initialSolutions.length);
            const tabuResults = [];

            for (let i = 0; i < startCount; i++) {
                const optimizer = new TabuSearchOptimizer(
                    this.algorithmConfigs.tabuSearch,
                    this.config.adaptiveParameters
                );
                // Each run starts from a different random solution
                const context = { ...problemContext, initialSolution: getRandomInitialSolution() };
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

        // Simulated Annealing - now uses random initial solution
        if (this.config.useSimulatedAnnealing) {
            const optimizer = new SimulatedAnnealingOptimizer(
                this.algorithmConfigs.simulatedAnnealing,
                this.config.adaptiveParameters
            );
            // Use random starting point for diversity
            const context = { ...problemContext, initialSolution: getRandomInitialSolution() };
            algorithmPromises.push(
                optimizer.solve(context).then(result => {
                    this.algorithmStats.simulatedAnnealing = optimizer.getStatistics();
                    return result;
                })
            );
            algorithmNames.push('Simulated Annealing');
        }

        // Ant Colony Optimization - constructs solutions from scratch (inherently diverse)
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

        // Constraint Programming - constructs solutions from scratch (inherently diverse)
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

        // Use Promise.allSettled to handle individual algorithm failures gracefully
        const settledResults = await Promise.allSettled(algorithmPromises);

        // Filter out rejected promises and log failures
        const results = [];
        const successfulAlgorithmNames = [];
        settledResults.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
                successfulAlgorithmNames.push(algorithmNames[idx]);
            } else {
                console.error(`Algorithm ${algorithmNames[idx]} failed:`, result.reason);
            }
        });

        // Ensure we have at least one result
        if (results.length === 0) {
            console.warn('All algorithms failed, using first initial solution');
            return {
                results: [initialSolutions[0]],
                algorithmNames: ['Fallback (Initial Solution)']
            };
        }

        return { results, algorithmNames: successfulAlgorithmNames };
    }

    /**
     * Evaluate solution quality (lower is better)
     * Uses position-weighted ratings for more accurate team balance
     * @param {Array} teams - Solution to evaluate
     * @returns {number} Quality score
     */
    evaluateSolution(teams) {
        // Use custom evaluation function if provided
        if (this.customEvaluationFn) {
            return this.customEvaluationFn(teams, this);
        }

        // Default evaluation
        if (!teams || !Array.isArray(teams) || teams.length === 0) return Infinity;

        // Use weighted ratings for team strength calculation
        const teamStrengths = teams.map(team => {
            if (!Array.isArray(team)) return 0;
            return this.calculateTeamStrength(team);
        });

        if (teamStrengths.some(isNaN)) return Infinity;

        const balance = Math.max(...teamStrengths) - Math.min(...teamStrengths);
        const avg = teamStrengths.reduce((a, b) => a + b, 0) / teamStrengths.length;
        const variance = teamStrengths.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / teamStrengths.length;

        // Position-level balance with position weights applied
        let positionImbalance = 0;
        Object.keys(this.sportConfig.positions).forEach(pos => {
            const positionWeight = this.sportConfig.positionWeights[pos] || 1.0;
            const posStrengths = teams.map(team =>
                team.filter(p => p.assignedPosition === pos)
                    .reduce((sum, p) => sum + (p.positionRating * positionWeight), 0)
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
                        message: `Not enough ${this.sportConfig.positions[position] || position}s: need ${needed}, have ${available}`
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

export default TeamOptimizerService;
