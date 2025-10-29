/**
 * Ultimate Team Optimizer Workflow
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
        
        // Position order for sorting players in teams
        this.positionOrder = ['S', 'OPP', 'OH', 'MB', 'L'];
        
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
                tabuTenure: 100,  // Increased from 50: with 20 neighbors/iteration, 50 fills in 2.5 iterations
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
                alpha: 1.0,          // Pheromone importance
                beta: 2.0,           // Heuristic importance
                evaporationRate: 0.1,
                pheromoneDeposit: 100,
                elitistWeight: 2.0   // Best solution pheromone multiplier
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
        
        this.tabuList = [];
        this.algorithmStats = {};
    }

    async optimize(composition, teamCount, players) {
        const validation = this.enhancedValidate(composition, teamCount, players);
        if (!validation.isValid) {
            throw new Error(validation.errors.map(e => e.message).join(', '));
        }

        this.adaptParameters(teamCount, players.length);
        const playersByPosition = this.groupByPosition(players);
        const positions = Object.keys(composition).filter(pos => composition[pos] > 0);
        
        const candidates = this.generateInitialSolutions(composition, teamCount, playersByPosition);
        this.resetAlgorithmStats();

        const algorithmPromises = [];
        const algorithmNames = [];
        
        if (this.config.useGeneticAlgorithm) {
            algorithmPromises.push(this.runGeneticAlgorithm(candidates, composition, teamCount, playersByPosition, positions));
            algorithmNames.push('Genetic Algorithm');
        }
        if (this.config.useTabuSearch) {
            algorithmPromises.push(this.runMultiStartTabuSearch(candidates, positions));
            algorithmNames.push('Tabu Search');
        }
        if (this.config.useSimulatedAnnealing) {
            algorithmPromises.push(this.runSimulatedAnnealing(candidates[0], positions));
            algorithmNames.push('Simulated Annealing');
        }
        if (this.config.useAntColony) {
            algorithmPromises.push(this.runAntColonyOptimization(composition, teamCount, playersByPosition, positions));
            algorithmNames.push('Ant Colony Optimization');
        }
        if (this.config.useConstraintProgramming) {
            algorithmPromises.push(this.runConstraintProgramming(composition, teamCount, playersByPosition, positions));
            algorithmNames.push('Constraint Programming');
        }
        
        if (algorithmPromises.length === 0) {
            this.config.useGeneticAlgorithm = true;
            this.config.useTabuSearch = true;
            return this.optimize(composition, teamCount, players);
        }

        const results = await Promise.all(algorithmPromises);
        const scores = results.map(r => this.evaluateSolution(r));
        const bestIdx = scores.indexOf(Math.min(...scores));
        
        console.log(`Best initial result from: ${algorithmNames[bestIdx]}`);
        const bestTeams = await this.runLocalSearch(results[bestIdx], positions);

        // Sort teams by strength (strongest first)
        bestTeams.sort((a, b) => {
            const aStrength = eloService.calculateTeamStrength(a).totalRating;
            const bStrength = eloService.calculateTeamStrength(b).totalRating;
            return bStrength - aStrength;
        });

        // Sort players within each team by position order
        bestTeams.forEach(team => this.sortTeamByPosition(team));

        const balance = eloService.evaluateBalance(bestTeams);
        const unused = this.getUnusedPlayers(bestTeams, players);

        return {
            teams: bestTeams,
            balance,
            unusedPlayers: unused,
            validation,
            algorithm: `${algorithmNames[bestIdx]} + Local Search Refinement`,
            statistics: this.getAlgorithmStatistics()
        };
    }

    performUniversalSwap(teams, positions) {
        const rand = Math.random();
        
        if (rand < 0.25) {
            this.performSwap(teams, positions);
        } 
        else if (rand < 0.5) {
            this.performAdaptiveSwap(teams, positions);
        } 
        else if (rand < 0.75) {
            this.performCrossTeamPositionSwap(teams);
        } 
        else {
            this.performPositionSwap(teams);
        }
    }

    performAdaptiveSwap(teams, positions) {
        const teamStrengths = teams.map((team, idx) => ({
            idx,
            strength: eloService.calculateTeamStrength(team).totalRating
        })).sort((a, b) => b.strength - a.strength);
        
        if (teamStrengths.length < 2) {
            return this.performSwap(teams, positions);
        }
        
        const strongestIdx = teamStrengths[0].idx;
        const weakestIdx = teamStrengths[teamStrengths.length - 1].idx;
        
        if (Math.random() < this.config.adaptiveParameters.strongWeakSwapProbability && strongestIdx !== weakestIdx) {
            const position = positions[Math.floor(Math.random() * positions.length)];
            const strongPlayers = teams[strongestIdx].filter(p => p.assignedPosition === position);
            const weakPlayers = teams[weakestIdx].filter(p => p.assignedPosition === position);
            
            if (strongPlayers.length > 0 && weakPlayers.length > 0) {
                const weakestInStrong = strongPlayers.reduce((min, p) => p.positionRating < min.positionRating ? p : min);
                const strongestInWeak = weakPlayers.reduce((max, p) => p.positionRating > max.positionRating ? p : max);
                const idx1 = teams[strongestIdx].findIndex(p => p.id === weakestInStrong.id);
                const idx2 = teams[weakestIdx].findIndex(p => p.id === strongestInWeak.id);
                
                if (idx1 !== -1 && idx2 !== -1 && weakestInStrong.positionRating < strongestInWeak.positionRating) {
                     [teams[strongestIdx][idx1], teams[weakestIdx][idx2]] = [teams[weakestIdx][idx2], teams[strongestIdx][idx1]];
                     return;
                }
            }
        }
        this.performSwap(teams, positions);
    }
    
    performSwap(teams, positions) {
        if (teams.length < 2 || positions.length === 0) return;
        const t1_idx = Math.floor(Math.random() * teams.length);
        let t2_idx;
        do { t2_idx = Math.floor(Math.random() * teams.length); } while (t1_idx === t2_idx);
        
        const pos = positions[Math.floor(Math.random() * positions.length)];
        const t1Players = teams[t1_idx].filter(p => p.assignedPosition === pos);
        const t2Players = teams[t2_idx].filter(p => p.assignedPosition === pos);
        
        if (t1Players.length > 0 && t2Players.length > 0) {
            const p1 = t1Players[Math.floor(Math.random() * t1Players.length)];
            const p2 = t2Players[Math.floor(Math.random() * t2Players.length)];
            const idx1 = teams[t1_idx].findIndex(p => p.id === p1.id);
            const idx2 = teams[t2_idx].findIndex(p => p.id === p2.id);
            if (idx1 !== -1 && idx2 !== -1) {
                [teams[t1_idx][idx1], teams[t2_idx][idx2]] = [teams[t2_idx][idx2], teams[t1_idx][idx1]];
            }
        }
    }

    performPositionSwap(teams) {
        if (teams.length === 0) return;
        const teamIndex = Math.floor(Math.random() * teams.length);
        const team = teams[teamIndex];
        if (team.length < 2) return;
        
        const idx1 = Math.floor(Math.random() * team.length);
        let idx2;
        do { idx2 = Math.floor(Math.random() * team.length); } while (idx1 === idx2);
        
        const p1 = team[idx1];
        const p2 = team[idx2];
        
        if (p1.positions.includes(p2.assignedPosition) && p2.positions.includes(p1.assignedPosition)) {
            const p1_new_pos = p2.assignedPosition;
            const p2_new_pos = p1.assignedPosition;
            
            p1.assignedPosition = p1_new_pos;
            p1.positionRating = p1.ratings[p1_new_pos] || 1500;
            
            p2.assignedPosition = p2_new_pos;
            p2.positionRating = p2.ratings[p2_new_pos] || 1500;
        }
    }

    performCrossTeamPositionSwap(teams) {
        if (teams.length < 2) return;
        const t1_idx = Math.floor(Math.random() * teams.length);
        let t2_idx;
        do { t2_idx = Math.floor(Math.random() * teams.length); } while (t1_idx === t2_idx);

        const team1 = teams[t1_idx];
        const team2 = teams[t2_idx];
        if (team1.length === 0 || team2.length === 0) return;

        const p1_idx = Math.floor(Math.random() * team1.length);
        const p2_idx = Math.floor(Math.random() * team2.length);
        const p1 = team1[p1_idx];
        const p2 = team2[p2_idx];

        if (p1.assignedPosition === p2.assignedPosition) return;
        
        if (p1.positions.includes(p2.assignedPosition) && p2.positions.includes(p1.assignedPosition)) {
            const p1_new_pos = p2.assignedPosition;
            const p2_new_pos = p1.assignedPosition;

            [teams[t1_idx][p1_idx], teams[t2_idx][p2_idx]] = [p2, p1];
            
            p1.assignedPosition = p1_new_pos;
            p1.positionRating = p1.ratings[p1_new_pos] || 1500;
            
            p2.assignedPosition = p2_new_pos;
            p2.positionRating = p2.ratings[p2_new_pos] || 1500;
        }
    }

    cloneTeams(teams) {
        if (!Array.isArray(teams)) {
            console.error('cloneTeams: teams is not an array', teams);
            return [];
        }
        return teams.map(team => {
            if (!Array.isArray(team)) {
                console.error('cloneTeams: team is not an array', team);
                return [];
            }
            return team.map(player => ({ ...player }));
        });
    }

    async runGeneticAlgorithm(initialPop, composition, teamCount, playersByPosition, positions) {
        const config = this.algorithmConfigs.geneticAlgorithm;
        let population = [...initialPop];
        
        while (population.length < config.populationSize) {
            population.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }

        let bestScore = Infinity;
        let stagnationCount = 0;

        for (let gen = 0; gen < config.generationCount; gen++) {
            this.algorithmStats.geneticAlgorithm.generations = gen + 1;
            const scored = population.map(individual => ({
                teams: individual,
                score: this.evaluateSolution(individual)
            })).sort((a, b) => a.score - b.score);

            if (scored[0].score < bestScore) {
                bestScore = scored[0].score;
                stagnationCount = 0;
                this.algorithmStats.geneticAlgorithm.improvements++;
            } else {
                stagnationCount++;
            }

            const newPopulation = scored.slice(0, config.elitismCount).map(s => s.teams);

            while (newPopulation.length < config.populationSize) {
                const parent1 = this.tournamentSelection(scored, config.tournamentSize);
                if (Math.random() < config.crossoverRate) {
                    const parent2 = this.tournamentSelection(scored, config.tournamentSize);
                    newPopulation.push(this.enhancedCrossover(parent1, parent2, composition));
                } else {
                    newPopulation.push(this.cloneTeams(parent1));
                }
            }

            for (let i = config.elitismCount; i < newPopulation.length; i++) {
                if (Math.random() < config.mutationRate) {
                    this.performUniversalSwap(newPopulation[i], positions);
                }
            }

            if (stagnationCount >= config.maxStagnation) {
                for (let i = Math.ceil(population.length / 2); i < population.length; i++) {
                     population[i] = this.createRandomSolution(composition, teamCount, playersByPosition);
                }
                stagnationCount = 0;
            }
            
            population = newPopulation;
            if (gen % 10 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }

        return population.map(ind => ({ teams: ind, score: this.evaluateSolution(ind) }))
            .sort((a, b) => a.score - b.score)[0].teams;
    }
    
    async runTabuSearch(initialTeams, positions) {
        const config = this.algorithmConfigs.tabuSearch;
        let current = this.cloneTeams(initialTeams);
        let best = this.cloneTeams(current);
        let bestScore = this.evaluateSolution(best);
        const tabuSet = new Set(); // Use Set instead of Array for O(1) lookup
        const tabuQueue = []; // Keep queue for FIFO removal
        let iterationSinceImprovement = 0;

        for (let iter = 0; iter < config.iterations; iter++) {
            this.algorithmStats.tabuSearch.iterations = iter + 1;
            const neighbors = this.generateNeighborhood(current, positions, config.neighborCount);
            
            let bestNeighbor = null;
            let bestNeighborScore = Infinity;
            let bestNonTabuNeighbor = null;
            let bestNonTabuScore = Infinity;
            
            // Find best neighbor (considering tabu list and aspiration criterion)
            for (const neighbor of neighbors) {
                const hash = this.hashSolution(neighbor);
                const score = this.evaluateSolution(neighbor);
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
            
            // CRITICAL FIX: If all neighbors are tabu and worse than bestScore,
            // accept the best non-tabu neighbor to prevent getting stuck
            if (bestNeighbor === null && bestNonTabuNeighbor !== null) {
                bestNeighbor = bestNonTabuNeighbor;
                bestNeighborScore = bestNonTabuScore;
            }
            
            if (bestNeighbor) {
                current = bestNeighbor;
                const currentScore = bestNeighborScore;
                const currentHash = this.hashSolution(current);
                
                // Add to tabu set and queue
                tabuSet.add(currentHash);
                tabuQueue.push(currentHash);
                
                // Remove oldest if exceeds tenure
                if (tabuQueue.length > config.tabuTenure) {
                    const oldHash = tabuQueue.shift();
                    tabuSet.delete(oldHash);
                }
                
                if (currentScore < bestScore) {
                    best = this.cloneTeams(current);
                    bestScore = currentScore;
                    iterationSinceImprovement = 0;
                    this.algorithmStats.tabuSearch.improvements++;
                } else {
                    iterationSinceImprovement++;
                }
            } else {
                // CRITICAL FIX: Force diversification if stuck
                iterationSinceImprovement++;
            }
            
            // Periodic diversification to escape local minima
            if (iter > 0 && iter % config.diversificationFrequency === 0) {
                current = this.cloneTeams(best);
                // Perform multiple random swaps for strong diversification
                const swapCount = Math.max(3, Math.floor(current[0].length / 2));
                for (let i = 0; i < swapCount; i++) {
                    this.performUniversalSwap(current, positions);
                }
                // Partially clear tabu structures (keep 50%)
                const keepCount = Math.floor(config.tabuTenure / 2);
                while (tabuQueue.length > keepCount) {
                    const oldHash = tabuQueue.shift();
                    tabuSet.delete(oldHash);
                }
                iterationSinceImprovement = 0;
            }
            
            // Restart on long stagnation
            if (iterationSinceImprovement > 500) {
                current = this.cloneTeams(best);
                for (let i = 0; i < 5; i++) {
                    this.performUniversalSwap(current, positions);
                }
                iterationSinceImprovement = 0;
            }
            if (iter % 500 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }
        return best;
    }

    /**
     * Multi-Start Tabu Search
     * Runs Tabu Search from multiple initial solutions and returns the best result
     */
    async runMultiStartTabuSearch(candidates, positions) {
        // Use up to 3 different initial solutions
        const startCount = Math.min(3, candidates.length);
        const results = [];
        
        for (let i = 0; i < startCount; i++) {
            const result = await this.runTabuSearch(candidates[i], positions);
            results.push(result);
        }
        
        // Return the best solution found
        const scores = results.map(r => this.evaluateSolution(r));
        const bestIdx = scores.indexOf(Math.min(...scores));
        return results[bestIdx];
    }

    async runSimulatedAnnealing(initialTeams, positions) {
        const config = this.algorithmConfigs.simulatedAnnealing;
        let current = this.cloneTeams(initialTeams);
        let best = this.cloneTeams(current);
        let currentScore = this.evaluateSolution(current);
        let bestScore = currentScore;
        let temp = config.initialTemperature;
        let iterationSinceImprovement = 0;

        for (let iter = 0; iter < config.iterations; iter++) {
            this.algorithmStats.simulatedAnnealing.iterations = iter + 1;
            this.algorithmStats.simulatedAnnealing.temperature = temp;
            
            const neighbor = this.cloneTeams(current);
            this.performUniversalSwap(neighbor, positions);
            const neighborScore = this.evaluateSolution(neighbor);
            const delta = neighborScore - currentScore;
            
            if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
                current = neighbor;
                currentScore = neighborScore;
                if (neighborScore < bestScore) {
                    best = this.cloneTeams(neighbor);
                    bestScore = neighborScore;
                    iterationSinceImprovement = 0;
                    this.algorithmStats.simulatedAnnealing.improvements++;
                } else {
                    iterationSinceImprovement++;
                }
            }
            temp *= config.coolingRate;
            if (config.reheatEnabled && iterationSinceImprovement > config.reheatIterations) {
                temp = config.reheatTemperature;
                iterationSinceImprovement = 0;
            }
            if (iter % 5000 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }
        return best;
    }

    /**
     * Ant Colony Optimization (ACO)
     * Inspired by foraging behavior of ants using pheromone trails
     */
    async runAntColonyOptimization(composition, teamCount, playersByPosition, positions) {
        const config = this.algorithmConfigs.antColony;
        
        // Initialize pheromone matrix: [playerId][teamIndex] = pheromone level
        const allPlayers = Object.values(playersByPosition).flat();
        const pheromones = new Map();
        allPlayers.forEach(player => {
            const teamPheromones = Array(teamCount).fill(1.0);
            pheromones.set(player.id, teamPheromones);
        });
        
        let globalBest = null;
        let globalBestScore = Infinity;
        
        this.algorithmStats.antColony = { iterations: 0, improvements: 0 };
        
        for (let iter = 0; iter < config.iterations; iter++) {
            this.algorithmStats.antColony.iterations = iter + 1;
            const iterationSolutions = [];
            
            // Each ant constructs a solution
            for (let ant = 0; ant < config.antCount; ant++) {
                const solution = this.constructAntSolution(
                    composition, 
                    teamCount, 
                    playersByPosition, 
                    pheromones, 
                    config
                );
                
                const score = this.evaluateSolution(solution);
                iterationSolutions.push({ solution, score });
                
                if (score < globalBestScore) {
                    globalBest = this.cloneTeams(solution);
                    globalBestScore = score;
                    this.algorithmStats.antColony.improvements++;
                }
            }
            
            // Evaporate pheromones
            pheromones.forEach((teamPheromones, playerId) => {
                for (let t = 0; t < teamCount; t++) {
                    teamPheromones[t] *= (1 - config.evaporationRate);
                }
            });
            
            // Deposit pheromones
            iterationSolutions.forEach(({ solution, score }) => {
                const deposit = config.pheromoneDeposit / (1 + score);
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
                const elitistDeposit = config.pheromoneDeposit * config.elitistWeight / (1 + globalBestScore);
                globalBest.forEach((team, teamIndex) => {
                    team.forEach(player => {
                        const teamPheromones = pheromones.get(player.id);
                        if (teamPheromones) {
                            teamPheromones[teamIndex] += elitistDeposit;
                        }
                    });
                });
            }
            
            if (iter % 10 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }
        
        return globalBest || this.generateInitialSolutions(composition, teamCount, playersByPosition)[0];
    }
    
    /**
     * Construct a solution using ant colony principles
     */
    constructAntSolution(composition, teamCount, playersByPosition, pheromones, config) {
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
                        pheromones,
                        config
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
     */
    calculateAntProbabilities(players, teamIndex, position, pheromones, config) {
        const probabilities = [];
        let totalProbability = 0;
        
        players.forEach(player => {
            const teamPheromones = pheromones.get(player.id) || Array(10).fill(1.0);
            const pheromone = teamPheromones[teamIndex] || 1.0;
            
            // Heuristic: rating strength
            const rating = player.ratings?.[position] || 1500;
            const heuristic = rating / 1500; // Normalize around 1.0
            
            // Probability = pheromone^alpha * heuristic^beta
            const probability = Math.pow(pheromone, config.alpha) * Math.pow(heuristic, config.beta);
            probabilities.push(probability);
            totalProbability += probability;
        });
        
        // Normalize probabilities
        return probabilities.map(p => totalProbability > 0 ? p / totalProbability : 1 / players.length);
    }
    
    /**
     * Roulette wheel selection
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

    /**
     * Constraint Programming (CP)
     * Uses backtracking with constraint propagation and intelligent heuristics
     */
    async runConstraintProgramming(composition, teamCount, playersByPosition, positions) {
        const config = this.algorithmConfigs.constraintProgramming;
        
        this.algorithmStats.constraintProgramming = { 
            iterations: 0, 
            improvements: 0, 
            backtracks: 0,
            conflicts: 0
        };
        
        // Build constraint model
        const variables = this.buildCPVariables(composition, teamCount, playersByPosition);
        const constraints = this.buildCPConstraints(composition, teamCount, variables);
        
        // Try to find solution using backtracking with constraint propagation
        const solution = await this.cpBacktrackingSearch(
            variables,
            constraints,
            composition,
            teamCount,
            playersByPosition,
            config
        );
        
        if (!solution) {
            console.warn('CP: No solution found, using greedy construction');
            return this.generateInitialSolutions(composition, teamCount, playersByPosition)[0];
        }
        
        return this.convertCPSolutionToTeams(solution, variables, composition, teamCount, playersByPosition);
    }
    
    /**
     * Build CP variables: each player needs to be assigned to a team and position
     */
    buildCPVariables(composition, teamCount, playersByPosition) {
        const variables = [];
        
        // For each team and position slot, we need to assign a player
        for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
            Object.entries(composition).forEach(([position, count]) => {
                for (let slot = 0; slot < count; slot++) {
                    const eligiblePlayers = playersByPosition[position] || [];
                    variables.push({
                        id: `team${teamIdx}_${position}_${slot}`,
                        teamIndex: teamIdx,
                        position: position,
                        slotIndex: slot,
                        domain: eligiblePlayers.map(p => p.id),
                        assignment: null,
                        constraints: []
                    });
                }
            });
        }
        
        return variables;
    }
    
    /**
     * Build CP constraints
     */
    buildCPConstraints(composition, teamCount, variables) {
        const constraints = [];
        
        // Constraint 1: Each player can only be assigned once (AllDifferent)
        constraints.push({
            type: 'all-different',
            variables: variables,
            check: (assignments) => {
                const assigned = assignments.filter(a => a !== null);
                return assigned.length === new Set(assigned).size;
            }
        });
        
        // Constraint 2: Team balance (soft constraint)
        for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
            const teamVars = variables.filter(v => v.teamIndex === teamIdx);
            constraints.push({
                type: 'team-balance',
                variables: teamVars,
                teamIndex: teamIdx,
                check: (assignments, playersByPosition) => {
                    // This is a soft constraint - always true, but affects score
                    return true;
                }
            });
        }
        
        return constraints;
    }
    
    /**
     * Backtracking search with constraint propagation
     */
    async cpBacktrackingSearch(variables, constraints, composition, teamCount, playersByPosition, config, depth = 0) {
        this.algorithmStats.constraintProgramming.iterations++;
        
        // Check if solution is complete
        if (variables.every(v => v.assignment !== null)) {
            return variables.map(v => v.assignment);
        }
        
        // Check backtrack limit
        if (this.algorithmStats.constraintProgramming.backtracks >= config.maxBacktracks) {
            return null;
        }
        
        // Select next variable using heuristic
        const nextVar = this.selectCPVariable(variables, config);
        if (!nextVar) return null;
        
        // Order values using heuristic
        const orderedValues = this.orderCPValues(nextVar, variables, playersByPosition, config);
        
        // Try each value
        for (const playerId of orderedValues) {
            // Assign value
            nextVar.assignment = playerId;
            
            // Check constraints
            if (this.checkCPConstraints(variables, constraints, playersByPosition)) {
                // Propagate constraints
                const propagatedDomains = this.propagateCPConstraints(variables, constraints);
                
                // Recursively search
                const result = await this.cpBacktrackingSearch(
                    variables, 
                    constraints, 
                    composition, 
                    teamCount, 
                    playersByPosition, 
                    config,
                    depth + 1
                );
                
                if (result) return result;
                
                // Restore domains after failed branch
                this.restoreCPDomains(variables, propagatedDomains);
            } else {
                this.algorithmStats.constraintProgramming.conflicts++;
            }
            
            // Unassign and backtrack
            nextVar.assignment = null;
            this.algorithmStats.constraintProgramming.backtracks++;
        }
        
        if (depth % 50 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        
        return null;
    }
    
    /**
     * Select next variable to assign (most constrained first)
     */
    selectCPVariable(variables, config) {
        const unassigned = variables.filter(v => v.assignment === null);
        if (unassigned.length === 0) return null;
        
        if (config.variableOrderingHeuristic === 'most-constrained') {
            // Choose variable with smallest domain (MRV - Minimum Remaining Values)
            return unassigned.reduce((min, v) => 
                v.domain.length < min.domain.length ? v : min
            );
        }
        
        return unassigned[0];
    }
    
    /**
     * Order values for a variable (least constraining first)
     */
    orderCPValues(variable, allVariables, playersByPosition, config) {
        if (config.valueOrderingHeuristic === 'least-constraining') {
            // Try to order by how many options it leaves for other variables
            return [...variable.domain].sort((a, b) => {
                const aConstrains = this.countConstrainedByAssignment(a, variable, allVariables);
                const bConstrains = this.countConstrainedByAssignment(b, variable, allVariables);
                return aConstrains - bConstrains;
            });
        }
        
        return variable.domain;
    }
    
    /**
     * Count how many variables would be constrained by this assignment
     */
    countConstrainedByAssignment(playerId, variable, allVariables) {
        let count = 0;
        allVariables.forEach(v => {
            if (v !== variable && v.assignment === null && v.domain.includes(playerId)) {
                count++;
            }
        });
        return count;
    }
    
    /**
     * Check if current partial assignment satisfies constraints
     */
    checkCPConstraints(variables, constraints, playersByPosition) {
        const assignments = variables.map(v => v.assignment);
        
        for (const constraint of constraints) {
            if (constraint.type === 'all-different') {
                const assigned = assignments.filter(a => a !== null);
                if (assigned.length !== new Set(assigned).size) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Propagate constraints to reduce domains
     */
    propagateCPConstraints(variables, constraints) {
        const oldDomains = new Map();
        
        // Save current domains
        variables.forEach(v => {
            oldDomains.set(v.id, [...v.domain]);
        });
        
        // Remove assigned values from other variables' domains
        const assignedValues = new Set(
            variables.filter(v => v.assignment !== null).map(v => v.assignment)
        );
        
        variables.forEach(v => {
            if (v.assignment === null) {
                v.domain = v.domain.filter(playerId => !assignedValues.has(playerId));
            }
        });
        
        return oldDomains;
    }
    
    /**
     * Restore domains after backtracking
     */
    restoreCPDomains(variables, oldDomains) {
        variables.forEach(v => {
            const oldDomain = oldDomains.get(v.id);
            if (oldDomain) {
                v.domain = [...oldDomain];
            }
        });
    }
    
    /**
     * Convert CP solution to team structure
     */
    convertCPSolutionToTeams(solution, variables, composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const allPlayers = Object.values(playersByPosition).flat();
        const playerMap = new Map(allPlayers.map(p => [p.id, p]));
        
        variables.forEach((variable, idx) => {
            const playerId = solution[idx];
            const player = playerMap.get(playerId);
            if (player) {
                teams[variable.teamIndex].push(player);
            }
        });
        
        return teams;
    }

    async runLocalSearch(teams, positions) {
        const config = this.algorithmConfigs.localSearch;
        let current = this.cloneTeams(teams);
        let currentScore = this.evaluateSolution(current);
        
        for (let iter = 0; iter < config.iterations; iter++) {
            this.algorithmStats.localSearch.iterations = iter + 1;
            const neighbor = this.cloneTeams(current);
            this.performUniversalSwap(neighbor, positions);
            const neighborScore = this.evaluateSolution(neighbor);
            if (neighborScore < currentScore) {
                current = neighbor;
                currentScore = neighborScore;
                this.algorithmStats.localSearch.improvements++;
            }
            if (iter % 100 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }
        return current;
    }
    
    generateNeighborhood(teams, positions, size) {
        return Array.from({ length: size }, () => {
            const neighbor = this.cloneTeams(teams);
            this.performUniversalSwap(neighbor, positions);
            return neighbor;
        });
    }

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
                    errors.push({ position, needed, available, message: `Not enough ${this.positions[position]}s: need ${needed}, have ${available}` });
                }
            }
        });
        if(players.length < totalNeeded) {
            errors.push({message: `Not enough total players: need ${totalNeeded}, have ${players.length}`});
        }

        return { isValid: errors.length === 0, errors, warnings };
    }

    groupByPosition(players) {
        const grouped = {};
        players.forEach(player => {
            if (player.positions && Array.isArray(player.positions)) {
                player.positions.forEach(position => {
                    if (!grouped[position]) grouped[position] = [];
                    grouped[position].push({ ...player, assignedPosition: position, positionRating: player.ratings[position] || 1500 });
                });
            }
        });
        return grouped;
    }

    generateInitialSolutions(composition, teamCount, playersByPosition) {
        const solutions = [];
        solutions.push(this.createBalancedSolution(composition, teamCount, playersByPosition));
        solutions.push(this.createSnakeDraftSolution(composition, teamCount, playersByPosition));
        for(let i=0; i<3; i++) {
           solutions.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }
        return solutions;
    }
    
    createBalancedSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        
        // Smart position ordering: fill scarce positions first
        // Priority: MB > S > L > OPP > OH (typically MB and S are most scarce)
        const positionPriority = ['MB', 'S', 'L', 'OPP', 'OH'];
        const positionOrder = positionPriority
            .map(pos => [pos, composition[pos]])
            .filter(([, count]) => count && count > 0);
    
        positionOrder.forEach(([position, neededCount]) => {
            const players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .sort((a, b) => {
                    // Prioritize players who can only play this position
                    const aSpecialist = a.positions.length === 1 ? 1 : 0;
                    const bSpecialist = b.positions.length === 1 ? 1 : 0;
                    if (aSpecialist !== bSpecialist) return bSpecialist - aSpecialist;
                    
                    // Then sort by rating
                    return b.positionRating - a.positionRating;
                });
    
            let playerIdx = 0;
            
            // Fill each team sequentially with required number of players for this position
            for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                for (let slot = 0; slot < neededCount; slot++) {
                    if (playerIdx < players.length) {
                        teams[teamIdx].push(players[playerIdx]);
                        usedIds.add(players[playerIdx].id);
                        playerIdx++;
                    } else {
                        console.warn(`Warning: Not enough ${position} players for team ${teamIdx + 1}`);
                    }
                }
            }
        });
        return teams;
    }
    
    createSnakeDraftSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        
        // Smart position ordering: fill scarce positions first
        const positionPriority = ['MB', 'S', 'L', 'OPP', 'OH'];
        const positionOrder = positionPriority
            .map(pos => [pos, composition[pos]])
            .filter(([, count]) => count && count > 0);
    
        positionOrder.forEach(([position, neededCount]) => {
            const players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .sort((a, b) => {
                    // Prioritize players who can only play this position
                    const aSpecialist = a.positions.length === 1 ? 1 : 0;
                    const bSpecialist = b.positions.length === 1 ? 1 : 0;
                    if (aSpecialist !== bSpecialist) return bSpecialist - aSpecialist;
                    
                    // Then sort by rating
                    return b.positionRating - a.positionRating;
                });
            
            let playerIdx = 0;
            
            // TRUE SNAKE DRAFT: 1→2→3→3→2→1→1→2→3...
            // Round 1: Team 1, Team 2, Team 3
            // Round 2: Team 3, Team 2, Team 1 (reverse)
            // Round 3: Team 1, Team 2, Team 3
            // etc.
            
            let round = 0;
            while (playerIdx < players.length) {
                const isReverseRound = round % 2 === 1;
                
                for (let slotInRound = 0; slotInRound < teamCount; slotInRound++) {
                    // In reverse rounds, go from last team to first
                    const teamIdx = isReverseRound ? (teamCount - 1 - slotInRound) : slotInRound;
                    
                    // Check if this team still needs players for this position
                    const currentCount = teams[teamIdx].filter(p => p.assignedPosition === position).length;
                    if (currentCount < neededCount && playerIdx < players.length) {
                        teams[teamIdx].push(players[playerIdx]);
                        usedIds.add(players[playerIdx].id);
                        playerIdx++;
                    }
                }
                round++;
                
                // Safety check to prevent infinite loop
                if (round > 100) {
                    console.warn(`Warning: Snake draft exceeded 100 rounds for ${position}`);
                    break;
                }
            }
        });
        return teams;
    }

    createRandomSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        const totalPlayersPerTeam = Object.values(composition).reduce((a, b) => a + b, 0);
    
        // Smart position ordering: fill scarce positions first
        const positionPriority = ['MB', 'S', 'L', 'OPP', 'OH'];
        const positionOrder = positionPriority
            .map(pos => [pos, composition[pos]])
            .filter(([, count]) => count && count > 0);
    
        positionOrder.forEach(([position, neededCount]) => {
            if (neededCount === 0) return;
            
            const players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id));
            
            // Shuffle players randomly
            for (let i = players.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [players[i], players[j]] = [players[j], players[i]];
            }
    
            let playerIdx = 0;
            // Fill each team sequentially
            for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                for (let slot = 0; slot < neededCount; slot++) {
                    if (playerIdx < players.length) {
                        teams[teamIdx].push(players[playerIdx]);
                        usedIds.add(players[playerIdx].id);
                        playerIdx++;
                    } else {
                        console.warn(`Warning: Not enough ${position} players for team ${teamIdx + 1}`);
                    }
                }
            }
        });
    
        return teams;
    }

    enhancedCrossover(parent1, parent2, composition) {
        const child = Array.from({ length: parent1.length }, () => []);
        const usedIds = new Set();
        const slicePoint = Math.floor(Math.random() * parent1.length);
        
        for (let i = 0; i < slicePoint; i++) {
            child[i] = parent1[i].map(p => ({ ...p }));
            parent1[i].forEach(p => usedIds.add(p.id));
        }
        
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
                const smallestTeam = child.reduce((smallest, current) => current.length < smallest.length ? current : smallest, child[0]);
                smallestTeam.push({ ...player });
            }
        });
        return child;
    }
    
    
    /**
     * Sort players in a team by position order
     */
    sortTeamByPosition(team) {
        return team.sort((a, b) => {
            const posA = a.assignedPosition || a.positions?.[0];
            const posB = b.assignedPosition || b.positions?.[0];
            
            const indexA = this.positionOrder.indexOf(posA);
            const indexB = this.positionOrder.indexOf(posB);
            
            // If position not found, put at the end
            const orderA = indexA === -1 ? 999 : indexA;
            const orderB = indexB === -1 ? 999 : indexB;
            
            return orderA - orderB;
        });
    }
    
    getUnusedPlayers(teams, allPlayers) {
        const usedIds = new Set(teams.flat().map(p => p.id));
        return allPlayers.filter(p => !usedIds.has(p.id));
    }

    hashSolution(teams) {
        return teams.map(team => team.map(p => p.id).sort().join(',')).sort().join('|');
    }

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

    adaptParameters(teamCount, totalPlayers) {
    }
    
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

    getAlgorithmStatistics() {
        return this.algorithmStats;
    }
}

export default new TeamOptimizerService();
