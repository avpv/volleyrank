/**
 * TeamOptimizerService - Team balancing with advanced algorithms
 * Uses Genetic Algorithm, Simulated Annealing, and Tabu Search
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
        
        this.config = {
            maxIterations: 50000,
            initialTemperature: 1000,
            coolingRate: 0.995,
            populationSize: 20,
            generationCount: 100,
            mutationRate: 0.15,
            crossoverRate: 0.7,
            tabuTenure: 50,
            tabuIterations: 5000,
            localSearchIterations: 1000
        };
        
        this.tabuList = [];
    }

    /**
     * Main optimization entry point
     */
    async optimize(composition, teamCount, players) {
        // Validate
        const validation = this.validate(composition, teamCount, players);
        if (!validation.isValid) {
            throw new Error(validation.errors.map(e => e.message).join(', '));
        }

        // Adapt parameters
        this.adaptParameters(teamCount, players.length);

        // Group players by position
        const playersByPosition = this.groupByPosition(players);
        const positions = Object.keys(composition).filter(pos => composition[pos] > 0);
        
        // Generate initial solutions
        const candidates = [];
        candidates.push(this.createBalancedSolution(composition, teamCount, playersByPosition));
        candidates.push(this.createSnakeDraftSolution(composition, teamCount, playersByPosition));
        
        for (let i = 0; i < 3; i++) {
            candidates.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }

        // Run algorithms in parallel
        const [gaResult, tabuResult, saResult] = await Promise.all([
            this.runGeneticAlgorithm(candidates, composition, teamCount, playersByPosition, positions),
            this.runTabuSearch(candidates[0], positions),
            this.runSimulatedAnnealing(candidates[0], positions)
        ]);

        // Select best result
        const results = [gaResult, tabuResult, saResult];
        const scores = results.map(r => this.evaluateSolution(r));
        const bestIdx = scores.indexOf(Math.min(...scores));
        
        // Refine with local search
        const bestTeams = await this.localSearch(results[bestIdx], positions);

        // Sort by strength
        bestTeams.sort((a, b) => {
            const aStrength = eloService.calculateTeamStrength(a).totalRating;
            const bStrength = eloService.calculateTeamStrength(b).totalRating;
            return bStrength - aStrength;
        });

        const balance = eloService.evaluateBalance(bestTeams);
        const unused = this.getUnusedPlayers(bestTeams, players);

        const algorithmNames = [
            'Genetic Algorithm',
            'Tabu Search',
            'Simulated Annealing'
        ];

        return {
            teams: bestTeams,
            balance,
            unusedPlayers: unused,
            validation,
            algorithm: algorithmNames[bestIdx]
        };
    }

    /**
     * Validate team requirements
     */
    validate(composition, teamCount, players) {
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
                    message: `Not enough ${this.positions[position]}s: need ${needed}, have ${available}`
                });
            } else if (available === needed) {
                warnings.push({
                    position,
                    message: `Exact match for ${this.positions[position]}s`
                });
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            totalNeeded,
            totalAvailable: players.length,
            unused: players.length - totalNeeded
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
        
        if (complexity < 50) {
            this.config.maxIterations = 10000;
            this.config.generationCount = 50;
            this.config.tabuIterations = 2000;
        } else if (complexity < 200) {
            this.config.maxIterations = 30000;
            this.config.generationCount = 100;
            this.config.tabuIterations = 5000;
        } else {
            this.config.maxIterations = 50000;
            this.config.generationCount = 150;
            this.config.tabuIterations = 8000;
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

        return balance * 1.0 + Math.sqrt(variance) * 0.5 + positionImbalance * 0.3;
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
     * Genetic Algorithm
     */
    async runGeneticAlgorithm(initialPop, composition, teamCount, playersByPosition, positions) {
        let population = [...initialPop];
        
        while (population.length < this.config.populationSize) {
            population.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }

        for (let gen = 0; gen < this.config.generationCount; gen++) {
            const scored = population.map(individual => ({
                teams: individual,
                score: this.evaluateSolution(individual)
            })).sort((a, b) => a.score - b.score);

            const selected = scored.slice(0, Math.floor(this.config.populationSize / 2));
            const newPop = selected.map(s => s.teams);

            while (newPop.length < this.config.populationSize) {
                if (Math.random() < this.config.crossoverRate) {
                    const p1 = selected[Math.floor(Math.random() * selected.length)].teams;
                    const p2 = selected[Math.floor(Math.random() * selected.length)].teams;
                    const child = this.crossover(p1, p2, composition);
                    newPop.push(child);
                } else {
                    const parent = selected[Math.floor(Math.random() * selected.length)].teams;
                    newPop.push(JSON.parse(JSON.stringify(parent)));
                }
            }

            for (let i = Math.floor(this.config.populationSize / 2); i < newPop.length; i++) {
                if (Math.random() < this.config.mutationRate) {
                    this.mutate(newPop[i], positions);
                }
            }

            population = newPop;

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
     * Crossover operation
     */
    crossover(parent1, parent2, composition) {
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
                    for (let i = 0; i < child.length; i++) {
                        const posCount = child[i].filter(p => 
                            p.assignedPosition === player.assignedPosition
                        ).length;
                        const target = composition[player.assignedPosition] || 0;
                        
                        if (posCount < target) {
                            child[i].push({...player});
                            usedIds.add(player.id);
                            break;
                        }
                    }
                    
                    if (!usedIds.has(player.id)) {
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
     * Mutation operation
     */
    mutate(teams, positions) {
        const swapCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < swapCount; i++) {
            this.performSwap(teams, positions);
        }
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
        }
    }

    /**
     * Tabu Search
     */
    async runTabuSearch(initialTeams, positions) {
        let current = JSON.parse(JSON.stringify(initialTeams));
        let best = JSON.parse(JSON.stringify(initialTeams));
        let currentScore = this.evaluateSolution(current);
        let bestScore = currentScore;
        
        this.tabuList = [];
        
        for (let iter = 0; iter < this.config.tabuIterations; iter++) {
            const neighbors = this.generateNeighbors(current, positions, 20);
            
            let bestNeighbor = null;
            let bestNeighborScore = Infinity;
            
            for (const neighbor of neighbors) {
                const hash = this.hashSolution(neighbor);
                const score = this.evaluateSolution(neighbor);
                
                const isTabu = this.tabuList.includes(hash);
                
                if (!isTabu || score < bestScore) {
                    if (score < bestNeighborScore) {
                        bestNeighbor = neighbor;
                        bestNeighborScore = score;
                    }
                }
            }
            
            if (bestNeighbor) {
                current = bestNeighbor;
                currentScore = bestNeighborScore;
                
                const hash = this.hashSolution(current);
                this.tabuList.push(hash);
                if (this.tabuList.length > this.config.tabuTenure) {
                    this.tabuList.shift();
                }
                
                if (currentScore < bestScore) {
                    best = JSON.parse(JSON.stringify(current));
                    bestScore = currentScore;
                }
            }
            
            if (iter % 500 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        return best;
    }

    /**
     * Generate neighbors
     */
    generateNeighbors(teams, positions, count) {
        const neighbors = [];
        
        for (let i = 0; i < count; i++) {
            const neighbor = JSON.parse(JSON.stringify(teams));
            this.performSwap(neighbor, positions);
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
     * Simulated Annealing
     */
    async runSimulatedAnnealing(initialTeams, positions) {
        let current = JSON.parse(JSON.stringify(initialTeams));
        let best = JSON.parse(JSON.stringify(initialTeams));
        let currentScore = this.evaluateSolution(current);
        let bestScore = currentScore;
        
        let temp = this.config.initialTemperature;
        
        for (let iter = 0; iter < this.config.maxIterations; iter++) {
            const neighbor = JSON.parse(JSON.stringify(current));
            this.performSwap(neighbor, positions);
            
            const neighborScore = this.evaluateSolution(neighbor);
            const delta = neighborScore - currentScore;
            
            if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
                current = neighbor;
                currentScore = neighborScore;
                
                if (neighborScore < bestScore) {
                    best = JSON.parse(JSON.stringify(neighbor));
                    bestScore = neighborScore;
                }
            }
            
            temp *= this.config.coolingRate;
            
            if (iter % 5000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        return best;
    }

    /**
     * Local search refinement
     */
    async localSearch(teams, positions) {
        let current = JSON.parse(JSON.stringify(teams));
        let currentScore = this.evaluateSolution(current);
        let improved = true;
        let iter = 0;
        
        while (improved && iter < this.config.localSearchIterations) {
            improved = false;
            
            for (let t1 = 0; t1 < current.length - 1; t1++) {
                for (let t2 = t1 + 1; t2 < current.length; t2++) {
                    for (const pos of positions) {
                        const p1 = current[t1].filter(p => p.assignedPosition === pos);
                        const p2 = current[t2].filter(p => p.assignedPosition === pos);
                        
                        for (const player1 of p1) {
                            for (const player2 of p2) {
                                const test = JSON.parse(JSON.stringify(current));
                                const idx1 = test[t1].findIndex(p => p.id === player1.id);
                                const idx2 = test[t2].findIndex(p => p.id === player2.id);
                                
                                [test[t1][idx1], test[t2][idx2]] = 
                                [test[t2][idx2], test[t1][idx1]];
                                
                                const newScore = this.evaluateSolution(test);
                                
                                if (newScore < currentScore) {
                                    current = test;
                                    currentScore = newScore;
                                    improved = true;
                                }
                            }
                        }
                    }
                }
            }
            iter++;
            
            if (iter % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        return current;
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
