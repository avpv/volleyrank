/**
 * TeamOptimizerService - Team balancing with advanced algorithms
 * Uses Genetic Algorithm, Simulated Annealing, and Tabu Search
 * Enhanced with per-algorithm configuration
 */
import eloService from './EloService.js';

class TeamOptimizerService {
    constructor() {
        this.positions = {
            'S': 'Setter',
            'OPP': 'Opposite',
            'OH': 'Outside Hitter',
            'MB': 'Middle Blocker',
            'L': 'Libero'
        };
        
        // Global configuration
        this.config = {
            // Algorithm selection
            useGeneticAlgorithm: true,
            useTabuSearch: true,
            useSimulatedAnnealing: true,
            
            // Global strategies
            adaptiveSwapEnabled: true,
            
            // Adaptive parameters
            adaptiveParameters: {
                strongWeakSwapProbability: 0.7,
                positionBalanceWeight: 0.3,
                varianceWeight: 0.5
            }
        };
        
        // Per-algorithm configurations
        this.algorithmConfigs = {
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
                diversification: {
                    enabled: true,
                    frequency: 1000,
                    intensity: 0.3
                },
                intensification: {
                    enabled: true,
                    frequency: 500,
                    depth: 5
                }
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
                searchStrategy: 'first-improvement', // 'first-improvement' or 'best-improvement'
                neighborhoodSize: 10,
                perturbationEnabled: true,
                perturbationStrength: 0.1
            }
        };
        
        this.tabuList = [];
        this.algorithmStats = {
            geneticAlgorithm: { generations: 0, improvements: 0 },
            tabuSearch: { iterations: 0, improvements: 0 },
            simulatedAnnealing: { iterations: 0, improvements: 0, temperature: 0 },
            localSearch: { iterations: 0, improvements: 0 }
        };
    }

    /**
     * Main optimization entry point with per-algorithm configuration
     */
    async optimize(composition, teamCount, players) {
        // Enhanced validation with detailed information
        const validation = this.enhancedValidate(composition, teamCount, players);
        if (!validation.isValid) {
            throw new Error(validation.errors.map(e => e.message).join(', '));
        }

        // Adapt parameters based on problem size
        this.adaptParameters(teamCount, players.length);

        // Group players by position
        const playersByPosition = this.groupByPosition(players);
        const positions = Object.keys(composition).filter(pos => composition[pos] > 0);
        
        // Generate initial solutions
        const candidates = this.generateInitialSolutions(composition, teamCount, playersByPosition);

        // Reset algorithm statistics
        this.resetAlgorithmStats();

        // Run selected algorithms in parallel with their specific configurations
        const algorithmPromises = [];
        const algorithmNames = [];
        
        if (this.config.useGeneticAlgorithm) {
            algorithmPromises.push(
                this.runGeneticAlgorithm(candidates, composition, teamCount, playersByPosition, positions)
            );
            algorithmNames.push('Genetic Algorithm');
        }
        
        if (this.config.useTabuSearch) {
            algorithmPromises.push(this.runTabuSearch(candidates[0], positions));
            algorithmNames.push('Tabu Search');
        }
        
        if (this.config.useSimulatedAnnealing) {
            algorithmPromises.push(this.runSimulatedAnnealing(candidates[0], positions));
            algorithmNames.push('Simulated Annealing');
        }
        
        // Fallback: if no algorithms selected, use all
        if (algorithmPromises.length === 0) {
            algorithmPromises.push(
                this.runGeneticAlgorithm(candidates, composition, teamCount, playersByPosition, positions),
                this.runTabuSearch(candidates[0], positions),
                this.runSimulatedAnnealing(candidates[0], positions)
            );
            algorithmNames.push('Genetic Algorithm', 'Tabu Search', 'Simulated Annealing');
        }

        const results = await Promise.all(algorithmPromises);

        // Select best result
        const scores = results.map(r => this.evaluateSolution(r));
        const bestIdx = scores.indexOf(Math.min(...scores));
        
        // Refine with local search using its specific configuration
        const bestTeams = await this.runLocalSearch(results[bestIdx], positions);

        // Sort by strength
        bestTeams.sort((a, b) => {
            const aStrength = eloService.calculateTeamStrength(a).totalRating;
            const bStrength = eloService.calculateTeamStrength(b).totalRating;
            return bStrength - aStrength;
        });

        const balance = eloService.evaluateBalance(bestTeams);
        const unused = this.getUnusedPlayers(bestTeams, players);

        return {
            teams: bestTeams,
            balance,
            unusedPlayers: unused,
            validation,
            algorithm: algorithmNames[bestIdx],
            statistics: this.getAlgorithmStatistics()
        };
    }

    /**
     * Generate diverse initial solutions
     */
    generateInitialSolutions(composition, teamCount, playersByPosition) {
        const candidates = [];
        
        // Balanced rating solution
        candidates.push(this.createBalancedSolution(composition, teamCount, playersByPosition));
        
        // Snake draft solution
        candidates.push(this.createSnakeDraftSolution(composition, teamCount, playersByPosition));
        
        // Random solutions
        for (let i = 0; i < 3; i++) {
            candidates.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }
        
        // Position-focused solutions
        candidates.push(this.createPositionFocusedSolution(composition, teamCount, playersByPosition));
        
        return candidates;
    }

    /**
     * Position-focused initial solution
     */
    createPositionFocusedSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        
        // Process positions by importance (setter first, then opposites, etc.)
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
            const players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating)
                .slice(0, totalNeeded);
            
            // Distribute best players to different teams first
            for (let i = 0; i < neededCount; i++) {
                for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                    const playerIdx = teamIdx * neededCount + i;
                    if (playerIdx < players.length) {
                        teams[teamIdx].push(players[playerIdx]);
                        usedIds.add(players[playerIdx].id);
                    }
                }
            }
        });
        
        return teams;
    }

    /**
     * Genetic Algorithm with enhanced configuration
     */
    async runGeneticAlgorithm(initialPop, composition, teamCount, playersByPosition, positions) {
        const config = this.algorithmConfigs.geneticAlgorithm;
        let population = [...initialPop];
        
        // Expand population to required size
        while (population.length < config.populationSize) {
            population.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }

        let bestScore = this.evaluateSolution(population[0]);
        let stagnationCount = 0;

        for (let gen = 0; gen < config.generationCount; gen++) {
            this.algorithmStats.geneticAlgorithm.generations = gen + 1;
            
            // Evaluate population
            const scored = population.map(individual => ({
                teams: individual,
                score: this.evaluateSolution(individual)
            })).sort((a, b) => a.score - b.score);

            // Check for improvement
            if (scored[0].score < bestScore) {
                bestScore = scored[0].score;
                stagnationCount = 0;
                this.algorithmStats.geneticAlgorithm.improvements++;
            } else {
                stagnationCount++;
            }

            // Elitism: preserve best individuals
            const newPopulation = scored.slice(0, config.elitismCount).map(s => s.teams);

            // Selection and reproduction
            while (newPopulation.length < config.populationSize) {
                if (Math.random() < config.crossoverRate) {
                    const parent1 = this.tournamentSelection(scored, config.tournamentSize);
                    const parent2 = this.tournamentSelection(scored, config.tournamentSize);
                    const child = this.enhancedCrossover(parent1, parent2, composition);
                    newPopulation.push(child);
                } else {
                    const parent = this.tournamentSelection(scored, config.tournamentSize);
                    newPopulation.push(JSON.parse(JSON.stringify(parent)));
                }
            }

            // Adaptive mutation
            for (let i = config.elitismCount; i < newPopulation.length; i++) {
                const mutationRate = config.adaptiveMutation && stagnationCount > config.maxStagnation / 2 
                    ? config.mutationRate * 1.5 
                    : config.mutationRate;
                
                if (Math.random() < mutationRate) {
                    this.smartMutate(newPopulation[i], positions);
                }
            }

            population = newPopulation;

            // Stagnation check
            if (stagnationCount >= config.maxStagnation) {
                console.log(`GA: Stagnation detected at generation ${gen}, applying diversification`);
                this.diversifyPopulation(population, composition, teamCount, playersByPosition);
                stagnationCount = 0;
            }

            if (gen % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        const finalScored = population.map(individual => ({
            teams: individual,
            score: this.evaluateSolution(individual)
        })).sort((a, b) => a.score - b.score);

        return finalScored[0].teams;
    }

    /**
     * Tournament selection for GA
     */
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

    /**
     * Diversify population to escape local optima
     */
    diversifyPopulation(population, composition, teamCount, playersByPosition) {
        const keepCount = Math.floor(population.length * 0.3); // Keep 30% best
        for (let i = keepCount; i < population.length; i++) {
            if (Math.random() < 0.7) {
                population[i] = this.createRandomSolution(composition, teamCount, playersByPosition);
            } else {
                population[i] = this.createPositionFocusedSolution(composition, teamCount, playersByPosition);
            }
        }
    }

    /**
     * Tabu Search with enhanced configuration
     */
    async runTabuSearch(initialTeams, positions) {
        const config = this.algorithmConfigs.tabuSearch;
        let current = JSON.parse(JSON.stringify(initialTeams));
        let best = JSON.parse(JSON.stringify(initialTeams));
        let currentScore = this.evaluateSolution(current);
        let bestScore = currentScore;
        
        this.tabuList = [];
        let iterationSinceImprovement = 0;

        for (let iter = 0; iter < config.iterations; iter++) {
            this.algorithmStats.tabuSearch.iterations = iter + 1;
            
            // Generate neighbors
            const neighbors = this.generateEnhancedNeighbors(current, positions, config.neighborCount);
            
            // Select best non-tabu neighbor (with aspiration)
            let bestNeighbor = null;
            let bestNeighborScore = Infinity;
            
            for (const neighbor of neighbors) {
                const hash = this.hashSolution(neighbor);
                const score = this.evaluateSolution(neighbor);
                
                const isTabu = this.tabuList.includes(hash);
                const satisfiesAspiration = config.aspirationCriteria && score < bestScore;
                
                if (!isTabu || satisfiesAspiration) {
                    if (score < bestNeighborScore) {
                        bestNeighbor = neighbor;
                        bestNeighborScore = score;
                    }
                }
            }
            
            if (bestNeighbor) {
                current = bestNeighbor;
                currentScore = bestNeighborScore;
                
                // Update tabu list
                const hash = this.hashSolution(current);
                this.tabuList.push(hash);
                if (this.tabuList.length > config.tabuTenure) {
                    this.tabuList.shift();
                }
                
                // Update best solution
                if (currentScore < bestScore) {
                    best = JSON.parse(JSON.stringify(current));
                    bestScore = currentScore;
                    iterationSinceImprovement = 0;
                    this.algorithmStats.tabuSearch.improvements++;
                } else {
                    iterationSinceImprovement++;
                }
            }

            // Diversification strategy
            if (config.diversification.enabled && 
                iterationSinceImprovement > config.diversification.frequency) {
                console.log(`Tabu: Applying diversification at iteration ${iter}`);
                current = this.createRandomSolutionForTeams(best, positions);
                currentScore = this.evaluateSolution(current);
                iterationSinceImprovement = 0;
            }

            // Intensification strategy
            if (config.intensification.enabled && 
                iter % config.intensification.frequency === 0) {
                console.log(`Tabu: Applying intensification at iteration ${iter}`);
                current = await this.runLocalSearch(current, positions, config.intensification.depth);
                currentScore = this.evaluateSolution(current);
            }
            
            if (iter % 500 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        return best;
    }

    /**
     * Create random solution based on existing teams structure
     */
    createRandomSolutionForTeams(teams, positions) {
        const newTeams = JSON.parse(JSON.stringify(teams));
        
        // Perform several random swaps
        for (let i = 0; i < 10; i++) {
            this.performSwap(newTeams, positions);
        }
        
        return newTeams;
    }

    /**
     * Simulated Annealing with enhanced configuration
     */
    async runSimulatedAnnealing(initialTeams, positions) {
        const config = this.algorithmConfigs.simulatedAnnealing;
        let current = JSON.parse(JSON.stringify(initialTeams));
        let best = JSON.parse(JSON.stringify(initialTeams));
        let currentScore = this.evaluateSolution(current);
        let bestScore = currentScore;
        
        let temp = config.initialTemperature;
        let iterationSinceImprovement = 0;

        for (let iter = 0; iter < config.iterations; iter++) {
            this.algorithmStats.simulatedAnnealing.iterations = iter + 1;
            this.algorithmStats.simulatedAnnealing.temperature = temp;
            
            // Generate neighbor
            const neighbor = this.generateEnhancedNeighbor(current, positions);
            const neighborScore = this.evaluateSolution(neighbor);
            const delta = neighborScore - currentScore;
            
            // Acceptance probability
            if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
                current = neighbor;
                currentScore = neighborScore;
                
                if (neighborScore < bestScore) {
                    best = JSON.parse(JSON.stringify(neighbor));
                    bestScore = neighborScore;
                    iterationSinceImprovement = 0;
                    this.algorithmStats.simulatedAnnealing.improvements++;
                } else {
                    iterationSinceImprovement++;
                }
            }
            
            // Adaptive cooling
            if (config.adaptiveCooling) {
                const acceptanceRate = this.calculateAcceptanceRate(iter);
                if (acceptanceRate < 0.1) {
                    temp *= 0.99; // Slower cooling
                } else if (acceptanceRate > 0.5) {
                    temp *= 0.998; // Faster cooling
                } else {
                    temp *= config.coolingRate;
                }
            } else {
                temp *= config.coolingRate;
            }

            // Reheat strategy
            if (config.reheatEnabled && 
                iterationSinceImprovement > config.reheatIterations && 
                temp < config.reheatTemperature) {
                console.log(`SA: Reheating at iteration ${iter}, temp: ${temp}`);
                temp = config.reheatTemperature;
                iterationSinceImprovement = 0;
            }
            
            if (iter % 5000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        return best;
    }

    /**
     * Calculate acceptance rate for adaptive cooling (simplified)
     */
    calculateAcceptanceRate(iteration) {
        // Simplified implementation - in real scenario would track actual acceptance
        return Math.max(0.1, 0.5 - (iteration / this.algorithmConfigs.simulatedAnnealing.iterations) * 0.4);
    }

    /**
     * Local Search with configurable strategy
     */
    async runLocalSearch(teams, positions, maxIterations = null) {
        const config = this.algorithmConfigs.localSearch;
        const iterations = maxIterations || config.iterations;
        
        let current = JSON.parse(JSON.stringify(teams));
        let currentScore = this.evaluateSolution(current);
        let improved = true;
        let iter = 0;
        
        while (improved && iter < iterations) {
            improved = false;
            
            if (config.searchStrategy === 'first-improvement') {
                improved = await this.firstImprovementSearch(current, positions, iter);
            } else {
                improved = await this.bestImprovementSearch(current, positions, iter);
            }
            
            iter++;
            this.algorithmStats.localSearch.iterations = iter;
            
            if (improved) {
                this.algorithmStats.localSearch.improvements++;
            }
            
            // Perturbation strategy
            if (config.perturbationEnabled && !improved && iter % 50 === 0) {
                this.perturbSolution(current, positions, config.perturbationStrength);
                currentScore = this.evaluateSolution(current);
                improved = true;
            }
            
            if (iter % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        return current;
    }

    /**
     * First improvement local search
     */
    async firstImprovementSearch(current, positions, iter) {
        const neighborhood = this.generateNeighborhood(current, positions, 
            this.algorithmConfigs.localSearch.neighborhoodSize);
        
        for (const neighbor of neighborhood) {
            const neighborScore = this.evaluateSolution(neighbor);
            const currentScore = this.evaluateSolution(current);
            
            if (neighborScore < currentScore) {
                // Copy improving neighbor to current
                for (let i = 0; i < current.length; i++) {
                    current[i] = [...neighbor[i]];
                }
                return true;
            }
            
            if (iter % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        return false;
    }

    /**
     * Best improvement local search
     */
    async bestImprovementSearch(current, positions, iter) {
        const neighborhood = this.generateNeighborhood(current, positions, 
            this.algorithmConfigs.localSearch.neighborhoodSize);
        
        let bestNeighbor = null;
        let bestScore = this.evaluateSolution(current);
        
        for (const neighbor of neighborhood) {
            const neighborScore = this.evaluateSolution(neighbor);
            
            if (neighborScore < bestScore) {
                bestNeighbor = neighbor;
                bestScore = neighborScore;
            }
            
            if (iter % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        if (bestNeighbor) {
            for (let i = 0; i < current.length; i++) {
                current[i] = [...bestNeighbor[i]];
            }
            return true;
        }
        
        return false;
    }

    /**
     * Generate neighborhood for local search
     */
    generateNeighborhood(teams, positions, size) {
        const neighborhood = [];
        
        for (let i = 0; i < size; i++) {
            const neighbor = JSON.parse(JSON.stringify(teams));
            
            if (this.config.adaptiveSwapEnabled) {
                this.performAdaptiveSwap(neighbor, positions);
            } else {
                this.performSwap(neighbor, positions);
            }
            
            neighborhood.push(neighbor);
        }
        
        return neighborhood;
    }

    /**
     * Perturb solution to escape local optima
     */
    perturbSolution(teams, positions, strength) {
        const perturbationCount = Math.max(1, Math.floor(teams.length * positions.length * strength));
        
        for (let i = 0; i < perturbationCount; i++) {
            this.performSwap(teams, positions);
        }
    }

    /**
     * Get algorithm performance statistics
     */
    getAlgorithmStatistics() {
        return {
            geneticAlgorithm: {
                ...this.algorithmStats.geneticAlgorithm,
                config: this.algorithmConfigs.geneticAlgorithm
            },
            tabuSearch: {
                ...this.algorithmStats.tabuSearch,
                config: this.algorithmConfigs.tabuSearch
            },
            simulatedAnnealing: {
                ...this.algorithmStats.simulatedAnnealing,
                config: this.algorithmConfigs.simulatedAnnealing
            },
            localSearch: {
                ...this.algorithmStats.localSearch,
                config: this.algorithmConfigs.localSearch
            }
        };
    }

    /**
     * Reset algorithm statistics
     */
    resetAlgorithmStats() {
        this.algorithmStats = {
            geneticAlgorithm: { generations: 0, improvements: 0 },
            tabuSearch: { iterations: 0, improvements: 0 },
            simulatedAnnealing: { iterations: 0, improvements: 0, temperature: 0 },
            localSearch: { iterations: 0, improvements: 0 }
        };
    }

    /**
     * Enhanced validation with detailed warnings and information
     */
    enhancedValidate(composition, teamCount, players) {
        const errors = [];
        const warnings = [];
        
        const playersByPosition = this.groupByPosition(players);
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

    /**
     * Group players by position with ratings
     */
    groupByPosition(players) {
        const grouped = {};
        
        Object.keys(this.positions).forEach(pos => {
            grouped[pos] = [];
        });

        players.forEach(player => {
            if (player.positions && Array.isArray(player.positions)) {
                player.positions.forEach(position => {
                    if (grouped[position]) {
                        grouped[position].push({
                            ...player,
                            assignedPosition: position,
                            positionRating: player.ratings[position] || 1500,
                            rating: player.ratings[position] || 1500
                        });
                    }
                });
            }
        });

        return grouped;
    }

    /**
     * Adapt algorithm parameters based on problem size
     */
    adaptParameters(teamCount, totalPlayers) {
        const complexity = teamCount * totalPlayers;
        const gaConfig = this.algorithmConfigs.geneticAlgorithm;
        const tsConfig = this.algorithmConfigs.tabuSearch;
        const saConfig = this.algorithmConfigs.simulatedAnnealing;
        const lsConfig = this.algorithmConfigs.localSearch;
        
        if (complexity < 50) {
            gaConfig.generationCount = 50;
            tsConfig.iterations = 2000;
            saConfig.iterations = 10000;
            lsConfig.iterations = 500;
        } else if (complexity < 200) {
            gaConfig.generationCount = 100;
            tsConfig.iterations = 5000;
            saConfig.iterations = 30000;
            lsConfig.iterations = 1000;
        } else {
            gaConfig.generationCount = 150;
            tsConfig.iterations = 8000;
            saConfig.iterations = 50000;
            lsConfig.iterations = 1500;
        }
    }

    /**
     * Evaluate solution quality (lower is better)
     */
    evaluateSolution(teams) {
        if (!teams || teams.length === 0) return Infinity;

        const teamStrengths = teams.map(team => 
            eloService.calculateTeamStrength(team).totalRating
        );

        // Overall balance
        const balance = Math.max(...teamStrengths) - Math.min(...teamStrengths);
        
        // Variance
        const avg = teamStrengths.reduce((a, b) => a + b, 0) / teamStrengths.length;
        const variance = teamStrengths.reduce((sum, strength) => 
            sum + Math.pow(strength - avg, 2), 0) / teamStrengths.length;

        // Position-specific balance
        let positionImbalance = 0;
        const positions = ['S', 'OPP', 'OH', 'MB', 'L'];
        
        positions.forEach(pos => {
            const posStrengths = teams.map(team => {
                const posPlayers = team.filter(p => p.assignedPosition === pos);
                return posPlayers.reduce((sum, p) => sum + p.positionRating, 0);
            });
            
            if (posStrengths.length > 0 && posStrengths.some(s => s > 0)) {
                const maxPos = Math.max(...posStrengths);
                const minPos = Math.min(...posStrengths);
                positionImbalance += (maxPos - minPos);
            }
        });

        return balance * 1.0 + Math.sqrt(variance) * this.config.adaptiveParameters.varianceWeight + 
               positionImbalance * this.config.adaptiveParameters.positionBalanceWeight;
    }

    /**
     * Create balanced rating solution
     */
    createBalancedSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        
        const positionOrder = Object.entries(composition)
            .filter(([pos, count]) => count > 0)
            .sort((a, b) => {
                const aAvail = (playersByPosition[a[0]] || []).length;
                const bAvail = (playersByPosition[b[0]] || []).length;
                const aRatio = aAvail / (a[1] * teamCount);
                const bRatio = bAvail / (b[1] * teamCount);
                return aRatio - bRatio;
            });
        
        positionOrder.forEach(([position, neededCount]) => {
            const totalNeeded = neededCount * teamCount;
            const players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating)
                .slice(0, totalNeeded);
            
            for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                for (let i = 0; i < neededCount; i++) {
                    const playerIdx = teamIdx * neededCount + i;
                    if (playerIdx < players.length) {
                        teams[teamIdx].push(players[playerIdx]);
                        usedIds.add(players[playerIdx].id);
                    }
                }
            }
        });
        
        return teams;
    }

    /**
     * Create snake draft solution
     */
    createSnakeDraftSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();

        const positionOrder = Object.entries(composition)
            .filter(([pos, count]) => count > 0)
            .sort((a, b) => {
                const aAvail = (playersByPosition[a[0]] || []).length;
                const bAvail = (playersByPosition[b[0]] || []).length;
                const aRatio = aAvail / (a[1] * teamCount);
                const bRatio = bAvail / (b[1] * teamCount);
                return aRatio - bRatio;
            });

        positionOrder.forEach(([position, neededCount]) => {
            const totalNeeded = neededCount * teamCount;
            const players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating)
                .slice(0, totalNeeded);

            let playerIndex = 0;
            for (let round = 0; round < neededCount; round++) {
                const isEvenRound = round % 2 === 0;
                
                for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                    if (playerIndex < players.length) {
                        const actualTeamIdx = isEvenRound ? teamIdx : (teamCount - 1 - teamIdx);
                        teams[actualTeamIdx].push(players[playerIndex]);
                        usedIds.add(players[playerIndex].id);
                        playerIndex++;
                    }
                }
            }
        });

        return teams;
    }

    /**
     * Create random solution
     */
    createRandomSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();

        const positionOrder = Object.entries(composition)
            .filter(([pos, count]) => count > 0)
            .sort((a, b) => {
                const aAvail = (playersByPosition[a[0]] || []).length;
                const bAvail = (playersByPosition[b[0]] || []).length;
                const aRatio = aAvail / (a[1] * teamCount);
                const bRatio = bAvail / (b[1] * teamCount);
                return aRatio - bRatio;
            });

        positionOrder.forEach(([position, neededCount]) => {
            const totalNeeded = neededCount * teamCount;
            let players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .slice(0, totalNeeded);
            
            // Shuffle
            for (let i = players.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [players[i], players[j]] = [players[j], players[i]];
            }

            for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                for (let i = 0; i < neededCount; i++) {
                    const playerIdx = teamIdx * neededCount + i;
                    if (playerIdx < players.length) {
                        teams[teamIdx].push(players[playerIdx]);
                        usedIds.add(players[playerIdx].id);
                    }
                }
            }
        });

        return teams;
    }

    /**
     * Enhanced crossover from legacy approach
     */
    enhancedCrossover(parent1, parent2, composition) {
        const child = Array.from({ length: parent1.length }, () => []);
        const usedIds = new Set();
        
        const splitPoint = Math.floor(parent1.length / 2);
        
        for (let i = 0; i < splitPoint; i++) {
            parent1[i].forEach(player => {
                child[i].push({...player});
                usedIds.add(player.id);
            });
        }
        
        for (let i = splitPoint; i < parent2.length; i++) {
            parent2[i].forEach(player => {
                if (!usedIds.has(player.id)) {
                    child[i].push({...player});
                    usedIds.add(player.id);
                }
            });
        }
        
        parent2.forEach(team => {
            team.forEach(player => {
                if (!usedIds.has(player.id)) {
                    // Find team that needs this position
                    let placed = false;
                    for (let i = 0; i < child.length; i++) {
                        const posCount = child[i].filter(p => 
                            p.assignedPosition === player.assignedPosition
                        ).length;
                        const targetCount = composition[player.assignedPosition] || 0;
                        
                        if (posCount < targetCount) {
                            child[i].push({...player});
                            usedIds.add(player.id);
                            placed = true;
                            break;
                        }
                    }
                    
                    // If not placed by position, add to team with fewest players
                    if (!placed) {
                        const teamSizes = child.map(t => t.length);
                        const minSize = Math.min(...teamSizes);
                        const targetTeam = teamSizes.indexOf(minSize);
                        child[targetTeam].push({...player});
                        usedIds.add(player.id);
                    }
                }
            });
        });
        
        return child;
    }

    /**
     * Smart mutation focusing on problematic positions
     */
    smartMutate(teams, positions) {
        // Analyze position imbalances
        const positionImbalances = this.calculatePositionImbalances(teams, positions);
        
        // Sort positions by imbalance level (start with most problematic)
        const problematicPositions = positionImbalances
            .sort((a, b) => b.imbalance - a.imbalance)
            .map(p => p.position);
        
        const swapCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < swapCount; i++) {
            // 60% probability to swap problematic positions, 40% random
            const useProblematic = Math.random() < 0.6;
            const position = useProblematic && problematicPositions.length > 0 
                ? problematicPositions[0] 
                : positions[Math.floor(Math.random() * positions.length)];
            
            if (this.config.adaptiveSwapEnabled) {
                this.performAdaptiveSwap(teams, [position]);
            } else {
                this.performSwap(teams, [position]);
            }
        }
    }

    /**
     * Calculate position imbalances for smart mutation
     */
    calculatePositionImbalances(teams, positions) {
        return positions.map(position => {
            const posStrengths = teams.map(team => {
                const posPlayers = team.filter(p => p.assignedPosition === position);
                return posPlayers.reduce((sum, p) => sum + p.positionRating, 0);
            });
            
            const maxPos = Math.max(...posStrengths);
            const minPos = Math.min(...posStrengths);
            const imbalance = maxPos - minPos;
            
            return { position, imbalance };
        });
    }

    /**
     * Adaptive swap strategy from legacy approach
     */
    performAdaptiveSwap(teams, positions) {
        // Find strongest and weakest teams
        const teamStrengths = teams.map((team, idx) => ({
            idx,
            strength: eloService.calculateTeamStrength(team).totalRating
        }));
        
        teamStrengths.sort((a, b) => b.strength - a.strength);
        
        const strongestIdx = teamStrengths[0].idx;
        const weakestIdx = teamStrengths[teamStrengths.length - 1].idx;
        
        // Use adaptive probability for strong-weak swaps
        if (Math.random() < this.config.adaptiveParameters.strongWeakSwapProbability && 
            strongestIdx !== weakestIdx) {
            const position = positions[Math.floor(Math.random() * positions.length)];
            
            const strongPlayers = teams[strongestIdx].filter(p => p.assignedPosition === position);
            const weakPlayers = teams[weakestIdx].filter(p => p.assignedPosition === position);
            
            if (strongPlayers.length > 0 && weakPlayers.length > 0) {
                // Find weakest in strong team and strongest in weak team
                const weakestInStrong = strongPlayers.reduce((min, p) => 
                    p.positionRating < min.positionRating ? p : min
                );
                const strongestInWeak = weakPlayers.reduce((max, p) => 
                    p.positionRating > max.positionRating ? p : max
                );
                
                const idx1 = teams[strongestIdx].findIndex(p => p.id === weakestInStrong.id);
                const idx2 = teams[weakestIdx].findIndex(p => p.id === strongestInWeak.id);
                
                if (idx1 !== -1 && idx2 !== -1) {
                    [teams[strongestIdx][idx1], teams[weakestIdx][idx2]] = 
                    [teams[weakestIdx][idx2], teams[strongestIdx][idx1]];
                    return true; // Successful adaptive swap
                }
            }
        }
        
        // Fallback to random swap
        return this.performSwap(teams, positions);
    }

    /**
     * Perform single swap
     */
    performSwap(teams, positions) {
        const t1 = Math.floor(Math.random() * teams.length);
        let t2;
        do {
            t2 = Math.floor(Math.random() * teams.length);
        } while (t1 === t2);

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

    /**
     * Generate enhanced neighbors with adaptive strategy
     */
    generateEnhancedNeighbors(teams, positions, count) {
        const neighbors = [];
        
        for (let i = 0; i < count; i++) {
            const neighbor = JSON.parse(JSON.stringify(teams));
            
            if (this.config.adaptiveSwapEnabled) {
                this.performAdaptiveSwap(neighbor, positions);
            } else {
                this.performSwap(neighbor, positions);
            }
            
            neighbors.push(neighbor);
        }
        
        return neighbors;
    }

    /**
     * Hash solution for tabu list
     */
    hashSolution(teams) {
        return teams.map(team => 
            team.map(p => p.id).sort().join(',')
        ).join('|');
    }

    /**
     * Generate enhanced neighbor for Simulated Annealing
     */
    generateEnhancedNeighbor(teams, positions) {
        const neighbor = JSON.parse(JSON.stringify(teams));
        
        if (this.config.adaptiveSwapEnabled) {
            this.performAdaptiveSwap(neighbor, positions);
        } else {
            this.performSwap(neighbor, positions);
        }
        
        return neighbor;
    }

    /**
     * Get unused players
     */
    getUnusedPlayers(teams, allPlayers) {
        const usedIds = new Set();
        teams.forEach(team => {
            team.forEach(player => {
                usedIds.add(player.id);
            });
        });

        return allPlayers.filter(p => !usedIds.has(p.id));
    }
}

export default new TeamOptimizerService();
