/**
 * TeamOptimizerService - Team balancing with advanced algorithms
 * Uses a hybrid approach of Genetic Algorithm, Simulated Annealing, and Tabu Search
 */
import eloService from './EloService.js';

// A simple deep merge utility to handle configuration
function _deepMerge(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            _deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

class TeamOptimizerService {
    /**
     * @param {object} userConfig - Optional configuration to override defaults.
     */
    constructor(userConfig = {}) {
        this.positions = {
            'S': 'Setter',
            'OPP': 'Opposite',
            'OH': 'Outside Hitter',
            'MB': 'Middle Blocker',
            'L': 'Libero'
        };

        const defaultConfig = {
            useGeneticAlgorithm: true,
            useTabuSearch: true,
            useSimulatedAnnealing: true,
            adaptiveSwapEnabled: true,
            adaptiveParameters: {
                strongWeakSwapProbability: 0.7,
                positionBalanceWeight: 0.3,
                varianceWeight: 0.5
            },
            algorithms: {
                geneticAlgorithm: {
                    populationSize: 20,
                    generationCount: 100,
                    mutationRate: 0.15,
                    crossoverRate: 0.7,
                    adaptiveMutation: true,
                    elitismCount: 2,
                    tournamentSize: 3,
                    maxStagnation: 20
                },
                tabuSearch: {
                    tabuTenure: 50,
                    iterations: 5000,
                    neighborCount: 20,
                    aspirationCriteria: true,
                    diversification: { enabled: true, frequency: 1000, intensity: 0.3 },
                    intensification: { enabled: true, frequency: 500, depth: 5 }
                },
                simulatedAnnealing: {
                    initialTemperature: 1000,
                    coolingRate: 0.995,
                    iterations: 50000,
                    reheatEnabled: true,
                    reheatTemperature: 500,
                    reheatIterations: 10000,
                    equilibriumIterations: 100,
                    adaptiveCooling: true
                },
                localSearch: {
                    iterations: 1000,
                    searchStrategy: 'first-improvement',
                    neighborhoodSize: 10,
                    perturbationEnabled: true,
                    perturbationStrength: 0.1
                }
            }
        };

        this.config = _deepMerge(defaultConfig, userConfig);
    }

    /**
     * Main optimization entry point with per-algorithm configuration
     */
    async optimize(composition, teamCount, players) {
        const validation = this.enhancedValidate(composition, teamCount, players);
        if (!validation.isValid) {
            throw new Error(validation.errors.map(e => e.message).join(', '));
        }

        this._adaptParameters(teamCount, players.length);

        const playersByPosition = this.groupByPosition(players);
        const positions = Object.keys(composition).filter(pos => composition[pos] > 0);
        
        const initialSolutions = this.generateInitialSolutions(composition, teamCount, playersByPosition);

        const runContext = {
            stats: this._createEmptyStats(),
            config: this.config
        };

        const algorithmPromises = [];
        const algorithmNames = [];
        
        if (this.config.useGeneticAlgorithm) {
            algorithmPromises.push(this.runGeneticAlgorithm(initialSolutions, composition, teamCount, playersByPosition, positions, runContext));
            algorithmNames.push('Genetic Algorithm');
        }
        
        if (this.config.useTabuSearch) {
            algorithmPromises.push(this.runTabuSearch(initialSolutions[0], positions, runContext));
            algorithmNames.push('Tabu Search');
        }
        
        if (this.config.useSimulatedAnnealing) {
            algorithmPromises.push(this.runSimulatedAnnealing(initialSolutions[0], positions, runContext));
            algorithmNames.push('Simulated Annealing');
        }

        if (algorithmPromises.length === 0) { // Fallback
             algorithmPromises.push(
                this.runGeneticAlgorithm(initialSolutions, composition, teamCount, playersByPosition, positions, runContext),
                this.runTabuSearch(initialSolutions[0], positions, runContext),
                this.runSimulatedAnnealing(initialSolutions[0], positions, runContext)
            );
            algorithmNames.push('Genetic Algorithm', 'Tabu Search', 'Simulated Annealing');
        }

        const results = await Promise.all(algorithmPromises);

        const scores = results.map(r => this.evaluateSolution(r));
        const bestIdx = scores.indexOf(Math.min(...scores));
        
        const bestTeams = await this.runLocalSearch(results[bestIdx], positions, runContext);

        bestTeams.sort((a, b) => {
            const aStrength = eloService.calculateTeamStrength(a).totalRating;
            const bStrength = eloService.calculateTeamStrength(b).totalRating;
            return bStrength - aStrength;
        });

        return {
            teams: bestTeams,
            balance: eloService.evaluateBalance(bestTeams),
            unusedPlayers: this.getUnusedPlayers(bestTeams, players),
            validation,
            algorithm: algorithmNames[bestIdx],
            statistics: this._getAlgorithmStatistics(runContext)
        };
    }

    /**
     * Generate diverse initial solutions
     */
    generateInitialSolutions(composition, teamCount, playersByPosition) {
        return [
            this.createBalancedSolution(composition, teamCount, playersByPosition),
            this.createSnakeDraftSolution(composition, teamCount, playersByPosition),
            this.createPositionFocusedSolution(composition, teamCount, playersByPosition),
            this.createRandomSolution(composition, teamCount, playersByPosition),
            this.createRandomSolution(composition, teamCount, playersByPosition)
        ];
    }
    
    /**
     * Genetic Algorithm with enhanced configuration
     */
    async runGeneticAlgorithm(initialPop, composition, teamCount, playersByPosition, positions, runContext) {
        const config = runContext.config.algorithms.geneticAlgorithm;
        let population = [...initialPop];

        while (population.length < config.populationSize) {
            population.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }

        let bestScore = this.evaluateSolution(population[0]);
        let stagnationCount = 0;

        for (let gen = 0; gen < config.generationCount; gen++) {
            runContext.stats.geneticAlgorithm.generations = gen + 1;
            
            const scored = population.map(individual => ({
                teams: individual,
                score: this.evaluateSolution(individual)
            })).sort((a, b) => a.score - b.score);

            if (scored[0].score < bestScore) {
                bestScore = scored[0].score;
                stagnationCount = 0;
                runContext.stats.geneticAlgorithm.improvements++;
            } else {
                stagnationCount++;
            }

            const newPopulation = scored.slice(0, config.elitismCount).map(s => s.teams);

            while (newPopulation.length < config.populationSize) {
                const parent1 = this.tournamentSelection(scored, config.tournamentSize);
                let child;
                if (Math.random() < config.crossoverRate) {
                    const parent2 = this.tournamentSelection(scored, config.tournamentSize);
                    child = this.enhancedCrossover(parent1, parent2, composition);
                } else {
                    child = this._fastCloneTeams(parent1);
                }
                newPopulation.push(child);
            }

            for (let i = config.elitismCount; i < newPopulation.length; i++) {
                const mutationRate = config.adaptiveMutation && stagnationCount > config.maxStagnation / 2 
                    ? config.mutationRate * 1.5 
                    : config.mutationRate;
                
                if (Math.random() < mutationRate) {
                    this.smartMutate(newPopulation[i], positions);
                }
            }

            population = newPopulation;

            if (stagnationCount >= config.maxStagnation) {
                this.diversifyPopulation(population, composition, teamCount, playersByPosition);
                stagnationCount = 0;
            }
            
            if (gen % 10 === 0) await new Promise(resolve => setTimeout(resolve, 0));
        }

        return population.map(p => ({ teams: p, score: this.evaluateSolution(p) }))
                         .sort((a, b) => a.score - b.score)[0].teams;
    }

    /**
     * Tabu Search with enhanced configuration
     */
    async runTabuSearch(initialTeams, positions, runContext) {
        const config = runContext.config.algorithms.tabuSearch;
        let current = this._fastCloneTeams(initialTeams);
        let best = this._fastCloneTeams(initialTeams);
        let currentScore = this.evaluateSolution(current);
        let bestScore = currentScore;
        
        const tabuList = [];
        let iterationSinceImprovement = 0;

        for (let iter = 0; iter < config.iterations; iter++) {
            runContext.stats.tabuSearch.iterations = iter + 1;
            
            const neighbors = this.generateNeighborhood(current, positions, config.neighborCount);
            
            let bestNeighbor = null;
            let bestNeighborScore = Infinity;
            
            for (const neighbor of neighbors) {
                const hash = this.hashSolution(neighbor);
                const score = this.evaluateSolution(neighbor);
                
                const isTabu = tabuList.includes(hash);
                const satisfiesAspiration = config.aspirationCriteria && score < bestScore;
                
                if ((!isTabu || satisfiesAspiration) && score < bestNeighborScore) {
                    bestNeighbor = neighbor;
                    bestNeighborScore = score;
                }
            }
            
            if (bestNeighbor) {
                current = bestNeighbor;
                currentScore = bestNeighborScore;
                
                const hash = this.hashSolution(current);
                tabuList.push(hash);
                if (tabuList.length > config.tabuTenure) {
                    tabuList.shift();
                }
                
                if (currentScore < bestScore) {
                    best = this._fastCloneTeams(current);
                    bestScore = currentScore;
                    iterationSinceImprovement = 0;
                    runContext.stats.tabuSearch.improvements++;
                } else {
                    iterationSinceImprovement++;
                }
            }

            if (config.diversification.enabled && iterationSinceImprovement > config.diversification.frequency) {
                current = this.createRandomSolutionForTeams(best, positions);
                currentScore = this.evaluateSolution(current);
                iterationSinceImprovement = 0;
            }

            if (config.intensification.enabled && iter % config.intensification.frequency === 0) {
                current = await this.runLocalSearch(current, positions, runContext, config.intensification.depth);
                currentScore = this.evaluateSolution(current);
            }
            
            if (iter % 500 === 0) await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        return best;
    }

    /**
     * Simulated Annealing with enhanced configuration
     */
    async runSimulatedAnnealing(initialTeams, positions, runContext) {
        const config = runContext.config.algorithms.simulatedAnnealing;
        let current = this._fastCloneTeams(initialTeams);
        let best = this._fastCloneTeams(initialTeams);
        let currentScore = this.evaluateSolution(current);
        let bestScore = currentScore;
        
        let temp = config.initialTemperature;
        let iterationSinceImprovement = 0;
        let acceptedInEquilibrium = 0;

        for (let iter = 0; iter < config.iterations; iter++) {
            runContext.stats.simulatedAnnealing.iterations = iter + 1;
            runContext.stats.simulatedAnnealing.temperature = temp;
            
            const neighbor = this.generateEnhancedNeighbor(current, positions);
            const neighborScore = this.evaluateSolution(neighbor);
            const delta = neighborScore - currentScore;
            
            if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
                current = neighbor;
                currentScore = neighborScore;
                acceptedInEquilibrium++;
                
                if (neighborScore < bestScore) {
                    best = this._fastCloneTeams(neighbor);
                    bestScore = neighborScore;
                    iterationSinceImprovement = 0;
                    runContext.stats.simulatedAnnealing.improvements++;
                } else {
                    iterationSinceImprovement++;
                }
            }
            
            if (iter > 0 && iter % config.equilibriumIterations === 0) {
                if (config.adaptiveCooling) {
                    const acceptanceRate = acceptedInEquilibrium / config.equilibriumIterations;
                    if (acceptanceRate > 0.6) temp *= 0.95; // Cool faster
                    else if (acceptanceRate < 0.1) temp *= 0.999; // Cool slower
                    else temp *= config.coolingRate;
                    acceptedInEquilibrium = 0;
                } else {
                    temp *= config.coolingRate;
                }
            } else if (!config.adaptiveCooling) {
                 temp *= config.coolingRate;
            }

            if (config.reheatEnabled && iterationSinceImprovement > config.reheatIterations && temp < config.reheatTemperature) {
                temp = config.reheatTemperature;
                iterationSinceImprovement = 0;
            }
            
            if (iter % 5000 === 0) await new Promise(resolve => setTimeout(resolve, 0));
        }

        return best;
    }

    /**
     * Local Search with configurable strategy
     */
    async runLocalSearch(teams, positions, runContext, maxIterations = null) {
        const config = runContext.config.algorithms.localSearch;
        const iterations = maxIterations || config.iterations;
        
        let current = this._fastCloneTeams(teams);
        let improved = true;
        let iter = 0;
        
        while (improved && iter < iterations) {
            iter++;
            runContext.stats.localSearch.iterations = iter;

            const neighborhood = this.generateNeighborhood(current, positions, config.neighborhoodSize);
            let bestNeighbor = null;
            let bestScore = this.evaluateSolution(current);
            let foundImprovement = false;

            for (const neighbor of neighborhood) {
                const neighborScore = this.evaluateSolution(neighbor);
                if (neighborScore < bestScore) {
                    bestNeighbor = neighbor;
                    bestScore = neighborScore;
                    if (config.searchStrategy === 'first-improvement') {
                        break; 
                    }
                }
            }

            if (bestNeighbor) {
                current = bestNeighbor;
                improved = true;
                runContext.stats.localSearch.improvements++;
            } else {
                improved = false;
            }
            
            if (config.perturbationEnabled && !improved && iter % 50 === 0) {
                this.perturbSolution(current, positions, config.perturbationStrength);
                improved = true; // Continue searching after perturbation
            }
            
            if (iter % 100 === 0) await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        return current;
    }

    // --- Solution Generation and Evaluation ---

    /**
     * Evaluate solution quality (lower is better)
     */
    evaluateSolution(teams) {
        if (!teams || teams.length === 0) return Infinity;

        const teamStrengths = teams.map(team => eloService.calculateTeamStrength(team).totalRating);
        const balance = Math.max(...teamStrengths) - Math.min(...teamStrengths);
        
        const avg = teamStrengths.reduce((a, b) => a + b, 0) / teamStrengths.length;
        const variance = teamStrengths.reduce((sum, strength) => sum + Math.pow(strength - avg, 2), 0) / teamStrengths.length;

        let positionImbalance = 0;
        Object.keys(this.positions).forEach(pos => {
            const posStrengths = teams.map(team => 
                team.filter(p => p.assignedPosition === pos)
                    .reduce((sum, p) => sum + p.positionRating, 0)
            );
            
            if (posStrengths.length > 1 && posStrengths.some(s => s > 0)) {
                positionImbalance += (Math.max(...posStrengths) - Math.min(...posStrengths));
            }
        });

        const adaptiveParams = this.config.adaptiveParameters;
        return balance + (Math.sqrt(variance) * adaptiveParams.varianceWeight) + (positionImbalance * adaptiveParams.positionBalanceWeight);
    }
    
    /**
     * Generic solution creation based on a distribution strategy
     */
    _createSolutionFromDistribution(composition, teamCount, playersByPosition, distributionFn) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        
        const positionOrder = Object.entries(composition)
            .filter(([, count]) => count > 0)
            .sort((a, b) => {
                const aAvail = (playersByPosition[a[0]] || []).length;
                const bAvail = (playersByPosition[b[0]] || []).length;
                return (aAvail / (a[1] * teamCount)) - (bAvail / (b[1] * teamCount));
            });

        positionOrder.forEach(([position, neededCount]) => {
            const totalNeeded = neededCount * teamCount;
            let players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating)
                .slice(0, totalNeeded);
            
            distributionFn(teams, players, neededCount, teamCount, usedIds);
        });
        
        return teams;
    }

    createBalancedSolution(composition, teamCount, playersByPosition) {
        return this._createSolutionFromDistribution(composition, teamCount, playersByPosition, (teams, players, needed, tc, used) => {
             for (let i = 0; i < players.length; i++) {
                const teamIdx = i % tc;
                teams[teamIdx].push(players[i]);
                used.add(players[i].id);
            }
        });
    }

    createSnakeDraftSolution(composition, teamCount, playersByPosition) {
         return this._createSolutionFromDistribution(composition, teamCount, playersByPosition, (teams, players, needed, tc, used) => {
            let playerIndex = 0;
            for (let round = 0; round < needed; round++) {
                const isEvenRound = round % 2 === 0;
                for (let i = 0; i < tc; i++) {
                    if (playerIndex >= players.length) break;
                    const teamIdx = isEvenRound ? i : (tc - 1 - i);
                    teams[teamIdx].push(players[playerIndex]);
                    used.add(players[playerIndex].id);
                    playerIndex++;
                }
            }
        });
    }

    createRandomSolution(composition, teamCount, playersByPosition) {
        return this._createSolutionFromDistribution(composition, teamCount, playersByPosition, (teams, players, needed, tc, used) => {
            // Shuffle players
            for (let i = players.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [players[i], players[j]] = [players[j], players[i]];
            }
            for (let i = 0; i < players.length; i++) {
                const teamIdx = i % tc;
                teams[teamIdx].push(players[i]);
                used.add(players[i].id);
            }
        });
    }

    createPositionFocusedSolution(composition, teamCount, playersByPosition) {
        // This strategy is different enough to warrant its own implementation
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        
        const positionPriority = ['S', 'OPP', 'OH', 'MB', 'L'];
        const positionOrder = Object.entries(composition)
            .filter(([, count]) => count > 0)
            .sort((a, b) => positionPriority.indexOf(a[0]) - positionPriority.indexOf(b[0]));
        
        positionOrder.forEach(([position, neededCount]) => {
            const players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating);

            for (let i = 0; i < neededCount; i++) {
                for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                    const player = players.shift();
                    if (player) {
                        teams[teamIdx].push(player);
                        usedIds.add(player.id);
                    }
                }
            }
        });
        return teams;
    }
    
    // --- Algorithmic Helpers ---

    generateNeighborhood(teams, positions, size) {
        const neighborhood = [];
        for (let i = 0; i < size; i++) {
            const neighbor = this._fastCloneTeams(teams);
            if (this.config.adaptiveSwapEnabled) {
                this.performAdaptiveSwap(neighbor, positions);
            } else {
                this.performSwap(neighbor, positions);
            }
            neighborhood.push(neighbor);
        }
        return neighborhood;
    }

    generateEnhancedNeighbor(teams, positions) {
        const neighbor = this._fastCloneTeams(teams);
        if (this.config.adaptiveSwapEnabled) {
            this.performAdaptiveSwap(neighbor, positions);
        } else {
            this.performSwap(neighbor, positions);
        }
        return neighbor;
    }

    performAdaptiveSwap(teams, positions) {
        const teamStrengths = teams.map((team, idx) => ({ idx, strength: eloService.calculateTeamStrength(team).totalRating })).sort((a, b) => b.strength - a.strength);
        
        const strongestIdx = teamStrengths[0].idx;
        const weakestIdx = teamStrengths[teamStrengths.length - 1].idx;
        
        if (strongestIdx !== weakestIdx && Math.random() < this.config.adaptiveParameters.strongWeakSwapProbability) {
            const position = positions[Math.floor(Math.random() * positions.length)];
            
            const strongPlayers = teams[strongestIdx].filter(p => p.assignedPosition === position);
            const weakPlayers = teams[weakestIdx].filter(p => p.assignedPosition === position);
            
            if (strongPlayers.length > 0 && weakPlayers.length > 0) {
                const weakestInStrong = strongPlayers.reduce((min, p) => p.positionRating < min.positionRating ? p : min);
                const strongestInWeak = weakPlayers.reduce((max, p) => p.positionRating > max.positionRating ? p : max);
                
                const idx1 = teams[strongestIdx].findIndex(p => p.id === weakestInStrong.id);
                const idx2 = teams[weakestIdx].findIndex(p => p.id === strongestInWeak.id);
                
                if (idx1 !== -1 && idx2 !== -1) {
                    [teams[strongestIdx][idx1], teams[weakestIdx][idx2]] = [teams[weakestIdx][idx2], teams[strongestIdx][idx1]];
                    return true;
                }
            }
        }
        return this.performSwap(teams, positions);
    }
    
    performSwap(teams, positions) {
        if (teams.length < 2) return false;
        const t1 = Math.floor(Math.random() * teams.length);
        let t2;
        do { t2 = Math.floor(Math.random() * teams.length); } while (t1 === t2);

        const pos = positions[Math.floor(Math.random() * positions.length)];
        const t1Players = teams[t1].filter(p => p.assignedPosition === pos);
        const t2Players = teams[t2].filter(p => p.assignedPosition === pos);
        
        if (t1Players.length > 0 && t2Players.length > 0) {
            const p1 = t1Players[Math.floor(Math.random() * t1Players.length)];
            const p2 = t2Players[Math.floor(Math.random() * t2Players.length)];
            
            const idx1 = teams[t1].findIndex(p => p.id === p1.id);
            const idx2 = teams[t2].findIndex(p => p.id === p2.id);
            
            [teams[t1][idx1], teams[t2][idx2]] = [teams[t2][idx2], teams[t1][idx1]];
            return true;
        }
        return false;
    }
    
    smartMutate(teams, positions) {
        const positionImbalances = positions.map(pos => {
            const posStrengths = teams.map(team => team.filter(p => p.assignedPosition === pos).reduce((sum, p) => sum + p.positionRating, 0));
            return { pos, imbalance: Math.max(...posStrengths) - Math.min(...posStrengths) };
        }).sort((a, b) => b.imbalance - a.imbalance);
        
        const swapCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < swapCount; i++) {
            const useProblematic = Math.random() < 0.6;
            const position = useProblematic && positionImbalances.length > 0 ? positionImbalances[0].pos : positions[Math.floor(Math.random() * positions.length)];
            this.performAdaptiveSwap(teams, [position]);
        }
    }
    
    enhancedCrossover(parent1, parent2, composition) {
        const child = Array.from({ length: parent1.length }, () => []);
        const usedIds = new Set();
        
        const splitPoint = Math.floor(Math.random() * parent1.length);
        
        for (let i = 0; i < splitPoint; i++) {
            parent1[i].forEach(player => {
                child[i].push(player);
                usedIds.add(player.id);
            });
        }
        
        parent2.flat().forEach(player => {
            if (!usedIds.has(player.id)) {
                let placed = false;
                for (let i = 0; i < child.length; i++) {
                    const posCount = child[i].filter(p => p.assignedPosition === player.assignedPosition).length;
                    if (posCount < (composition[player.assignedPosition] || 0)) {
                        child[i].push(player);
                        placed = true;
                        break;
                    }
                }
                if (!placed) { // Fallback to smallest team
                    const teamSizes = child.map(t => t.length);
                    const targetTeamIdx = teamSizes.indexOf(Math.min(...teamSizes));
                    child[targetTeamIdx].push(player);
                }
                usedIds.add(player.id);
            }
        });
        
        return child;
    }

    tournamentSelection(scoredPopulation, tournamentSize) {
        let best = null;
        for (let i = 0; i < tournamentSize; i++) {
            const idx = Math.floor(Math.random() * scoredPopulation.length);
            if (!best || scoredPopulation[idx].score < best.score) {
                best = scoredPopulation[idx];
            }
        }
        return best.teams;
    }

    diversifyPopulation(population, composition, teamCount, playersByPosition) {
        const keepCount = Math.floor(population.length * 0.3); // Keep 30% best
        for (let i = keepCount; i < population.length; i++) {
            population[i] = Math.random() < 0.7 
                ? this.createRandomSolution(composition, teamCount, playersByPosition)
                : this.createPositionFocusedSolution(composition, teamCount, playersByPosition);
        }
    }

    perturbSolution(teams, positions, strength) {
        const numSwaps = Math.max(1, Math.floor(teams.length * positions.length * strength));
        for (let i = 0; i < numSwaps; i++) {
            this.performSwap(teams, positions);
        }
    }

    // --- Utility Methods ---

    enhancedValidate(composition, teamCount, players) {
        const errors = [], warnings = [];
        const playersByPosition = this.groupByPosition(players);
        let totalNeeded = 0;
        
        Object.entries(composition).forEach(([position, count]) => {
            const needed = count * teamCount;
            totalNeeded += needed;
            const available = playersByPosition[position]?.length || 0;
            if (available < needed) {
                errors.push({
                    message: `Not enough ${this.positions[position]}s: need ${needed}, have ${available}`
                });
            } else if (available === needed) {
                warnings.push({
                    message: `Exact match for ${this.positions[position]}s - no substitutes available`
                });
            }
        });

        return { isValid: errors.length === 0, errors, warnings };
    }

    groupByPosition(players) {
        const grouped = Object.fromEntries(Object.keys(this.positions).map(p => [p, []]));
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

    getUnusedPlayers(teams, allPlayers) {
        const usedIds = new Set(teams.flat().map(p => p.id));
        return allPlayers.filter(p => !usedIds.has(p.id));
    }
    
    hashSolution(teams) {
        return teams.map(team => team.map(p => p.id).sort().join(',')).sort().join('|');
    }

    _fastCloneTeams(teams) {
        return teams.map(team => team.map(player => ({ ...player })));
    }


    _adaptParameters(teamCount, totalPlayers) {
        // This method modifies the instance config, which is acceptable if done once per run.
        const complexity = teamCount * totalPlayers;
        const { geneticAlgorithm, tabuSearch, simulatedAnnealing, localSearch } = this.config.algorithms;
        
        if (complexity < 50) {
            geneticAlgorithm.generationCount = 50;
            tabuSearch.iterations = 2000;
            simulatedAnnealing.iterations = 10000;
            localSearch.iterations = 500;
        } else if (complexity < 200) {
            geneticAlgorithm.generationCount = 100;
            tabuSearch.iterations = 5000;
            simulatedAnnealing.iterations = 30000;
            localSearch.iterations = 1000;
        } else {
            geneticAlgorithm.generationCount = 150;
            tabuSearch.iterations = 8000;
            simulatedAnnealing.iterations = 50000;
            localSearch.iterations = 1500;
        }
    }
    
    _createEmptyStats() {
        return {
            geneticAlgorithm: { generations: 0, improvements: 0 },
            tabuSearch: { iterations: 0, improvements: 0 },
            simulatedAnnealing: { iterations: 0, improvements: 0, temperature: 0 },
            localSearch: { iterations: 0, improvements: 0 }
        };
    }
    
    _getAlgorithmStatistics(runContext) {
        return {
            geneticAlgorithm: { ...runContext.stats.geneticAlgorithm, config: runContext.config.algorithms.geneticAlgorithm },
            tabuSearch: { ...runContext.stats.tabuSearch, config: runContext.config.algorithms.tabuSearch },
            simulatedAnnealing: { ...runContext.stats.simulatedAnnealing, config: runContext.config.algorithms.simulatedAnnealing },
            localSearch: { ...runContext.stats.localSearch, config: runContext.config.algorithms.localSearch }
        };
    }
}

export default TeamOptimizerService;
