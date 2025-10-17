/**
 * TeamOptimizerService - Team balancing with advanced algorithms
 * Uses Genetic Algorithm, Simulated Annealing, and Tabu Search
 */

import eloService from './EloService.js';
import { EventEmitter } from 'events';

// ========== CORE CONSTANTS ==========

const OPTIMIZATION_STRATEGIES = {
    BALANCED: 'balanced',
    COMPETITIVE: 'competitive', 
    DEVELOPMENTAL: 'developmental',
    POSITION_FOCUSED: 'position_focused'
};

const POSITION_GROUPS = {
    'S': { name: 'Setter', weight: 1.3, priority: 1 },
    'OPP': { name: 'Opposite', weight: 1.2, priority: 2 },
    'OH': { name: 'Outside Hitter', weight: 1.1, priority: 3 },
    'MB': { name: 'Middle Blocker', weight: 1.0, priority: 4 },
    'L': { name: 'Libero', weight: 0.9, priority: 5 }
};

const OPERATION_TYPES = {
    SWAP_SAME_POSITION: 'swap_same_position',
    SWAP_CROSS_POSITION: 'swap_cross_position',
    POSITION_REASSIGNMENT: 'position_reassignment',
    MULTI_SWAP: 'multi_swap'
};

// ========== DATA MODELS ==========

class Player {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.positions = data.positions || []; // Ordered by preference/competence
        this.ratings = data.ratings || {};
        this.assignedPosition = data.assignedPosition || null;
        this.positionRating = data.positionRating || 0;
        this.flexibilityScore = this.calculateFlexibilityScore();
        
        this.validate();
    }

    validate() {
        if (!this.id) throw new Error('Player ID required');
        if (!this.name) throw new Error('Player name required');
        if (!this.positions || this.positions.length === 0) {
            throw new Error('Player must have at least one position');
        }
        
        // Ensure primary position has rating
        const primary = this.positions[0];
        if (!this.ratings[primary]) {
            this.ratings[primary] = 1500;
        }
    }

    calculateFlexibilityScore() {
        return this.positions.length / Object.keys(POSITION_GROUPS).length;
    }

    canPlay(position) {
        return this.positions.includes(position);
    }

    getBestPosition() {
        return this.positions.reduce((best, pos) => {
            const currentRating = this.ratings[pos] || 0;
            const bestRating = this.ratings[best] || 0;
            return currentRating > bestRating ? pos : best;
        }, this.positions[0]);
    }

    getRatingFor(position) {
        return this.ratings[position] || this.ratings[this.positions[0]] || 1500;
    }

    assignPosition(position) {
        if (!this.canPlay(position)) {
            throw new Error(`Player ${this.id} cannot play position ${position}`);
        }
        this.assignedPosition = position;
        this.positionRating = this.getRatingFor(position);
        return this;
    }

    clone() {
        return new Player({
            ...this,
            positions: [...this.positions],
            ratings: { ...this.ratings }
        });
    }
}

class Team {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.positionCounts = {};
        this.composition = {};
    }

    addPlayer(player, position) {
        const assignedPlayer = player.clone().assignPosition(position);
        this.players.push(assignedPlayer);
        this.positionCounts[position] = (this.positionCounts[position] || 0) + 1;
        return this;
    }

    removePlayer(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            const player = this.players[index];
            this.positionCounts[player.assignedPosition]--;
            this.players.splice(index, 1);
            return player;
        }
        return null;
    }

    getPlayersByPosition(position) {
        return this.players.filter(p => p.assignedPosition === position);
    }

    getPositionStrength(position) {
        return this.getPlayersByPosition(position)
            .reduce((sum, player) => sum + player.positionRating, 0);
    }

    getTotalStrength() {
        return this.players.reduce((sum, player) => sum + player.positionRating, 0);
    }

    isValid(composition) {
        return Object.keys(composition).every(position => 
            this.positionCounts[position] === composition[position]
        );
    }

    clone() {
        const newTeam = new Team(this.id);
        newTeam.players = this.players.map(p => p.clone());
        newTeam.positionCounts = { ...this.positionCounts };
        newTeam.composition = { ...this.composition };
        return newTeam;
    }
}

class Solution {
    constructor(teams, composition) {
        this.teams = teams.map(team => team.clone());
        this.composition = { ...composition };
        this.fitness = this.calculateFitness();
    }

    calculateFitness() {
        const teamStrengths = this.teams.map(team => team.getTotalStrength());
        const maxStrength = Math.max(...teamStrengths);
        const minStrength = Math.min(...teamStrengths);
        const balanceScore = maxStrength - minStrength;

        let positionBalanceScore = 0;
        Object.keys(this.composition).forEach(position => {
            const positionStrengths = this.teams.map(team => team.getPositionStrength(position));
            positionBalanceScore += Math.max(...positionStrengths) - Math.min(...positionStrengths);
        });

        let flexibilityPenalty = 0;
        this.teams.forEach(team => {
            team.players.forEach(player => {
                const bestRating = player.ratings[player.getBestPosition()] || 0;
                const currentRating = player.positionRating;
                flexibilityPenalty += Math.max(0, bestRating - currentRating);
            });
        });

        return balanceScore + positionBalanceScore * 0.3 + flexibilityPenalty * 0.1;
    }

    isValid() {
        return this.teams.every(team => team.isValid(this.composition));
    }

    clone() {
        return new Solution(this.teams, this.composition);
    }
}

// ========== CORE OPTIMIZATION ENGINE ==========

class PositionAwareOptimizationEngine {
    constructor() {
        this.operationRegistry = new Map();
        this.initializeOperations();
    }

    initializeOperations() {
        this.operationRegistry.set(OPERATION_TYPES.SWAP_SAME_POSITION, {
            execute: this.swapSamePosition.bind(this),
            description: 'Swap players of same position between teams'
        });

        this.operationRegistry.set(OPERATION_TYPES.SWAP_CROSS_POSITION, {
            execute: this.swapCrossPosition.bind(this),
            description: 'Swap players of different positions between teams with position reassignment'
        });

        this.operationRegistry.set(OPERATION_TYPES.POSITION_REASSIGNMENT, {
            execute: this.reassignPositions.bind(this),
            description: 'Reassign positions within a team'
        });

        this.operationRegistry.set(OPERATION_TYPES.MULTI_SWAP, {
            execute: this.multiSwap.bind(this),
            description: 'Multi-player swap between teams'
        });
    }

    /**
     * Operation 1: Swap players of the same position between two teams
     * This maintains composition as positions don't change
     */
    swapSamePosition(solution, team1Index, team2Index, position) {
        const newSolution = solution.clone();
        const team1 = newSolution.teams[team1Index];
        const team2 = newSolution.teams[team2Index];

        const team1Players = team1.getPlayersByPosition(position);
        const team2Players = team2.getPlayersByPosition(position);

        if (team1Players.length === 0 || team2Players.length === 0) {
            return null; // Invalid operation
        }

        const player1 = team1Players[Math.floor(Math.random() * team1Players.length)];
        const player2 = team2Players[Math.floor(Math.random() * team2Players.length)];

        // Remove and re-add with same positions
        team1.removePlayer(player1.id);
        team2.removePlayer(player2.id);

        team1.addPlayer(player2, position);
        team2.addPlayer(player1, position);

        return newSolution.isValid() ? newSolution : null;
    }

    /**
     * Operation 2: Cross-position swap with position reassignment
     * Players swap teams AND positions, maintaining composition
     */
    swapCrossPosition(solution, team1Index, team2Index, position1, position2) {
        const newSolution = solution.clone();
        const team1 = newSolution.teams[team1Index];
        const team2 = newSolution.teams[team2Index];

        const team1Players = team1.getPlayersByPosition(position1);
        const team2Players = team2.getPlayersByPosition(position2);

        if (team1Players.length === 0 || team2Players.length === 0) {
            return null;
        }

        const player1 = team1Players[Math.floor(Math.random() * team1Players.length)];
        const player2 = team2Players[Math.floor(Math.random() * team2Players.length)];

        // Check if players can play the target positions
        if (!player1.canPlay(position2) || !player2.canPlay(position1)) {
            return null;
        }

        // Remove players
        team1.removePlayer(player1.id);
        team2.removePlayer(player2.id);

        // Add with swapped positions
        team1.addPlayer(player2, position1);
        team2.addPlayer(player1, position2);

        return newSolution.isValid() ? newSolution : null;
    }

    /**
     * Operation 3: Position reassignment within a single team
     * Swaps positions between two players in the same team
     */
    reassignPositions(solution, teamIndex, player1Index, player2Index) {
        const newSolution = solution.clone();
        const team = newSolution.teams[teamIndex];
        const player1 = team.players[player1Index];
        const player2 = team.players[player2Index];

        // Check if players can swap positions
        if (!player1.canPlay(player2.assignedPosition) || 
            !player2.canPlay(player1.assignedPosition)) {
            return null;
        }

        const tempPosition = player1.assignedPosition;
        const tempRating = player1.positionRating;

        // Update player1
        player1.assignedPosition = player2.assignedPosition;
        player1.positionRating = player1.getRatingFor(player2.assignedPosition);

        // Update player2
        player2.assignedPosition = tempPosition;
        player2.positionRating = player2.getRatingFor(tempPosition);

        // Update position counts
        team.positionCounts[player1.assignedPosition] = team.getPlayersByPosition(player1.assignedPosition).length;
        team.positionCounts[player2.assignedPosition] = team.getPlayersByPosition(player2.assignedPosition).length;

        return newSolution.isValid() ? newSolution : null;
    }

    /**
     * Operation 4: Multi-player swap between teams
     * Complex operation that maintains composition through multiple swaps
     */
    multiSwap(solution, operations) {
        const newSolution = solution.clone();

        for (const op of operations) {
            const { type, team1, team2, position1, position2, player1, player2 } = op;
            
            switch (type) {
                case 'direct_swap':
                    const result = this.swapCrossPosition(newSolution, team1, team2, position1, position2);
                    if (!result) return null;
                    break;
                    
                case 'reassignment':
                    const reassignResult = this.reassignPositions(newSolution, team1, player1, player2);
                    if (!reassignResult) return null;
                    break;
                    
                default:
                    return null;
            }
        }

        return newSolution.isValid() ? newSolution : null;
    }

    generateNeighbors(solution, count = 10) {
        const neighbors = [];
        const teams = solution.teams;
        const positions = Object.keys(solution.composition);

        while (neighbors.length < count) {
            const operationType = this.getRandomOperationType();
            const operation = this.operationRegistry.get(operationType);
            
            try {
                let neighbor = null;

                switch (operationType) {
                    case OPERATION_TYPES.SWAP_SAME_POSITION:
                        const position = positions[Math.floor(Math.random() * positions.length)];
                        const [team1, team2] = this.getTwoDifferentRandomIndices(teams.length);
                        neighbor = operation.execute(solution, team1, team2, position);
                        break;

                    case OPERATION_TYPES.SWAP_CROSS_POSITION:
                        const [pos1, pos2] = this.getTwoDifferentRandomElements(positions);
                        const [t1, t2] = this.getTwoDifferentRandomIndices(teams.length);
                        neighbor = operation.execute(solution, t1, t2, pos1, pos2);
                        break;

                    case OPERATION_TYPES.POSITION_REASSIGNMENT:
                        const teamIdx = Math.floor(Math.random() * teams.length);
                        const team = teams[teamIdx];
                        if (team.players.length >= 2) {
                            const [p1, p2] = this.getTwoDifferentRandomIndices(team.players.length);
                            neighbor = operation.execute(solution, teamIdx, p1, p2);
                        }
                        break;
                }

                if (neighbor && neighbor.isValid()) {
                    neighbors.push(neighbor);
                }
            } catch (error) {
                // Continue to next operation
                continue;
            }
        }

        return neighbors;
    }

    getRandomOperationType() {
        const types = Object.values(OPERATION_TYPES);
        return types[Math.floor(Math.random() * types.length)];
    }

    getTwoDifferentRandomIndices(max) {
        const first = Math.floor(Math.random() * max);
        let second;
        do {
            second = Math.floor(Math.random() * max);
        } while (second === first);
        return [first, second];
    }

    getTwoDifferentRandomElements(array) {
        if (array.length < 2) return [array[0], array[0]];
        const firstIndex = Math.floor(Math.random() * array.length);
        let secondIndex;
        do {
            secondIndex = Math.floor(Math.random() * array.length);
        } while (secondIndex === firstIndex);
        return [array[firstIndex], array[secondIndex]];
    }
}

// ==========  ALGORITHMS ==========

class HybridOptimizationAlgorithm {
    constructor(config) {
        this.config = config;
        this.engine = new PositionAwareOptimizationEngine();
        this.bestSolution = null;
        this.iterations = 0;
    }

    async optimize(initialSolution, progressCallback = null) {
        this.bestSolution = initialSolution;
        const population = this.initializePopulation(initialSolution);
        
        for (let generation = 0; generation < this.config.maxGenerations; generation++) {
            // Genetic Algorithm Phase
            const newPopulation = await this.evolvePopulation(population);
            
            // Local Search Phase
            const improvedPopulation = await this.applyLocalSearch(newPopulation);
            
            // Update best solution
            const generationBest = this.findBestSolution(improvedPopulation);
            if (generationBest.fitness < this.bestSolution.fitness) {
                this.bestSolution = generationBest;
            }

            // Progress reporting
            if (progressCallback && generation % 10 === 0) {
                progressCallback({
                    generation,
                    fitness: this.bestSolution.fitness,
                    progress: (generation / this.config.maxGenerations) * 100
                });
            }

            // Yield to prevent blocking
            if (generation % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            this.iterations++;
        }

        return this.bestSolution;
    }

    initializePopulation(initialSolution) {
        const population = [initialSolution];
        
        for (let i = 1; i < this.config.populationSize; i++) {
            const randomSolution = this.generateRandomSolution(initialSolution);
            population.push(randomSolution);
        }
        
        return population;
    }

    generateRandomSolution(baseSolution) {
        // Create a randomized version of the base solution
        const teams = baseSolution.teams.map(team => {
            const newTeam = new Team(team.id);
            const shuffledPlayers = [...team.players].sort(() => Math.random() - 0.5);
            
            // Reassign players to positions randomly while maintaining composition
            const positionAssignments = this.assignPlayersToPositions(shuffledPlayers, baseSolution.composition);
            positionAssignments.forEach(({ player, position }) => {
                newTeam.addPlayer(player, position);
            });
            
            return newTeam;
        });

        return new Solution(teams, baseSolution.composition);
    }

    assignPlayersToPositions(players, composition) {
        const assignments = [];
        const positionRequirements = { ...composition };
        const unassignedPlayers = [...players];
        
        // First pass: assign players to their preferred positions
        unassignedPlayers.forEach(player => {
            const preferredPosition = player.positions[0];
            if (positionRequirements[preferredPosition] > 0) {
                assignments.push({ player, position: preferredPosition });
                positionRequirements[preferredPosition]--;
            }
        });

        // Second pass: assign remaining players to available positions they can play
        unassignedPlayers.forEach(player => {
            if (!assignments.find(a => a.player.id === player.id)) {
                const availablePosition = player.positions.find(pos => positionRequirements[pos] > 0);
                if (availablePosition) {
                    assignments.push({ player, position: availablePosition });
                    positionRequirements[availablePosition]--;
                }
            }
        });

        return assignments;
    }

    async evolvePopulation(population) {
        const newPopulation = [];
        
        // Elitism: keep best solutions
        const sortedPopulation = [...population].sort((a, b) => a.fitness - b.fitness);
        const eliteCount = Math.floor(population.length * this.config.elitismRate);
        newPopulation.push(...sortedPopulation.slice(0, eliteCount));

        // Create offspring through crossover and mutation
        while (newPopulation.length < population.length) {
            const parent1 = this.tournamentSelection(population);
            const parent2 = this.tournamentSelection(population);
            
            const child = await this.crossover(parent1, parent2);
            const mutatedChild = await this.mutate(child);
            
            if (mutatedChild.isValid()) {
                newPopulation.push(mutatedChild);
            }
        }

        return newPopulation;
    }

    tournamentSelection(population) {
        const tournamentSize = 3;
        let best = null;
        
        for (let i = 0; i < tournamentSize; i++) {
            const candidate = population[Math.floor(Math.random() * population.length)];
            if (!best || candidate.fitness < best.fitness) {
                best = candidate;
            }
        }
        
        return best;
    }

    async crossover(parent1, parent2) {
        // Uniform crossover: randomly select teams from parents
        const childTeams = [];
        
        for (let i = 0; i < parent1.teams.length; i++) {
            const useParent1 = Math.random() < 0.5;
            const sourceTeam = useParent1 ? parent1.teams[i] : parent2.teams[i];
            childTeams.push(sourceTeam.clone());
        }

        return new Solution(childTeams, parent1.composition);
    }

    async mutate(solution) {
        // Apply random operations from the optimization engine
        const neighbors = this.engine.generateNeighbors(solution, 1);
        return neighbors.length > 0 ? neighbors[0] : solution;
    }

    async applyLocalSearch(population) {
        const improvedPopulation = [];
        
        for (const solution of population) {
            let currentSolution = solution;
            let improved = true;
            let localIterations = 0;
            
            while (improved && localIterations < this.config.localSearchIterations) {
                improved = false;
                const neighbors = this.engine.generateNeighbors(currentSolution, 5);
                
                for (const neighbor of neighbors) {
                    if (neighbor.fitness < currentSolution.fitness) {
                        currentSolution = neighbor;
                        improved = true;
                        break;
                    }
                }
                
                localIterations++;
            }
            
            improvedPopulation.push(currentSolution);
        }
        
        return improvedPopulation;
    }

    findBestSolution(population) {
        return population.reduce((best, current) => 
            current.fitness < best.fitness ? current : best
        );
    }
}

// ==========  SOLUTION GENERATOR ==========

class SolutionGenerator {
    constructor() {
        this.engine = new PositionAwareOptimizationEngine();
    }

    generateInitialSolutions(composition, teamCount, players, count = 5) {
        const solutions = [];
        
        // Strategy 1: Balanced distribution
        solutions.push(this.createBalancedSolution(composition, teamCount, players));
        
        // Strategy 2: Position-focused distribution
        solutions.push(this.createPositionFocusedSolution(composition, teamCount, players));
        
        // Strategy 3: Random distributions
        for (let i = 0; i < count - 2; i++) {
            solutions.push(this.createRandomSolution(composition, teamCount, players));
        }

        return solutions.filter(s => s.isValid());
    }

    createBalancedSolution(composition, teamCount, players) {
        const teams = Array.from({ length: teamCount }, (_, i) => new Team(`team-${i}`));
        const playerPool = players.map(p => new Player(p));
        
        // Sort positions by scarcity
        const positions = this.getPositionsByScarcity(composition, teamCount, playerPool);
        
        positions.forEach(([position, requiredCount]) => {
            const totalNeeded = requiredCount * teamCount;
            const eligiblePlayers = playerPool
                .filter(p => p.canPlay(position))
                .sort((a, b) => b.getRatingFor(position) - a.getRatingFor(position))
                .slice(0, totalNeeded);

            // Distribute players round-robin
            eligiblePlayers.forEach((player, index) => {
                const teamIndex = index % teamCount;
                teams[teamIndex].addPlayer(player, position);
            });
        });

        return new Solution(teams, composition);
    }

    createPositionFocusedSolution(composition, teamCount, players) {
        const teams = Array.from({ length: teamCount }, (_, i) => new Team(`team-${i}`));
        const playerPool = players.map(p => new Player(p));
        
        const positions = Object.entries(composition).sort((a, b) => {
            const aPriority = POSITION_GROUPS[a[0]].priority;
            const bPriority = POSITION_GROUPS[b[0]].priority;
            return aPriority - bPriority;
        });

        positions.forEach(([position, requiredCount]) => {
            const totalNeeded = requiredCount * teamCount;
            const eligiblePlayers = playerPool
                .filter(p => !teams.some(t => t.players.find(tp => tp.id === p.id)))
                .filter(p => p.canPlay(position))
                .sort((a, b) => b.getRatingFor(position) - a.getRatingFor(position))
                .slice(0, totalNeeded);

            // Snake draft distribution
            for (let round = 0; round < requiredCount; round++) {
                for (let teamIndex = 0; teamIndex < teamCount; teamIndex++) {
                    const playerIndex = round * teamCount + teamIndex;
                    if (playerIndex < eligiblePlayers.length) {
                        const actualTeamIndex = round % 2 === 0 ? teamIndex : teamCount - 1 - teamIndex;
                        teams[actualTeamIndex].addPlayer(eligiblePlayers[playerIndex], position);
                    }
                }
            }
        });

        return new Solution(teams, composition);
    }

    createRandomSolution(composition, teamCount, players) {
        const teams = Array.from({ length: teamCount }, (_, i) => new Team(`team-${i}`));
        const shuffledPlayers = [...players]
            .map(p => new Player(p))
            .sort(() => Math.random() - 0.5);

        let playerIndex = 0;
        Object.entries(composition).forEach(([position, requiredCount]) => {
            for (let teamIndex = 0; teamIndex < teamCount; teamIndex++) {
                for (let i = 0; i < requiredCount; i++) {
                    if (playerIndex < shuffledPlayers.length) {
                        const player = shuffledPlayers[playerIndex];
                        if (player.canPlay(position)) {
                            teams[teamIndex].addPlayer(player, position);
                            playerIndex++;
                        }
                    }
                }
            }
        });

        return new Solution(teams, composition);
    }

    getPositionsByScarcity(composition, teamCount, players) {
        return Object.entries(composition).sort((a, b) => {
            const [posA, countA] = a;
            const [posB, countB] = b;
            
            const playersA = players.filter(p => p.canPlay(posA)).length;
            const playersB = players.filter(p => p.canPlay(posB)).length;
            
            const ratioA = playersA / (countA * teamCount);
            const ratioB = playersB / (countB * teamCount);
            
            return ratioA - ratioB;
        });
    }
}

// ========== MAIN  SERVICE ==========

class TeamOptimizer extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            maxGenerations: 100,
            populationSize: 20,
            elitismRate: 0.1,
            localSearchIterations: 10,
            timeout: 30000,
            ...config
        };
        
        this.solutionGenerator = new SolutionGenerator();
        this.algorithm = new HybridOptimizationAlgorithm(this.config);
        this.isOptimizing = false;
    }

    async optimizeTeams(composition, teamCount, players, strategy = OPTIMIZATION_STRATEGIES.BALANCED) {
        if (this.isOptimizing) {
            throw new Error('Optimization already in progress');
        }

        this.isOptimizing = true;
        const startTime = Date.now();

        try {
            this.emit('optimizationStarted', { composition, teamCount, playerCount: players.length });

            // Validate input
            this.validateInput(composition, teamCount, players);

            // Generate initial solutions
            const initialSolutions = this.solutionGenerator.generateInitialSolutions(
                composition, teamCount, players
            );

            if (initialSolutions.length === 0) {
                throw new Error('Could not generate valid initial solutions');
            }

            const bestInitial = initialSolutions.reduce((best, current) => 
                current.fitness < best.fitness ? current : best
            );

            // Run optimization
            const bestSolution = await this.algorithm.optimize(
                bestInitial,
                (progress) => this.emit('optimizationProgress', progress)
            );

            const result = this.formatResult(bestSolution, players, Date.now() - startTime);

            this.emit('optimizationCompleted', result);
            return result;

        } catch (error) {
            this.emit('optimizationFailed', { error: error.message });
            throw error;
        } finally {
            this.isOptimizing = false;
        }
    }

    validateInput(composition, teamCount, players) {
        if (teamCount < 2) {
            throw new Error('Must have at least 2 teams');
        }

        const totalPlayersNeeded = Object.values(composition).reduce((sum, count) => sum + count, 0) * teamCount;
        if (players.length < totalPlayersNeeded) {
            throw new Error(`Not enough players: need ${totalPlayersNeeded}, have ${players.length}`);
        }

        // Check position requirements
        Object.entries(composition).forEach(([position, count]) => {
            const totalNeeded = count * teamCount;
            const availablePlayers = players.filter(p => p.positions.includes(position)).length;
            
            if (availablePlayers < totalNeeded) {
                throw new Error(`Not enough players for position ${position}: need ${totalNeeded}, have ${availablePlayers}`);
            }
        });
    }

    formatResult(solution, allPlayers, executionTime) {
        const teams = solution.teams.map(team => ({
            id: team.id,
            players: team.players.map(player => ({
                id: player.id,
                name: player.name,
                assignedPosition: player.assignedPosition,
                positionRating: player.positionRating,
                possiblePositions: player.positions
            })),
            totalStrength: team.getTotalStrength(),
            positionStrengths: Object.keys(solution.composition).reduce((acc, position) => {
                acc[position] = team.getPositionStrength(position);
                return acc;
            }, {})
        }));

        const usedPlayerIds = new Set();
        solution.teams.forEach(team => {
            team.players.forEach(player => usedPlayerIds.add(player.id));
        });

        const unusedPlayers = allPlayers.filter(player => !usedPlayerIds.has(player.id));

        return {
            teams: teams.sort((a, b) => b.totalStrength - a.totalStrength),
            metrics: {
                fitness: solution.fitness,
                balance: this.calculateBalanceMetric(solution),
                positionBalance: this.calculatePositionBalanceMetric(solution),
                executionTime
            },
            unusedPlayers,
            composition: solution.composition
        };
    }

    calculateBalanceMetric(solution) {
        const teamStrengths = solution.teams.map(team => team.getTotalStrength());
        return Math.max(...teamStrengths) - Math.min(...teamStrengths);
    }

    calculatePositionBalanceMetric(solution) {
        let totalImbalance = 0;
        Object.keys(solution.composition).forEach(position => {
            const strengths = solution.teams.map(team => team.getPositionStrength(position));
            totalImbalance += Math.max(...strengths) - Math.min(...strengths);
        });
        return totalImbalance;
    }

    // Utility method for quick optimization
    async quickOptimize(composition, teamCount, players) {
        const quickConfig = {
            maxGenerations: 50,
            populationSize: 10,
            localSearchIterations: 5,
            timeout: 10000
        };

        const quickOptimizer = new TeamOptimizer(quickConfig);
        return quickOptimizer.optimizeTeams(composition, teamCount, players);
    }
}

// ========== EXPORTS ==========

export {
    TeamOptimizer,
    Player,
    Team,
    Solution,
    PositionAwareOptimizationEngine,
    OPERATION_TYPES,
    OPTIMIZATION_STRATEGIES
};

export default TeamOptimizer;
