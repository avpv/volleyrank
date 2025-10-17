/**
 * TeamOptimizerService - Advanced team balancing with hybrid algorithms
 * Uses Genetic Algorithm, Simulated Annealing, and Tabu Search with hyper-heuristic layer
 */
import eloService from './EloService.js';

// ========== CONSTANTS AND CONFIGURATION ==========

const ALGORITHM_NAMES = {
    GENETIC: 'Genetic Algorithm',
    TABU: 'Tabu Search', 
    ANNEALING: 'Simulated Annealing',
    LOCAL: 'Local Search'
};

const POSITIONS = {
    'S': 'Setter',
    'OPP': 'Opposite', 
    'OH': 'Outside Hitter',
    'MB': 'Middle Blocker',
    'L': 'Libero'
};

const DEFAULT_CONFIG = {
    useGeneticAlgorithm: true,
    useTabuSearch: true,
    useSimulatedAnnealing: true,
    adaptiveParameters: {
        positionBalanceWeight: 0.3,
        varianceWeight: 0.5
    },
    algorithms: {
        geneticAlgorithm: {
            populationSize: 20,
            generationCount: 100,
            mutationRate: 0.15,
            crossoverRate: 0.7,
            elitismCount: 2,
            tournamentSize: 3,
            maxStagnation: 20,
            useHyperHeuristic: true
        },
        tabuSearch: {
            tabuTenure: 50,
            iterations: 5000,
            neighborCount: 20,
            aspirationCriteria: true,
            diversification: { enabled: true, frequency: 1000 },
            useHyperHeuristic: true
        },
        simulatedAnnealing: {
            initialTemperature: 1000,
            coolingRate: 0.995,
            iterations: 50000,
            reheatEnabled: true,
            reheatTemperature: 500,
            reheatIterations: 10000,
            equilibriumIterations: 100,
            useHyperHeuristic: true
        },
        localSearch: {
            iterations: 1000,
            searchStrategy: 'first-improvement', // 'first-improvement' or 'best-improvement'
            neighborhoodSize: 10,
            perturbationEnabled: true,
            perturbationStrength: 0.1,
            useHyperHeuristic: true
        }
    }
};

// ========== UTILITY FUNCTIONS ==========

/**
 * Deep merge utility with proper object checking
 */
function deepMerge(target, source) {
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

/**
 * Yield to event loop to prevent blocking
 */
function yieldToEventLoop() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

// ========== HEURISTIC MANAGER ==========

/**
 * Manages heuristic operator selection with adaptive scoring
 */
class HeuristicManager {
    constructor(operators, rewardMultiplier = 1.0) {
        this.operators = operators;
        this.scores = Object.fromEntries(operators.map(op => [op.name, 1.0]));
        this.rewardMultiplier = rewardMultiplier;
        this.decayRate = 0.98;
        this.minScore = 0.1;
    }

    selectOperator() {
        const totalScore = Object.values(this.scores).reduce((sum, score) => sum + score, 0);
        let randomPick = Math.random() * totalScore;
        
        for (const operator of this.operators) {
            randomPick -= this.scores[operator.name];
            if (randomPick <= 0) return operator;
        }
        
        return this.operators[0];
    }

    updateScore(operatorName, improvement) {
        // Apply decay to all scores
        for (const name in this.scores) {
            this.scores[name] = Math.max(this.minScore, this.scores[name] * this.decayRate);
        }
        
        // Reward operator that caused improvement
        if (improvement > 0) {
            this.scores[operatorName] += (1 + Math.log1p(improvement)) * this.rewardMultiplier;
        }
    }
}

// ========== VALIDATION SERVICE ==========

class ValidationService {
    constructor(positions) {
        this.positions = positions;
    }

    validateInput(composition, teamCount, players) {
        const errors = [];

        if (!composition || typeof composition !== 'object') {
            errors.push('Invalid composition: must be an object');
        }
        if (!Number.isInteger(teamCount) || teamCount <= 0) {
            errors.push('Invalid team count: must be positive integer');
        }
        if (!Array.isArray(players) || players.length === 0) {
            errors.push('Invalid players: must be non-empty array');
        }

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
    }

    validateComposition(composition, teamCount, players) {
        const playersByPosition = this.groupPlayersByPosition(players);
        const errors = [];
        const warnings = [];
        let totalNeeded = 0;

        Object.entries(composition).forEach(([position, count]) => {
            const needed = count * teamCount;
            const available = playersByPosition[position]?.length || 0;
            totalNeeded += needed;

            if (available < needed) {
                errors.push({
                    position,
                    needed,
                    available,
                    shortage: needed - available,
                    message: `Not enough ${this.positions[position]}s: need ${needed}, have ${available}`
                });
            } else if (available === needed) {
                warnings.push({
                    position,
                    message: `Exact match for ${this.positions[position]}s - no substitutes available`
                });
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            totalNeeded,
            totalAvailable: players.length,
            unusedPlayers: players.length - totalNeeded,
            playersPerTeam: totalNeeded / teamCount
        };
    }

    groupPlayersByPosition(players) {
        const grouped = Object.keys(this.positions).reduce((acc, pos) => {
            acc[pos] = [];
            return acc;
        }, {});

        players.forEach(player => {
            player.positions?.forEach(position => {
                if (grouped[position]) {
                    grouped[position].push({
                        ...player,
                        assignedPosition: position,
                        positionRating: player.ratings[position] || 1500,
                        rating: player.ratings[position] || 1500
                    });
                }
            });
        });

        return grouped;
    }
}

// ========== SOLUTION GENERATOR ==========

class SolutionGenerator {
    constructor(validationService) {
        this.validationService = validationService;
    }

    generateInitialSolutions(composition, teamCount, playersByPosition) {
        return [
            this.createBalancedSolution(composition, teamCount, playersByPosition),
            this.createSnakeDraftSolution(composition, teamCount, playersByPosition),
            ...Array.from({ length: 3 }, () => 
                this.createRandomSolution(composition, teamCount, playersByPosition)
            ),
            this.createPositionFocusedSolution(composition, teamCount, playersByPosition)
        ];
    }

    createBalancedSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        
        const positionOrder = this.getPositionOrderByScarcity(composition, teamCount, playersByPosition);
        
        positionOrder.forEach(([position, neededCount]) => {
            const totalNeeded = neededCount * teamCount;
            const players = this.getAvailablePlayers(playersByPosition[position], usedIds, totalNeeded);
            
            this.distributePlayersRoundRobin(teams, players, neededCount, usedIds);
        });
        
        return teams;
    }

    createSnakeDraftSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();

        const positionOrder = this.getPositionOrderByScarcity(composition, teamCount, playersByPosition);

        positionOrder.forEach(([position, neededCount]) => {
            const totalNeeded = neededCount * teamCount;
            const players = this.getAvailablePlayers(playersByPosition[position], usedIds, totalNeeded);

            this.distributePlayersSnakeDraft(teams, players, neededCount, usedIds);
        });

        return teams;
    }

    createRandomSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();

        const positionOrder = this.getPositionOrderByScarcity(composition, teamCount, playersByPosition);

        positionOrder.forEach(([position, neededCount]) => {
            const totalNeeded = neededCount * teamCount;
            let players = this.getAvailablePlayers(playersByPosition[position], usedIds, totalNeeded);
            
            players = this.shuffleArray(players);

            this.distributePlayersSequentially(teams, players, neededCount, usedIds);
        });

        return teams;
    }

    createPositionFocusedSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        
        const positionPriority = ['S', 'OPP', 'OH', 'MB', 'L'];
        const positionOrder = Object.entries(composition)
            .filter(([pos, count]) => count > 0)
            .sort((a, b) => {
                const aPriority = positionPriority.indexOf(a[0]);
                const bPriority = positionPriority.indexOf(b[0]);
                return aPriority - bPriority;
            });
        
        positionOrder.forEach(([position, neededCount]) => {
            const totalNeeded = neededCount * teamCount;
            const players = this.getAvailablePlayers(playersByPosition[position], usedIds, totalNeeded);
            
            this.distributePlayersByRound(teams, players, neededCount, usedIds);
        });
        
        return teams;
    }

    // Helper methods for solution generation
    getPositionOrderByScarcity(composition, teamCount, playersByPosition) {
        return Object.entries(composition)
            .filter(([pos, count]) => count > 0)
            .sort((a, b) => {
                const aAvail = (playersByPosition[a[0]] || []).length;
                const bAvail = (playersByPosition[b[0]] || []).length;
                const aRatio = aAvail / (a[1] * teamCount);
                const bRatio = bAvail / (b[1] * teamCount);
                return aRatio - bRatio;
            });
    }

    getAvailablePlayers(players, usedIds, totalNeeded) {
        return (players || [])
            .filter(p => !usedIds.has(p.id))
            .sort((a, b) => b.positionRating - a.positionRating)
            .slice(0, totalNeeded);
    }

    distributePlayersRoundRobin(teams, players, neededCount, usedIds) {
        for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {
            for (let i = 0; i < neededCount; i++) {
                const playerIdx = teamIdx * neededCount + i;
                if (playerIdx < players.length) {
                    teams[teamIdx].push(players[playerIdx]);
                    usedIds.add(players[playerIdx].id);
                }
            }
        }
    }

    distributePlayersSnakeDraft(teams, players, neededCount, usedIds) {
        let playerIndex = 0;
        for (let round = 0; round < neededCount; round++) {
            const isEvenRound = round % 2 === 0;
            
            for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {
                if (playerIndex < players.length) {
                    const actualTeamIdx = isEvenRound ? teamIdx : (teams.length - 1 - teamIdx);
                    teams[actualTeamIdx].push(players[playerIndex]);
                    usedIds.add(players[playerIndex].id);
                    playerIndex++;
                }
            }
        }
    }

    distributePlayersSequentially(teams, players, neededCount, usedIds) {
        for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {
            for (let i = 0; i < neededCount; i++) {
                const playerIdx = teamIdx * neededCount + i;
                if (playerIdx < players.length) {
                    teams[teamIdx].push(players[playerIdx]);
                    usedIds.add(players[playerIdx].id);
                }
            }
        }
    }

    distributePlayersByRound(teams, players, neededCount, usedIds) {
        for (let i = 0; i < neededCount; i++) {
            for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {
                const playerIdx = teamIdx * neededCount + i;
                if (playerIdx < players.length) {
                    teams[teamIdx].push(players[playerIdx]);
                    usedIds.add(players[playerIdx].id);
                }
            }
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// ========== SOLUTION EVALUATOR ==========

class SolutionEvaluator {
    constructor(config) {
        this.config = config;
    }

    evaluateSolution(teams) {
        if (!teams?.length) return Infinity;

        const teamStrengths = teams.map(team => 
            eloService.calculateTeamStrength(team).totalRating
        );

        const balanceScore = Math.max(...teamStrengths) - Math.min(...teamStrengths);
        const varianceScore = this.calculateVariance(teamStrengths);
        const positionImbalanceScore = this.calculatePositionImbalance(teams);

        return balanceScore + 
               Math.sqrt(varianceScore) * this.config.adaptiveParameters.varianceWeight + 
               positionImbalanceScore * this.config.adaptiveParameters.positionBalanceWeight;
    }

    calculateVariance(teamStrengths) {
        const avg = teamStrengths.reduce((a, b) => a + b, 0) / teamStrengths.length;
        return teamStrengths.reduce((sum, strength) => 
            sum + Math.pow(strength - avg, 2), 0) / teamStrengths.length;
    }

    calculatePositionImbalance(teams) {
        return Object.keys(POSITIONS).reduce((totalImbalance, position) => {
            const positionStrengths = teams.map(team =>
                team.filter(player => player.assignedPosition === position)
                    .reduce((sum, player) => sum + player.positionRating, 0)
            );

            const validStrengths = positionStrengths.filter(strength => strength > 0);
            if (validStrengths.length === 0) return totalImbalance;

            return totalImbalance + (Math.max(...validStrengths) - Math.min(...validStrengths));
        }, 0);
    }

    sortTeamsByStrength(teams) {
        return [...teams].sort((a, b) => 
            eloService.calculateTeamStrength(b).totalRating - 
            eloService.calculateTeamStrength(a).totalRating
        );
    }
}

// ========== HEURISTIC OPERATORS ==========

class HeuristicOperators {
    static performSwap(teams, positions) {
        if (teams.length < 2) return false;

        const [team1Index, team2Index] = HeuristicOperators.selectDistinctRandomTeams(teams.length);
        const position = HeuristicOperators.selectRandomPosition(positions);

        return HeuristicOperators.swapPlayersBetweenTeams(teams, team1Index, team2Index, position);
    }

    static performAdaptiveSwap(teams, positions) {
        const teamStrengths = teams.map((team, idx) => ({ 
            idx, 
            strength: eloService.calculateTeamStrength(team).totalRating 
        })).sort((a, b) => b.strength - a.strength);
        
        const strongestIdx = teamStrengths[0].idx;
        const weakestIdx = teamStrengths[teamStrengths.length - 1].idx;
        
        if (strongestIdx !== weakestIdx && Math.random() < 0.7) {
            const position = HeuristicOperators.selectRandomPosition(positions);
            
            const strongPlayers = teams[strongestIdx].filter(p => p.assignedPosition === position);
            const weakPlayers = teams[weakestIdx].filter(p => p.assignedPosition === position);
            
            if (strongPlayers.length > 0 && weakPlayers.length > 0) {
                const weakestInStrong = strongPlayers.reduce((min, p) => 
                    p.positionRating < min.positionRating ? p : min
                );
                const strongestInWeak = weakPlayers.reduce((max, p) => 
                    p.positionRating > max.positionRating ? p : max
                );
                
                return HeuristicOperators.swapSpecificPlayers(
                    teams, strongestIdx, weakestInStrong, weakestIdx, strongestInWeak
                );
            }
        }
        return HeuristicOperators.performSwap(teams, positions);
    }

    static performDoubleSwap(teams, positions) {
        if (teams.length < 2) return HeuristicOperators.performSwap(teams, positions);

        const teamStrengths = teams.map((team, idx) => ({ 
            idx, 
            strength: eloService.calculateTeamStrength(team).totalRating 
        })).sort((a, b) => b.strength - a.strength);
        
        const strongestIdx = teamStrengths[0].idx;
        const weakestIdx = teamStrengths[teamStrengths.length - 1].idx;
        
        if (strongestIdx === weakestIdx) return HeuristicOperators.performSwap(teams, positions);

        const [position1, position2] = HeuristicOperators.selectDistinctPositions(positions);
        let swapped = false;

        if (HeuristicOperators.swapPlayersBetweenTeams(teams, strongestIdx, weakestIdx, position1)) {
            swapped = true;
        }
        if (HeuristicOperators.swapPlayersBetweenTeams(teams, strongestIdx, weakestIdx, position2)) {
            swapped = true;
        }

        return swapped;
    }

    static smartMutate(teams, positions) {
        const positionImbalances = positions.map(pos => {
            const posStrengths = teams.map(team => 
                team.filter(p => p.assignedPosition === pos)
                    .reduce((sum, p) => sum + p.positionRating, 0)
            );
            return { 
                pos, 
                imbalance: Math.max(...posStrengths) - Math.min(...posStrengths) 
            };
        }).sort((a, b) => b.imbalance - a.imbalance);
        
        const swapCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < swapCount; i++) {
            const useProblematic = Math.random() < 0.6;
            const position = useProblematic && positionImbalances.length > 0 
                ? positionImbalances[0].pos 
                : HeuristicOperators.selectRandomPosition(positions);
            
            HeuristicOperators.performAdaptiveSwap(teams, [position]);
        }
    }

    static disruptiveMutate(teams, positions) { 
        HeuristicOperators.performDoubleSwap(teams, positions); 
    }

    // Helper methods
    static selectDistinctRandomTeams(teamCount) {
        const t1 = Math.floor(Math.random() * teamCount);
        let t2;
        do { 
            t2 = Math.floor(Math.random() * teamCount); 
        } while (t1 === t2);
        return [t1, t2];
    }

    static selectRandomPosition(positions) {
        return positions[Math.floor(Math.random() * positions.length)];
    }

    static selectDistinctPositions(positions) {
        const pos1 = positions[Math.floor(Math.random() * positions.length)];
        let pos2;
        do { 
            pos2 = positions[Math.floor(Math.random() * positions.length)]; 
        } while (positions.length > 1 && pos1 === pos2);
        return [pos1, pos2];
    }

    static swapPlayersBetweenTeams(teams, team1Index, team2Index, position) {
        const team1Players = teams[team1Index].filter(p => p.assignedPosition === position);
        const team2Players = teams[team2Index].filter(p => p.assignedPosition === position);
        
        if (team1Players.length > 0 && team2Players.length > 0) {
            const player1 = team1Players[Math.floor(Math.random() * team1Players.length)];
            const player2 = team2Players[Math.floor(Math.random() * team2Players.length)];
            
            return HeuristicOperators.swapSpecificPlayers(teams, team1Index, player1, team2Index, player2);
        }
        return false;
    }

    static swapSpecificPlayers(teams, team1Index, player1, team2Index, player2) {
        const idx1 = teams[team1Index].findIndex(p => p.id === player1.id);
        const idx2 = teams[team2Index].findIndex(p => p.id === player2.id);
        
        if (idx1 !== -1 && idx2 !== -1) {
            [teams[team1Index][idx1], teams[team2Index][idx2]] = 
            [teams[team2Index][idx2], teams[team1Index][idx1]];
            return true;
        }
        return false;
    }
}

// ========== MAIN TEAM OPTIMIZER SERVICE ==========

class TeamOptimizerService {
    constructor(userConfig = {}) {
        this.config = deepMerge(DEFAULT_CONFIG, userConfig);
        this.positions = POSITIONS;
        
        // Initialize services
        this.validationService = new ValidationService(this.positions);
        this.solutionGenerator = new SolutionGenerator(this.validationService);
        this.solutionEvaluator = new SolutionEvaluator(this.config);
        this.heuristicOperators = HeuristicOperators;
    }

    async optimize(composition, teamCount, players) {
        // Input validation
        this.validationService.validateInput(composition, teamCount, players);
        const validation = this.validationService.validateComposition(composition, teamCount, players);
        if (!validation.isValid) {
            throw new Error(validation.errors.map(e => e.message).join(', '));
        }

        // Adaptive parameter tuning
        this.adaptParameters(teamCount, players.length);
        
        // Create optimization context
        const context = this.createOptimizationContext(composition, teamCount, players);
        
        // Execute optimization algorithms
        const results = await this.executeAlgorithms(context);
        
        // Format and return final result
        return this.formatFinalResult(results, context);
    }

    createOptimizationContext(composition, teamCount, players) {
        const playersByPosition = this.validationService.groupPlayersByPosition(players);
        const positions = Object.keys(composition).filter(pos => composition[pos] > 0);
        const initialSolutions = this.solutionGenerator.generateInitialSolutions(
            composition, teamCount, playersByPosition
        );

        return {
            composition,
            teamCount,
            players,
            playersByPosition,
            positions,
            initialSolutions,
            stats: this.createEmptyStats(),
            config: this.config,
            heuristicManagers: this.createHeuristicManagers()
        };
    }

    createHeuristicManagers() {
        const neighborhoodOperators = [
            { name: 'simpleSwap', execute: this.heuristicOperators.performSwap },
            { name: 'adaptiveSwap', execute: this.heuristicOperators.performAdaptiveSwap },
            { name: 'doubleSwap', execute: this.heuristicOperators.performDoubleSwap }
        ];

        const mutationOperators = [
            { name: 'smartMutate', execute: this.heuristicOperators.smartMutate },
            { name: 'disruptiveMutate', execute: this.heuristicOperators.disruptiveMutate }
        ];

        return {
            neighborhood: new HeuristicManager(neighborhoodOperators, 2.0),
            mutation: new HeuristicManager(mutationOperators, 1.5)
        };
    }

    // ========== ALGORITHM EXECUTION ==========

    async executeAlgorithms(context) {
        const algorithmPromises = [];
        const algorithmNames = [];

        if (this.config.useGeneticAlgorithm) {
            algorithmPromises.push(this.runGeneticAlgorithm(context));
            algorithmNames.push(ALGORITHM_NAMES.GENETIC);
        }
        if (this.config.useTabuSearch) {
            algorithmPromises.push(this.runTabuSearch(context));
            algorithmNames.push(ALGORITHM_NAMES.TABU);
        }
        if (this.config.useSimulatedAnnealing) {
            algorithmPromises.push(this.runSimulatedAnnealing(context));
            algorithmNames.push(ALGORITHM_NAMES.ANNEALING);
        }

        // Ensure at least one algorithm runs
        if (algorithmPromises.length === 0) {
            algorithmPromises.push(this.runGeneticAlgorithm(context));
            algorithmNames.push(ALGORITHM_NAMES.GENETIC);
        }

        const results = await Promise.all(algorithmPromises);
        return this.selectBestResult(results, algorithmNames, context);
    }

    selectBestResult(results, algorithmNames, context) {
        const scoredResults = results.map((solution, index) => ({
            solution,
            score: this.solutionEvaluator.evaluateSolution(solution),
            algorithm: algorithmNames[index]
        }));

        const bestResult = scoredResults.reduce((best, current) => 
            current.score < best.score ? current : best
        );

        return {
            ...bestResult,
            context
        };
    }

    async formatFinalResult(bestResult, context) {
        const refinedTeams = await this.runLocalSearch(bestResult.solution, context);
        const sortedTeams = this.solutionEvaluator.sortTeamsByStrength(refinedTeams);

        return {
            teams: sortedTeams,
            balance: eloService.evaluateBalance(sortedTeams),
            unusedPlayers: this.getUnusedPlayers(sortedTeams, context.players),
            validation: this.validationService.validateComposition(
                context.composition, context.teamCount, context.players
            ),
            algorithm: bestResult.algorithm,
            statistics: this.collectStatistics(context.stats)
        };
    }

    // ========== ALGORITHM IMPLEMENTATIONS ==========

    async runGeneticAlgorithm(context) {
        const config = context.config.algorithms.geneticAlgorithm;
        const { heuristicManagers, composition, teamCount, playersByPosition, positions } = context;
        
        let population = this.initializeGeneticPopulation(context);
        let bestScore = Infinity;
        let stagnationCount = 0;

        for (let generation = 0; generation < config.generationCount; generation++) {
            context.stats.geneticAlgorithm.generations = generation + 1;
            
            const scoredPopulation = this.scorePopulation(population);
            const generationBestScore = scoredPopulation[0].score;

            if (generationBestScore < bestScore) {
                bestScore = generationBestScore;
                stagnationCount = 0;
                context.stats.geneticAlgorithm.improvements++;
            } else {
                stagnationCount++;
            }

            population = this.createNewGeneration(scoredPopulation, config, composition, heuristicManagers.mutation);
            
            if (stagnationCount >= config.maxStagnation) {
                this.diversifyPopulation(population, composition, teamCount, playersByPosition);
                stagnationCount = 0;
            }

            if (generation % 10 === 0) await yieldToEventLoop();
        }

        return this.selectBestSolution(population);
    }

    async runSimulatedAnnealing(context) {
        const config = context.config.algorithms.simulatedAnnealing;
        const { heuristicManagers, positions } = context;
        
        let currentSolution = this.cloneTeams(context.initialSolutions[0]);
        let bestSolution = this.cloneTeams(currentSolution);
        let currentScore = this.solutionEvaluator.evaluateSolution(currentSolution);
        let bestScore = currentScore;
        
        let temperature = config.initialTemperature;
        let iterationsWithoutImprovement = 0;
        let acceptedInEquilibrium = 0;

        for (let iteration = 0; iteration < config.iterations; iteration++) {
            context.stats.simulatedAnnealing.iterations = iteration + 1;
            context.stats.simulatedAnnealing.temperature = temperature;

            const neighbor = this.generateNeighbor(currentSolution, positions, heuristicManagers.neighborhood);
            const neighborScore = this.solutionEvaluator.evaluateSolution(neighbor);
            const scoreDelta = neighborScore - currentScore;

            if (this.shouldAcceptSolution(scoreDelta, temperature)) {
                currentSolution = neighbor;
                currentScore = neighborScore;
                acceptedInEquilibrium++;

                if (neighborScore < bestScore) {
                    bestSolution = this.cloneTeams(neighbor);
                    bestScore = neighborScore;
                    iterationsWithoutImprovement = 0;
                    context.stats.simulatedAnnealing.improvements++;
                } else {
                    iterationsWithoutImprovement++;
                }
            }

            temperature = this.updateTemperature(temperature, config, iteration, acceptedInEquilibrium);
            
            if (this.shouldReheat(config, iterationsWithoutImprovement, temperature)) {
                temperature = config.reheatTemperature;
                iterationsWithoutImprovement = 0;
            }

            if (iteration % 5000 === 0) await yieldToEventLoop();
        }

        return bestSolution;
    }

    async runTabuSearch(context) {
        const config = context.config.algorithms.tabuSearch;
        const { heuristicManagers, positions, composition, teamCount, playersByPosition } = context;
        
        let currentSolution = this.cloneTeams(context.initialSolutions[0]);
        let bestSolution = this.cloneTeams(currentSolution);
        let currentScore = this.solutionEvaluator.evaluateSolution(currentSolution);
        let bestScore = currentScore;
        
        const tabuList = [];
        let iterationsWithoutImprovement = 0;

        for (let iteration = 0; iteration < config.iterations; iteration++) {
            context.stats.tabuSearch.iterations = iteration + 1;

            const neighbors = this.generateNeighborhood(
                currentSolution, positions, config.neighborCount, heuristicManagers.neighborhood
            );

            const bestNeighbor = this.findBestNonTabuNeighbor(neighbors, tabuList, bestScore, config.aspirationCriteria);
            
            if (bestNeighbor) {
                currentSolution = bestNeighbor.solution;
                currentScore = bestNeighbor.score;

                tabuList.push(this.hashSolution(currentSolution));
                this.manageTabuListSize(tabuList, config.tabuTenure);

                if (currentScore < bestScore) {
                    bestSolution = this.cloneTeams(currentSolution);
                    bestScore = currentScore;
                    iterationsWithoutImprovement = 0;
                    context.stats.tabuSearch.improvements++;
                } else {
                    iterationsWithoutImprovement++;
                }
            }

            if (this.shouldDiversify(config, iterationsWithoutImprovement)) {
                currentSolution = this.solutionGenerator.createRandomSolution(composition, teamCount, playersByPosition);
                currentScore = this.solutionEvaluator.evaluateSolution(currentSolution);
                iterationsWithoutImprovement = 0;
            }

            if (iteration % 500 === 0) await yieldToEventLoop();
        }

        return bestSolution;
    }

    async runLocalSearch(initialSolution, context, maxIterations = null) {
        const config = context.config.algorithms.localSearch;
        const { heuristicManagers, positions } = context;
        
        const iterations = maxIterations || config.iterations;
        let currentSolution = this.cloneTeams(initialSolution);
        let improved = true;
        let iteration = 0;

        while (improved && iteration < iterations) {
            iteration++;
            context.stats.localSearch.iterations = iteration;

            const neighbors = this.generateNeighborhood(
                currentSolution, positions, config.neighborhoodSize, heuristicManagers.neighborhood
            );

            const currentScore = this.solutionEvaluator.evaluateSolution(currentSolution);
            const bestNeighbor = this.findBestNeighbor(neighbors);

            if (bestNeighbor && bestNeighbor.score < currentScore) {
                currentSolution = bestNeighbor.solution;
                context.stats.localSearch.improvements++;
                
                if (config.searchStrategy === 'first-improvement') {
                    // Continue with next iteration
                    continue;
                }
            } else {
                improved = false;
            }

            if (config.perturbationEnabled && !improved) {
                this.perturbSolution(currentSolution, positions, config.perturbationStrength);
                improved = true;
            }

            if (iteration % 100 === 0) await yieldToEventLoop();
        }

        return currentSolution;
    }

    // ========== ALGORITHM HELPER METHODS ==========

    initializeGeneticPopulation(context) {
        const { initialSolutions, config } = context;
        const population = [...initialSolutions];
        
        while (population.length < config.algorithms.geneticAlgorithm.populationSize) {
            population.push(this.solutionGenerator.createRandomSolution(
                context.composition, context.teamCount, context.playersByPosition
            ));
        }
        
        return population;
    }

    scorePopulation(population) {
        return population.map(teams => ({
            teams,
            score: this.solutionEvaluator.evaluateSolution(teams)
        })).sort((a, b) => a.score - b.score);
    }

    createNewGeneration(scoredPopulation, config, composition, mutationManager) {
        const newPopulation = scoredPopulation
            .slice(0, config.elitismCount)
            .map(s => this.cloneTeams(s.teams));

        while (newPopulation.length < config.populationSize) {
            const parent1 = this.tournamentSelection(scoredPopulation, config.tournamentSize);
            const parent2 = this.tournamentSelection(scoredPopulation, config.tournamentSize);
            
            const child = Math.random() < config.crossoverRate
                ? this.enhancedCrossover(parent1, parent2, composition)
                : this.cloneTeams(parent1);
            
            newPopulation.push(child);
        }

        // Apply mutation
        for (let i = config.elitismCount; i < newPopulation.length; i++) {
            if (Math.random() < config.mutationRate) {
                this.applyMutation(newPopulation[i], context.positions, mutationManager, config.useHyperHeuristic);
            }
        }

        return newPopulation;
    }

    applyMutation(teams, positions, mutationManager, useHyperHeuristic) {
        if (useHyperHeuristic && mutationManager) {
            const oldScore = this.solutionEvaluator.evaluateSolution(teams);
            const operator = mutationManager.selectOperator();
            operator.execute(teams, positions);
            const newScore = this.solutionEvaluator.evaluateSolution(teams);
            mutationManager.updateScore(operator.name, oldScore - newScore);
        } else {
            this.heuristicOperators.smartMutate(teams, positions);
        }
    }

    tournamentSelection(scoredPopulation, tournamentSize) {
        let best = null;
        for (let i = 0; i < tournamentSize; i++) {
            const candidate = scoredPopulation[Math.floor(Math.random() * scoredPopulation.length)];
            if (!best || candidate.score < best.score) {
                best = candidate;
            }
        }
        return best.teams;
    }

    diversifyPopulation(population, composition, teamCount, playersByPosition) {
        const keepCount = Math.floor(population.length * 0.3);
        for (let i = keepCount; i < population.length; i++) {
            if (Math.random() < 0.7) {
                population[i] = this.solutionGenerator.createRandomSolution(composition, teamCount, playersByPosition);
            } else {
                population[i] = this.solutionGenerator.createPositionFocusedSolution(composition, teamCount, playersByPosition);
            }
        }
    }

    selectBestSolution(population) {
        const scored = this.scorePopulation(population);
        return scored[0].teams;
    }

    // Simulated Annealing helpers
    shouldAcceptSolution(delta, temperature) {
        return delta < 0 || Math.random() < Math.exp(-delta / temperature);
    }

    updateTemperature(temperature, config, iteration, acceptedInEquilibrium) {
        if (iteration > 0 && iteration % config.equilibriumIterations === 0) {
            return temperature * config.coolingRate;
        }
        return temperature;
    }

    shouldReheat(config, iterationsWithoutImprovement, temperature) {
        return config.reheatEnabled && 
               iterationsWithoutImprovement > config.reheatIterations && 
               temperature < config.reheatTemperature;
    }

    // Tabu Search helpers
    generateNeighborhood(solution, positions, size, heuristicManager) {
        const neighborhood = [];
        for (let i = 0; i < size; i++) {
            const neighbor = this.cloneTeams(solution);
            let operatorName = 'default';
            
            if (heuristicManager) {
                const operator = heuristicManager.selectOperator();
                operator.execute(neighbor, positions);
                operatorName = operator.name;
            } else {
                this.heuristicOperators.performAdaptiveSwap(neighbor, positions);
            }
            
            neighborhood.push({
                solution: neighbor,
                score: this.solutionEvaluator.evaluateSolution(neighbor),
                operatorName
            });
        }
        return neighborhood;
    }

    findBestNonTabuNeighbor(neighbors, tabuList, bestScore, aspirationCriteria) {
        let bestNeighbor = null;
        
        for (const neighbor of neighbors) {
            const isTabu = tabuList.includes(this.hashSolution(neighbor.solution));
            const satisfiesAspiration = aspirationCriteria && neighbor.score < bestScore;
            
            if ((!isTabu || satisfiesAspiration) && 
                (!bestNeighbor || neighbor.score < bestNeighbor.score)) {
                bestNeighbor = neighbor;
            }
        }
        
        return bestNeighbor;
    }

    findBestNeighbor(neighbors) {
        return neighbors.reduce((best, current) => 
            !best || current.score < best.score ? current : best, null
        );
    }

    manageTabuListSize(tabuList, maxSize) {
        while (tabuList.length > maxSize) {
            tabuList.shift();
        }
    }

    shouldDiversify(config, iterationsWithoutImprovement) {
        return config.diversification.enabled && 
               iterationsWithoutImprovement > config.diversification.frequency;
    }

    // Local Search helpers
    perturbSolution(teams, positions, strength) {
        const perturbationCount = Math.max(1, Math.floor(teams.length * positions.length * strength));
        
        for (let i = 0; i < perturbationCount; i++) {
            this.heuristicOperators.performSwap(teams, positions);
        }
    }

    // ========== CORE OPERATIONS ==========

    enhancedCrossover(parent1, parent2, composition) {
        const child = Array.from({ length: parent1.length }, () => []);
        const usedIds = new Set();
        
        const splitPoint = Math.floor(parent1.length / 2);
        
        // Copy first half from parent1
        for (let i = 0; i < splitPoint; i++) {
            parent1[i].forEach(player => {
                child[i].push({...player});
                usedIds.add(player.id);
            });
        }
        
        // Copy second half from parent2, avoiding duplicates
        for (let i = splitPoint; i < parent2.length; i++) {
            parent2[i].forEach(player => {
                if (!usedIds.has(player.id)) {
                    child[i].push({...player});
                    usedIds.add(player.id);
                }
            });
        }
        
        // Add any missing players from parent2
        this.addMissingPlayers(child, parent2, usedIds, composition);
        
        return child;
    }

    addMissingPlayers(child, parent, usedIds, composition) {
        parent.flat().forEach(player => {
            if (!usedIds.has(player.id)) {
                let placed = false;
                
                // Try to place in a team that needs this position
                for (let i = 0; i < child.length; i++) {
                    const positionCount = child[i].filter(p => 
                        p.assignedPosition === player.assignedPosition
                    ).length;
                    const targetCount = composition[player.assignedPosition] || 0;
                    
                    if (positionCount < targetCount) {
                        child[i].push({...player});
                        usedIds.add(player.id);
                        placed = true;
                        break;
                    }
                }
                
                // If couldn't place by position, place in smallest team
                if (!placed) {
                    const teamSizes = child.map(team => team.length);
                    const minSize = Math.min(...teamSizes);
                    const targetTeam = teamSizes.indexOf(minSize);
                    child[targetTeam].push({...player});
                    usedIds.add(player.id);
                }
            }
        });
    }

    generateNeighbor(solution, positions, heuristicManager) {
        const neighbor = this.cloneTeams(solution);
        
        if (heuristicManager) {
            const operator = heuristicManager.selectOperator();
            operator.execute(neighbor, positions);
        } else {
            this.heuristicOperators.performAdaptiveSwap(neighbor, positions);
        }
        
        return neighbor;
    }

    // ========== UTILITY METHODS ==========

    cloneTeams(teams) {
        return teams.map(team => team.map(player => ({ ...player })));
    }

    hashSolution(teams) {
        return teams.map(team => 
            team.map(p => p.id).sort().join(',')
        ).join('|');
    }

    getUnusedPlayers(teams, allPlayers) {
        const usedIds = new Set();
        teams.forEach(team => {
            team.forEach(player => {
                usedIds.add(player.id);
            });
        });

        return allPlayers.filter(p => !usedIds.has(p.id));
    }

    adaptParameters(teamCount, totalPlayers) {
        const complexity = teamCount * totalPlayers;
        const algorithms = this.config.algorithms;

        if (complexity < 50) {
            algorithms.geneticAlgorithm.generationCount = 50;
            algorithms.tabuSearch.iterations = 2000;
            algorithms.simulatedAnnealing.iterations = 10000;
            algorithms.localSearch.iterations = 500;
        } else if (complexity < 200) {
            algorithms.geneticAlgorithm.generationCount = 100;
            algorithms.tabuSearch.iterations = 5000;
            algorithms.simulatedAnnealing.iterations = 30000;
            algorithms.localSearch.iterations = 1000;
        } else {
            algorithms.geneticAlgorithm.generationCount = 150;
            algorithms.tabuSearch.iterations = 8000;
            algorithms.simulatedAnnealing.iterations = 50000;
            algorithms.localSearch.iterations = 1500;
        }
    }

    createEmptyStats() {
        return {
            geneticAlgorithm: { generations: 0, improvements: 0 },
            tabuSearch: { iterations: 0, improvements: 0 },
            simulatedAnnealing: { iterations: 0, improvements: 0, temperature: 0 },
            localSearch: { iterations: 0, improvements: 0 }
        };
    }

    collectStatistics(stats) {
        return {
            geneticAlgorithm: { 
                ...stats.geneticAlgorithm, 
                config: this.config.algorithms.geneticAlgorithm 
            },
            tabuSearch: { 
                ...stats.tabuSearch, 
                config: this.config.algorithms.tabuSearch 
            },
            simulatedAnnealing: { 
                ...stats.simulatedAnnealing, 
                config: this.config.algorithms.simulatedAnnealing 
            },
            localSearch: { 
                ...stats.localSearch, 
                config: this.config.algorithms.localSearch 
            }
        };
    }
}

export default TeamOptimizerService;
