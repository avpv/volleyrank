/**
 * Team optimizer with advanced optimization algorithms
 */
class TeamOptimizer {
    constructor(eloCalculator) {
        this.eloCalculator = eloCalculator;
        this.positions = {
            'S': 'Setter',
            'OPP': 'Opposite', 
            'OH': 'Outside Hitter',
            'MB': 'Middle Blocker',
            'L': 'Libero'
        };
        
        this.config = {
            maxIterations: 50000,
            simulatedAnnealingEnabled: true,
            geneticAlgorithmEnabled: true,
            tabuSearchEnabled: true,
            initialTemperature: 1000,
            coolingRate: 0.995,
            // GA parameters
            populationSize: 20,
            generationCount: 100,
            mutationRate: 0.15,
            crossoverRate: 0.7,
            // Tabu parameters
            tabuTenure: 50,
            tabuIterations: 5000,
            // Adaptive swap parameters
            adaptiveSwapEnabled: true,
            // Local search parameters
            localSearchIterations: 1000
        };
        
        this.tabuList = [];
    }

    /**
     * Adapt algorithm parameters based on problem complexity
     */
    adaptParameters(teamCount, totalPlayers) {
        const complexity = teamCount * totalPlayers;
        
        if (complexity < 50) {
            this.config.maxIterations = 10000;
            this.config.generationCount = 50;
            this.config.tabuIterations = 2000;
            this.config.localSearchIterations = 500;
        } else if (complexity < 200) {
            this.config.maxIterations = 30000;
            this.config.generationCount = 100;
            this.config.tabuIterations = 5000;
            this.config.localSearchIterations = 1000;
        } else {
            this.config.maxIterations = 50000;
            this.config.generationCount = 150;
            this.config.tabuIterations = 8000;
            this.config.localSearchIterations = 1500;
        }
    }

    /**
     * Group players by position with their position-specific ratings
     */
    groupPlayersByPosition(players) {
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
     * Validate team requirements
     */
    validateTeamRequirements(composition, teamCount, availablePlayers) {
        const errors = [];
        const warnings = [];
        
        const playersByPosition = this.groupPlayersByPosition(availablePlayers);
        
        let totalPlayersNeeded = 0;
        
        Object.entries(composition).forEach(([position, count]) => {
            const needed = count * teamCount;
            const available = playersByPosition[position] ? playersByPosition[position].length : 0;
            
            totalPlayersNeeded += needed;
            
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

        const totalAvailablePlayers = availablePlayers.length;
        const unusedPlayers = totalAvailablePlayers - totalPlayersNeeded;

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            totalPlayersNeeded,
            totalAvailablePlayers,
            unusedPlayers,
            playersPerTeam: totalPlayersNeeded / teamCount
        };
    }

    /**
     * Main optimization method - uses all algorithms
     */
    async optimizeTeams(composition, teamCount, availablePlayers) {
        const validation = this.validateTeamRequirements(composition, teamCount, availablePlayers);
        if (!validation.isValid) {
            throw new Error(`Cannot create teams: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        // Adapt parameters based on problem size
        this.adaptParameters(teamCount, availablePlayers.length);

        const playersByPosition = this.groupPlayersByPosition(availablePlayers);
        const positions = Object.keys(composition).filter(pos => composition[pos] > 0);
        
        // Generate initial solutions
        const candidates = [];
        
        candidates.push(this.createBalancedRatingSolution(composition, teamCount, playersByPosition));
        candidates.push(this.createSnakeDraftSolution(composition, teamCount, playersByPosition));
        
        for (let i = 0; i < 3; i++) {
            candidates.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }

        // Run GA and Tabu Search in parallel on best candidates
        const [gaResult, tabuResult] = await Promise.all([
            this.optimizeWithGeneticAlgorithm(
                candidates,
                composition,
                teamCount,
                playersByPosition,
                positions
            ),
            this.optimizeWithTabuSearch(candidates[0], positions)
        ]);

        // Compare results and select the best
        const results = [gaResult, tabuResult];
        const scores = results.map(r => this.evaluateTeamSolution(r));
        const bestIdx = scores.indexOf(Math.min(...scores));
        
        // Apply local search refinement to best solution
        const bestTeams = await this.localSearchRefinement(results[bestIdx], positions);

        // Sort teams by strength
        bestTeams.sort((a, b) => {
            const strengthA = this.calculateTeamStrength(a);
            const strengthB = this.calculateTeamStrength(b);
            return strengthB - strengthA;
        });

        const balance = this.evaluateTeamBalance(bestTeams);
        const unusedPlayers = this.getUnusedPlayers(bestTeams, availablePlayers);

        return {
            teams: bestTeams,
            balance,
            unusedPlayers,
            validation,
            algorithm: bestIdx === 0 ? 'Genetic Algorithm + Local Search' : 'Tabu Search + Local Search'
        };
    }

    /**
     * Local search refinement - tries all beneficial swaps
     */
    async localSearchRefinement(teams, positions) {
        let currentTeams = JSON.parse(JSON.stringify(teams));
        let currentScore = this.evaluateTeamSolution(currentTeams);
        let improved = true;
        let iter = 0;
        
        while (improved && iter < this.config.localSearchIterations) {
            improved = false;
            
            // Try all possible swaps between all team pairs
            for (let t1 = 0; t1 < currentTeams.length - 1; t1++) {
                for (let t2 = t1 + 1; t2 < currentTeams.length; t2++) {
                    for (const pos of positions) {
                        const p1 = currentTeams[t1].filter(p => p.assignedPosition === pos);
                        const p2 = currentTeams[t2].filter(p => p.assignedPosition === pos);
                        
                        for (const player1 of p1) {
                            for (const player2 of p2) {
                                // Try swap
                                const testTeams = JSON.parse(JSON.stringify(currentTeams));
                                const idx1 = testTeams[t1].findIndex(p => p.id === player1.id);
                                const idx2 = testTeams[t2].findIndex(p => p.id === player2.id);
                                
                                [testTeams[t1][idx1], testTeams[t2][idx2]] = 
                                [testTeams[t2][idx2], testTeams[t1][idx1]];
                                
                                const newScore = this.evaluateTeamSolution(testTeams);
                                
                                if (newScore < currentScore) {
                                    currentTeams = testTeams;
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
        
        return currentTeams;
    }

    /**
     * GENETIC ALGORITHM
     */
    async optimizeWithGeneticAlgorithm(initialPopulation, composition, teamCount, playersByPosition, positions) {
        // Create initial population
        let population = [...initialPopulation];
        
        // Add more solutions to reach populationSize
        while (population.length < this.config.populationSize) {
            population.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }

        for (let generation = 0; generation < this.config.generationCount; generation++) {
            // Evaluate entire population
            const scored = population.map(individual => ({
                teams: individual,
                score: this.evaluateTeamSolution(individual)
            })).sort((a, b) => a.score - b.score);

            // Selection: take top 50%
            const selected = scored.slice(0, Math.floor(this.config.populationSize / 2));

            // New generation
            const newPopulation = selected.map(s => s.teams);

            // Crossover (breeding)
            while (newPopulation.length < this.config.populationSize) {
                if (Math.random() < this.config.crossoverRate) {
                    const parent1 = selected[Math.floor(Math.random() * selected.length)].teams;
                    const parent2 = selected[Math.floor(Math.random() * selected.length)].teams;
                    const child = this.crossover(parent1, parent2, composition, teamCount, playersByPosition);
                    newPopulation.push(child);
                } else {
                    const parent = selected[Math.floor(Math.random() * selected.length)].teams;
                    newPopulation.push(JSON.parse(JSON.stringify(parent)));
                }
            }

            // Mutation
            for (let i = Math.floor(this.config.populationSize / 2); i < newPopulation.length; i++) {
                if (Math.random() < this.config.mutationRate) {
                    this.mutate(newPopulation[i], positions);
                }
            }

            population = newPopulation;

            // Progress update every 10 generations
            if (generation % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        // Return best solution
        const finalScored = population.map(individual => ({
            teams: individual,
            score: this.evaluateTeamSolution(individual)
        })).sort((a, b) => a.score - b.score);

        return finalScored[0].teams;
    }

    /**
     * Get team composition needs
     */
    getTeamNeeds(team, totalPlayersNeeded) {
        const currentPositions = {};
        team.forEach(p => {
            currentPositions[p.assignedPosition] = (currentPositions[p.assignedPosition] || 0) + 1;
        });
        
        const needed = [];
        Object.keys(this.positions).forEach(pos => {
            const current = currentPositions[pos] || 0;
            const target = Math.floor(totalPlayersNeeded / Object.keys(this.positions).length);
            if (current < target) {
                needed.push(pos);
            }
        });
        
        return needed;
    }

    /**
     * Improved crossover - team-based crossover with validation
     */
    crossover(parent1, parent2, composition, teamCount, playersByPosition) {
        const child = Array.from({ length: parent1.length }, () => []);
        const usedPlayers = new Set();
        
        // Copy first half from parent1
        const splitPoint = Math.floor(parent1.length / 2);
        for (let i = 0; i < splitPoint; i++) {
            parent1[i].forEach(player => {
                child[i].push({...player});
                usedPlayers.add(player.id);
            });
        }
        
        // Fill remaining teams with players from parent2
        for (let i = splitPoint; i < parent2.length; i++) {
            parent2[i].forEach(player => {
                if (!usedPlayers.has(player.id)) {
                    child[i].push({...player});
                    usedPlayers.add(player.id);
                }
            });
        }
        
        // Add missing players from parent2
        parent2.forEach(team => {
            team.forEach(player => {
                if (!usedPlayers.has(player.id)) {
                    // Find suitable team based on position needs
                    let placed = false;
                    for (let i = 0; i < child.length; i++) {
                        const positionCount = child[i].filter(p => 
                            p.assignedPosition === player.assignedPosition
                        ).length;
                        const targetCount = composition[player.assignedPosition] || 0;
                        
                        if (positionCount < targetCount) {
                            child[i].push({...player});
                            usedPlayers.add(player.id);
                            placed = true;
                            break;
                        }
                    }
                    
                    // If still not placed, add to team with fewest players
                    if (!placed) {
                        const teamSizes = child.map(t => t.length);
                        const minSize = Math.min(...teamSizes);
                        const targetTeam = teamSizes.indexOf(minSize);
                        child[targetTeam].push({...player});
                        usedPlayers.add(player.id);
                    }
                }
            });
        });
        
        return child;
    }

    /**
     * Mutation (random swap)
     */
    mutate(teams, positions) {
        const swapCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < swapCount; i++) {
            this.performSingleSwap(teams, positions);
        }
    }

    /**
     * TABU SEARCH
     */
    async optimizeWithTabuSearch(initialTeams, positions) {
        let currentTeams = JSON.parse(JSON.stringify(initialTeams));
        let bestTeams = JSON.parse(JSON.stringify(initialTeams));
        let currentScore = this.evaluateTeamSolution(currentTeams);
        let bestScore = currentScore;
        
        this.tabuList = [];
        
        for (let iteration = 0; iteration < this.config.tabuIterations; iteration++) {
            // Generate neighbors (candidates)
            const neighbors = this.generateNeighbors(currentTeams, positions, 20);
            
            // Select best non-tabu neighbor
            let bestNeighbor = null;
            let bestNeighborScore = Infinity;
            
            for (const neighbor of neighbors) {
                const neighborHash = this.hashSolution(neighbor);
                const score = this.evaluateTeamSolution(neighbor);
                
                // Aspiration criterion: accept tabu solution if it's better than best
                const isTabu = this.tabuList.includes(neighborHash);
                
                if (!isTabu || score < bestScore) {
                    if (score < bestNeighborScore) {
                        bestNeighbor = neighbor;
                        bestNeighborScore = score;
                    }
                }
            }
            
            if (bestNeighbor) {
                currentTeams = bestNeighbor;
                currentScore = bestNeighborScore;
                
                // Add to tabu list
                const hash = this.hashSolution(currentTeams);
                this.tabuList.push(hash);
                if (this.tabuList.length > this.config.tabuTenure) {
                    this.tabuList.shift();
                }
                
                // Update best solution
                if (currentScore < bestScore) {
                    bestTeams = JSON.parse(JSON.stringify(currentTeams));
                    bestScore = currentScore;
                }
            }
            
            if (iteration % 500 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        return bestTeams;
    }

    /**
     * Generate neighbors for Tabu Search
     */
    generateNeighbors(teams, positions, count) {
        const neighbors = [];
        
        for (let i = 0; i < count; i++) {
            const neighbor = JSON.parse(JSON.stringify(teams));
            
            // Use adaptive swap strategy
            if (this.config.adaptiveSwapEnabled) {
                this.performAdaptiveSwap(neighbor, positions);
            } else {
                this.performSingleSwap(neighbor, positions);
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
     * ADAPTIVE SWAP STRATEGY
     * Intelligent player swap selection
     */
    performAdaptiveSwap(teams, positions) {
        // Find strongest and weakest teams
        const teamStrengths = teams.map((team, idx) => ({
            idx,
            strength: this.calculateTeamStrength(team)
        }));
        
        teamStrengths.sort((a, b) => b.strength - a.strength);
        
        const strongestIdx = teamStrengths[0].idx;
        const weakestIdx = teamStrengths[teamStrengths.length - 1].idx;
        
        // 70% probability: swap between strongest and weakest
        if (Math.random() < 0.7 && strongestIdx !== weakestIdx) {
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
                    return;
                }
            }
        }
        
        // Otherwise random swap
        this.performSingleSwap(teams, positions);
    }

    /**
     * Create balanced rating solution
     */
    createBalancedRatingSolution(composition, teamCount, playersByPosition) {
        let teams = Array.from({ length: teamCount }, () => []);
        const usedPlayerIds = new Set();
        
        // Process positions in order of scarcity (fewer players first)
        const positionOrder = Object.entries(composition)
            .filter(([pos, count]) => count > 0)
            .sort((a, b) => {
                const aAvailable = (playersByPosition[a[0]] || []).length;
                const bAvailable = (playersByPosition[b[0]] || []).length;
                const aRatio = aAvailable / (a[1] * teamCount);
                const bRatio = bAvailable / (b[1] * teamCount);
                return aRatio - bRatio; // Process scarce positions first
            });
        
        for (const [position, neededCount] of positionOrder) {
            const totalNeeded = neededCount * teamCount;
            
            // Filter out already used players
            const positionPlayers = (playersByPosition[position] || [])
                .filter(p => !usedPlayerIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating);
            
            // Take only what we need
            const playersToAssign = positionPlayers.slice(0, totalNeeded);
            
            // Distribute evenly - each team gets exactly neededCount players
            for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                for (let i = 0; i < neededCount; i++) {
                    const playerIdx = teamIdx * neededCount + i;
                    if (playerIdx < playersToAssign.length) {
                        const player = playersToAssign[playerIdx];
                        teams[teamIdx].push(player);
                        usedPlayerIds.add(player.id);
                    }
                }
            }
        }
        
        return teams;
    }

    /**
     * Create snake draft solution
     */
    createSnakeDraftSolution(composition, teamCount, playersByPosition) {
        let teams = Array.from({ length: teamCount }, () => []);
        const usedPlayerIds = new Set();

        // Process positions in order of scarcity
        const positionOrder = Object.entries(composition)
            .filter(([pos, count]) => count > 0)
            .sort((a, b) => {
                const aAvailable = (playersByPosition[a[0]] || []).length;
                const bAvailable = (playersByPosition[b[0]] || []).length;
                const aRatio = aAvailable / (a[1] * teamCount);
                const bRatio = bAvailable / (b[1] * teamCount);
                return aRatio - bRatio;
            });

        for (const [position, neededCount] of positionOrder) {
            const totalNeeded = neededCount * teamCount;
            
            // Filter out already used players
            let positionPlayers = (playersByPosition[position] || [])
                .filter(p => !usedPlayerIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating)
                .slice(0, totalNeeded);

            // Snake draft distribution - ensures each team gets exactly neededCount players
            let playerIndex = 0;
            for (let round = 0; round < neededCount; round++) {
                const isEvenRound = round % 2 === 0;
                
                for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                    if (playerIndex < positionPlayers.length) {
                        const actualTeamIdx = isEvenRound ? teamIdx : (teamCount - 1 - teamIdx);
                        teams[actualTeamIdx].push(positionPlayers[playerIndex]);
                        usedPlayerIds.add(positionPlayers[playerIndex].id);
                        playerIndex++;
                    }
                }
            }
        }

        return teams;
    }

    /**
     * Create random solution
     */
    createRandomSolution(composition, teamCount, playersByPosition) {
        let teams = Array.from({ length: teamCount }, () => []);
        const usedPlayerIds = new Set();

        // Process positions in order of scarcity
        const positionOrder = Object.entries(composition)
            .filter(([pos, count]) => count > 0)
            .sort((a, b) => {
                const aAvailable = (playersByPosition[a[0]] || []).length;
                const bAvailable = (playersByPosition[b[0]] || []).length;
                const aRatio = aAvailable / (a[1] * teamCount);
                const bRatio = bAvailable / (b[1] * teamCount);
                return aRatio - bRatio;
            });

        for (const [position, neededCount] of positionOrder) {
            const totalNeeded = neededCount * teamCount;
            
            // Filter out already used players
            let positionPlayers = (playersByPosition[position] || [])
                .filter(p => !usedPlayerIds.has(p.id))
                .slice(0, totalNeeded);
            
            // Shuffle players
            for (let i = positionPlayers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positionPlayers[i], positionPlayers[j]] = [positionPlayers[j], positionPlayers[i]];
            }

            // Distribute evenly - each team gets exactly neededCount players
            for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                for (let i = 0; i < neededCount; i++) {
                    const playerIdx = teamIdx * neededCount + i;
                    if (playerIdx < positionPlayers.length) {
                        teams[teamIdx].push(positionPlayers[playerIdx]);
                        usedPlayerIds.add(positionPlayers[playerIdx].id);
                    }
                }
            }
        }

        return teams;
    }

    /**
     * Calculate team strength
     */
    calculateTeamStrength(team) {
        if (!team || team.length === 0) {
            return 0;
        }

        const totalRating = team.reduce((sum, player) => {
            return sum + (player.positionRating || player.rating || 1500);
        }, 0);

        return totalRating;
    }

    /**
     * Evaluate team solution with improved scoring
     * Lower score = better balance
     */
    evaluateTeamSolution(teams) {
        if (!teams || teams.length === 0) return Infinity;

        const teamStrengths = teams.map(team => this.calculateTeamStrength(team));

        // Overall team balance
        const balance = Math.max(...teamStrengths) - Math.min(...teamStrengths);
        
        // Variance in team strength
        const avgStrength = teamStrengths.reduce((a, b) => a + b, 0) / teamStrengths.length;
        const variance = teamStrengths.reduce((sum, strength) => 
            sum + Math.pow(strength - avgStrength, 2), 0) / teamStrengths.length;

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

        // Combined score (weighted components)
        return balance * 1.0 + Math.sqrt(variance) * 0.5 + positionImbalance * 0.3;
    }

    /**
     * Evaluate team balance
     */
    evaluateTeamBalance(teams) {
        if (!teams || teams.length < 2) {
            return {
                isBalanced: true,
                maxDifference: 0,
                teams: []
            };
        }

        const teamStats = teams.map((team, index) => {
            const totalRating = this.calculateTeamStrength(team);
            const averageRating = team.length > 0 ? Math.round(totalRating / team.length) : 0;
            
            return {
                index,
                totalRating: Math.round(totalRating),
                averageRating,
                playerCount: team.length
            };
        });

        const ratings = teamStats.map(stats => stats.totalRating);
        
        const maxRating = Math.max(...ratings);
        const minRating = Math.min(...ratings);
        const maxDifference = maxRating - minRating;
        
        const isBalanced = maxDifference < 300;

        return {
            isBalanced,
            maxDifference: Math.round(maxDifference),
            averageDifference: Math.round(maxDifference / 2),
            teams: teamStats.map(stats => ({
                ...stats,
                strengthRank: ratings.filter(r => r > stats.totalRating).length + 1
            }))
        };
    }

    /**
     * Simulated annealing optimization
     */
    async optimizeWithSimulatedAnnealing(teams, positions) {
        if (teams.length < 2 || positions.length === 0) {
            return teams;
        }

        let currentTeams = JSON.parse(JSON.stringify(teams));
        let bestTeams = JSON.parse(JSON.stringify(teams));
        let currentScore = this.evaluateTeamSolution(currentTeams);
        let bestScore = currentScore;
        
        let temperature = this.config.initialTemperature;
        const coolingRate = this.config.coolingRate;
        
        for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
            const newTeams = this.generateNeighborSolution(currentTeams, positions);
            const newScore = this.evaluateTeamSolution(newTeams);
            
            const delta = newScore - currentScore;
            
            if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
                currentTeams = newTeams;
                currentScore = newScore;
                
                if (newScore < bestScore) {
                    bestTeams = JSON.parse(JSON.stringify(newTeams));
                    bestScore = newScore;
                }
            }
            
            temperature *= coolingRate;
            
            if (iteration % 5000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        return bestTeams;
    }

    /**
     * Generate neighbor solution
     */
    generateNeighborSolution(teams, positions) {
        const newTeams = JSON.parse(JSON.stringify(teams));
        
        if (this.config.adaptiveSwapEnabled) {
            this.performAdaptiveSwap(newTeams, positions);
        } else {
            this.performSingleSwap(newTeams, positions);
        }
        
        return newTeams;
    }

    /**
     * Perform single swap
     */
    performSingleSwap(teams, positions) {
        const team1Index = Math.floor(Math.random() * teams.length);
        let team2Index;
        do {
            team2Index = Math.floor(Math.random() * teams.length);
        } while (team1Index === team2Index);

        const position = positions[Math.floor(Math.random() * positions.length)];
        
        const team1Players = teams[team1Index].filter(p => 
            p.assignedPosition === position
        );
        const team2Players = teams[team2Index].filter(p => 
            p.assignedPosition === position
        );
        
        if (team1Players.length > 0 && team2Players.length > 0) {
            const player1 = team1Players[Math.floor(Math.random() * team1Players.length)];
            const player2 = team2Players[Math.floor(Math.random() * team2Players.length)];
            
            const player1Index = teams[team1Index].findIndex(p => p.id === player1.id);
            const player2Index = teams[team2Index].findIndex(p => p.id === player2.id);
            
            teams[team1Index][player1Index] = player2;
            teams[team2Index][player2Index] = player1;
        }
    }

    /**
     * Get unused players
     */
    getUnusedPlayers(teams, allPlayers) {
        const usedPlayerIds = new Set();
        teams.forEach(team => {
            team.forEach(player => {
                usedPlayerIds.add(player.id);
            });
        });

        return allPlayers.filter(player => !usedPlayerIds.has(player.id));
    }
}

window.TeamOptimizer = TeamOptimizer;
