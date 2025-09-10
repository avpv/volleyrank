/**
 * Enhanced team optimizer with multiple positions support
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
        
        // Algorithm configuration
        this.config = {
            maxIterations: 50000,
            simulatedAnnealingEnabled: true,
            initialTemperature: 1000,
            coolingRate: 0.995,
            geneticAlgorithmEnabled: true,
            populationSize: 20,
            mutationRate: 0.1,
            crossoverRate: 0.8
        };
    }

    /**
     * Updated group players by position for multiple positions support
     */
    groupPlayersByPosition(players) {
        const grouped = {};
        Object.keys(this.positions).forEach(pos => {
            grouped[pos] = [];
        });

        players.forEach(player => {
            // Handle new multiple positions format
            if (player.positions && Array.isArray(player.positions)) {
                player.positions.forEach(position => {
                    if (grouped[position]) {
                        grouped[position].push({
                            ...player,
                            currentPosition: position, // Track which position we're using
                            isPrimaryPosition: player.primaryPosition === position
                        });
                    }
                });
            } 
            // Handle old single position format for backward compatibility
            else if (player.position && grouped[player.position]) {
                grouped[player.position].push({
                    ...player,
                    currentPosition: player.position,
                    isPrimaryPosition: true
                });
            }
            // Handle primary position fallback
            else if (player.primaryPosition && grouped[player.primaryPosition]) {
                grouped[player.primaryPosition].push({
                    ...player,
                    currentPosition: player.primaryPosition,
                    isPrimaryPosition: true
                });
            }
        });

        return grouped;
    }

    /**
     * Updated team requirements validation with multiple positions
     */
    validateTeamRequirements(composition, teamCount, availablePlayers) {
        const errors = [];
        const warnings = [];
        
        const playersByPosition = this.groupPlayersByPosition(availablePlayers);
        
        let totalPlayersNeeded = 0;
        
        Object.entries(composition).forEach(([position, count]) => {
            const needed = count * teamCount;
            const available = playersByPosition[position] ? playersByPosition[position].length : 0;
            const primaryAvailable = playersByPosition[position] ? 
                playersByPosition[position].filter(p => p.isPrimaryPosition).length : 0;
            
            totalPlayersNeeded += needed;
            
            if (available < needed) {
                errors.push({
                    position,
                    needed,
                    available,
                    primaryAvailable,
                    shortage: needed - available,
                    message: `Not enough ${this.positions[position]}s: need ${needed}, have ${available} (${primaryAvailable} with primary position)`
                });
            } else if (primaryAvailable < needed && available >= needed) {
                warnings.push({
                    position,
                    message: `${this.positions[position]} will use players with secondary position (${primaryAvailable} primary out of ${needed} needed)`
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
     * Enhanced team optimization with multiple algorithms and position preferences
     */
    async optimizeTeams(composition, teamCount, availablePlayers) {
        const validation = this.validateTeamRequirements(composition, teamCount, availablePlayers);
        if (!validation.isValid) {
            throw new Error(`Cannot create teams: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        const playersByPosition = this.groupPlayersByPosition(availablePlayers);
        
        // Generate multiple initial solutions
        const candidates = [];
        
        // 1. Primary position priority solution
        candidates.push(this.createPrimaryPositionSolution(composition, teamCount, playersByPosition));
        
        // 2. Snake draft solution
        candidates.push(this.createSnakeDraftSolution(composition, teamCount, playersByPosition));
        
        // 3. Balanced rating distribution
        candidates.push(this.createBalancedRatingSolution(composition, teamCount, playersByPosition));
        
        // 4. Flexible solution (utilizes multi-position players)
        candidates.push(this.createFlexibleSolution(composition, teamCount, playersByPosition));
        
        // 5. Random solutions for diversity
        for (let i = 0; i < 2; i++) {
            candidates.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }

        // Optimize each candidate
        const optimizedCandidates = [];
        for (let i = 0; i < candidates.length; i++) {
            let optimized;
            
            if (this.config.geneticAlgorithmEnabled && i === 0) {
                // Use genetic algorithm on best initial solution
                optimized = await this.optimizeWithGeneticAlgorithm(candidates, composition);
            } else if (this.config.simulatedAnnealingEnabled) {
                // Use simulated annealing
                optimized = await this.optimizeWithSimulatedAnnealing(
                    candidates[i], 
                    Object.keys(composition)
                );
            } else {
                // Fallback to improved random swaps
                optimized = await this.optimizeWithSmartSwaps(
                    candidates[i], 
                    Object.keys(composition)
                );
            }
            
            optimizedCandidates.push(optimized);
        }

        // Select best solution
        let bestTeams = optimizedCandidates[0];
        let bestScore = this.evaluateTeamSolution(bestTeams);

        for (let i = 1; i < optimizedCandidates.length; i++) {
            const score = this.evaluateTeamSolution(optimizedCandidates[i]);
            if (score < bestScore) {
                bestScore = score;
                bestTeams = optimizedCandidates[i];
            }
        }

        // Sort teams by strength
        bestTeams.sort((a, b) => {
            const strengthA = this.eloCalculator.calculateTeamStrength(a).totalRating;
            const strengthB = this.eloCalculator.calculateTeamStrength(b).totalRating;
            return strengthB - strengthA;
        });

        const balance = this.eloCalculator.evaluateTeamBalance(bestTeams);
        const unusedPlayers = this.getUnusedPlayersWithPositionInfo(bestTeams, availablePlayers);
        const positionAnalysis = this.analyzeTeamPositions(bestTeams);

        return {
            teams: bestTeams,
            balance,
            unusedPlayers,
            validation,
            positionAnalysis,
            algorithm: 'Enhanced Multi-Algorithm Optimization with Multiple Positions',
            stats: {
                totalTeams: bestTeams.length,
                playersUsed: bestTeams.reduce((sum, team) => sum + team.length, 0),
                averageTeamRating: Math.round(
                    bestTeams.reduce((sum, team) => 
                        sum + this.eloCalculator.calculateTeamStrength(team).averageRating, 0
                    ) / bestTeams.length
                ),
                balanceScore: Math.round(bestScore),
                primaryPositionPlayers: bestTeams.flat().filter(p => p.isPrimaryPosition !== false).length,
                flexiblePlayers: bestTeams.flat().filter(p => p.isPrimaryPosition === false).length
            }
        };
    }

    /**
     * Create solution prioritizing primary positions
     */
    createPrimaryPositionSolution(composition, teamCount, playersByPosition) {
        let teams = Array.from({ length: teamCount }, () => []);
        const usedPlayerIds = new Set();

        // First pass: assign players to their primary positions
        for (const [position, neededCount] of Object.entries(composition)) {
            if (neededCount === 0) continue;

            const primaryPlayers = (playersByPosition[position] || [])
                .filter(p => p.isPrimaryPosition && !usedPlayerIds.has(p.id))
                .sort((a, b) => b.rating - a.rating);

            const playersToAssign = Math.min(primaryPlayers.length, neededCount * teamCount);
            
            // Distribute using snake draft
            for (let i = 0; i < playersToAssign; i++) {
                const roundNumber = Math.floor(i / teamCount);
                const isEvenRound = roundNumber % 2 === 0;
                
                let teamIndex = isEvenRound ? i % teamCount : teamCount - 1 - (i % teamCount);
                
                teams[teamIndex].push(primaryPlayers[i]);
                usedPlayerIds.add(primaryPlayers[i].id);
            }
        }

        // Second pass: fill remaining slots with flexible players
        for (const [position, neededCount] of Object.entries(composition)) {
            if (neededCount === 0) continue;

            const currentAssigned = teams.reduce((sum, team) => 
                sum + team.filter(p => p.currentPosition === position).length, 0);
            
            const stillNeeded = (neededCount * teamCount) - currentAssigned;
            
            if (stillNeeded > 0) {
                const flexiblePlayers = (playersByPosition[position] || [])
                    .filter(p => !p.isPrimaryPosition && !usedPlayerIds.has(p.id))
                    .sort((a, b) => b.rating - a.rating);

                for (let i = 0; i < Math.min(stillNeeded, flexiblePlayers.length); i++) {
                    // Assign to team with lowest current rating
                    const teamRatings = teams.map(team => 
                        team.reduce((sum, p) => sum + p.rating, 0));
                    const minRatingIndex = teamRatings.indexOf(Math.min(...teamRatings));
                    
                    teams[minRatingIndex].push(flexiblePlayers[i]);
                    usedPlayerIds.add(flexiblePlayers[i].id);
                }
            }
        }

        return teams;
    }

    /**
     * Updated snake draft solution with position priority
     */
    createSnakeDraftSolution(composition, teamCount, playersByPosition) {
        let teams = Array.from({ length: teamCount }, () => []);
        const usedPlayerIds = new Set();

        for (const [position, neededCount] of Object.entries(composition)) {
            if (neededCount === 0) continue;

            let positionPlayers = (playersByPosition[position] || [])
                .filter(p => !usedPlayerIds.has(p.id))
                // Sort by: primary position first, then by rating
                .sort((a, b) => {
                    if (a.isPrimaryPosition && !b.isPrimaryPosition) return -1;
                    if (!a.isPrimaryPosition && b.isPrimaryPosition) return 1;
                    return b.rating - a.rating;
                })
                .slice(0, neededCount * teamCount);

            for (let i = 0; i < positionPlayers.length; i++) {
                const roundNumber = Math.floor(i / teamCount);
                const isEvenRound = roundNumber % 2 === 0;
                
                let teamIndex;
                if (isEvenRound) {
                    teamIndex = i % teamCount;
                } else {
                    teamIndex = teamCount - 1 - (i % teamCount);
                }
                
                teams[teamIndex].push(positionPlayers[i]);
                usedPlayerIds.add(positionPlayers[i].id);
            }
        }

        return teams;
    }

    /**
     * Updated balanced rating solution
     */
    createBalancedRatingSolution(composition, teamCount, playersByPosition) {
        let teams = Array.from({ length: teamCount }, () => []);
        const usedPlayerIds = new Set();
        
        // Calculate target rating per team
        let totalRating = 0;
        let totalPlayers = 0;
        
        Object.entries(composition).forEach(([position, count]) => {
            const players = (playersByPosition[position] || [])
                .filter(p => !usedPlayerIds.has(p.id))
                .slice(0, count * teamCount);
            totalRating += players.reduce((sum, p) => sum + p.rating, 0);
            totalPlayers += players.length;
        });
        
        // Distribute players to balance ratings
        for (const [position, neededCount] of Object.entries(composition)) {
            if (neededCount === 0) continue;
            
            const positionPlayers = (playersByPosition[position] || [])
                .filter(p => !usedPlayerIds.has(p.id))
                .sort((a, b) => {
                    // Prefer primary position players
                    if (a.isPrimaryPosition && !b.isPrimaryPosition) return -1;
                    if (!a.isPrimaryPosition && b.isPrimaryPosition) return 1;
                    return b.rating - a.rating;
                })
                .slice(0, neededCount * teamCount);
            
            // Assign players to teams with lowest current rating
            positionPlayers.forEach(player => {
                const teamRatings = teams.map(team => 
                    team.reduce((sum, p) => sum + p.rating, 0)
                );
                const minRatingIndex = teamRatings.indexOf(Math.min(...teamRatings));
                teams[minRatingIndex].push(player);
                usedPlayerIds.add(player.id);
            });
        }
        
        return teams;
    }

    /**
     * Create flexible solution prioritizing multi-position players
     */
    createFlexibleSolution(composition, teamCount, playersByPosition) {
        let teams = Array.from({ length: teamCount }, () => []);
        const usedPlayerIds = new Set();

        // Identify multi-position players
        const allPlayers = [];
        Object.values(playersByPosition).forEach(positionGroup => {
            positionGroup.forEach(player => {
                if (!usedPlayerIds.has(player.id)) {
                    const flexibilityScore = player.positions && player.positions.length > 1 ? 
                        player.positions.length * player.rating : player.rating * 0.8;
                    
                    allPlayers.push({
                        ...player,
                        flexibilityScore
                    });
                    usedPlayerIds.add(player.id);
                }
            });
        });

        // Sort by flexibility and rating
        allPlayers.sort((a, b) => b.flexibilityScore - a.flexibilityScore);

        // Distribute players
        allPlayers.forEach((player, index) => {
            const teamIndex = index % teamCount;
            teams[teamIndex].push(player);
        });

        return teams;
    }

    /**
     * Updated random solution
     */
    createRandomSolution(composition, teamCount, playersByPosition) {
        let teams = Array.from({ length: teamCount }, () => []);
        const usedPlayerIds = new Set();

        for (const [position, neededCount] of Object.entries(composition)) {
            if (neededCount === 0) continue;

            let positionPlayers = (playersByPosition[position] || [])
                .filter(p => !usedPlayerIds.has(p.id))
                .slice(0, neededCount * teamCount);
            
            // Shuffle players
            for (let i = positionPlayers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positionPlayers[i], positionPlayers[j]] = [positionPlayers[j], positionPlayers[i]];
            }

            // Distribute randomly
            positionPlayers.forEach((player, index) => {
                teams[index % teamCount].push(player);
                usedPlayerIds.add(player.id);
            });
        }

        return teams;
    }

    /**
     * Enhanced team solution evaluation with position penalties
     */
    evaluateTeamSolution(teams) {
        if (!teams || teams.length === 0) return Infinity;

        const teamStrengths = teams.map(team => 
            this.eloCalculator.calculateTeamStrength(team).totalRating
        );

        // Primary metric: balance (difference between strongest and weakest)
        const balance = Math.max(...teamStrengths) - Math.min(...teamStrengths);
        
        // Secondary metric: variance (penalizes uneven distribution)
        const avgStrength = teamStrengths.reduce((a, b) => a + b, 0) / teamStrengths.length;
        const variance = teamStrengths.reduce((sum, strength) => 
            sum + Math.pow(strength - avgStrength, 2), 0) / teamStrengths.length;

        // Position penalty: prefer players in their primary positions
        let positionPenalty = 0;
        teams.forEach(team => {
            team.forEach(player => {
                if (player.isPrimaryPosition === false) {
                    positionPenalty += 50; // Penalty for using player in secondary position
                }
            });
        });

        // Combined score (balance weighted most heavily)
        return balance + Math.sqrt(variance) * 0.5 + positionPenalty;
    }

    /**
     * Updated single swap for multiple positions
     */
    performSingleSwap(teams, positions) {
        const team1Index = Math.floor(Math.random() * teams.length);
        let team2Index;
        do {
            team2Index = Math.floor(Math.random() * teams.length);
        } while (team1Index === team2Index);

        const position = positions[Math.floor(Math.random() * positions.length)];
        
        // Find players who can play the selected position
        const team1Players = teams[team1Index].filter(p => 
            p.currentPosition === position || 
            (p.positions && p.positions.includes(position))
        );
        const team2Players = teams[team2Index].filter(p => 
            p.currentPosition === position || 
            (p.positions && p.positions.includes(position))
        );
        
        if (team1Players.length > 0 && team2Players.length > 0) {
            const player1 = team1Players[Math.floor(Math.random() * team1Players.length)];
            const player2 = team2Players[Math.floor(Math.random() * team2Players.length)];
            
            const player1Index = teams[team1Index].findIndex(p => p.id === player1.id);
            const player2Index = teams[team2Index].findIndex(p => p.id === player2.id);
            
            // Update currentPosition for swapped players
            const updatedPlayer1 = { ...player2, currentPosition: position };
            const updatedPlayer2 = { ...player1, currentPosition: position };
            
            teams[team1Index][player1Index] = updatedPlayer1;
            teams[team2Index][player2Index] = updatedPlayer2;
        }
    }

    /**
     * Analyze team positions composition
     */
    analyzeTeamPositions(teams) {
        const analysis = {
            totalPrimaryPositions: 0,
            totalFlexibleAssignments: 0,
            teamBreakdown: [],
            overallFlexibility: 0
        };

        teams.forEach((team, index) => {
            let primaryCount = 0;
            let flexibleCount = 0;
            const positions = {};

            team.forEach(player => {
                if (player.isPrimaryPosition !== false) {
                    primaryCount++;
                    analysis.totalPrimaryPositions++;
                } else {
                    flexibleCount++;
                    analysis.totalFlexibleAssignments++;
                }

                const pos = player.currentPosition || player.primaryPosition || player.position;
                positions[pos] = (positions[pos] || 0) + 1;
            });

            analysis.teamBreakdown.push({
                teamIndex: index,
                primaryPositions: primaryCount,
                flexibleAssignments: flexibleCount,
                positionDistribution: positions,
                flexibilityRatio: team.length > 0 ? Math.round((flexibleCount / team.length) * 100) : 0
            });
        });

        const totalPlayers = teams.flat().length;
        analysis.overallFlexibility = totalPlayers > 0 ? 
            Math.round((analysis.totalFlexibleAssignments / totalPlayers) * 100) : 0;

        return analysis;
    }

    /**
     * Get unused players with position information
     */
    getUnusedPlayersWithPositionInfo(teams, allPlayers) {
        const usedPlayerIds = new Set();
        teams.forEach(team => {
            team.forEach(player => {
                usedPlayerIds.add(player.id);
            });
        });

        return allPlayers
            .filter(player => !usedPlayerIds.has(player.id))
            .map(player => ({
                ...player,
                availablePositions: player.positions || [player.position || player.primaryPosition || 'OH'],
                isMultiPosition: player.positions && player.positions.length > 1
            }));
    }

    /**
     * Updated alternative compositions with multiple positions consideration
     */
    suggestAlternativeCompositions(composition, availablePlayers) {
        const playersByPosition = this.groupPlayersByPosition(availablePlayers);
        const alternatives = [];

        const standardCompositions = [
            { name: '6v6 Standard', composition: { S: 1, OPP: 1, OH: 2, MB: 2, L: 0 } },
            { name: '6v6 with Libero', composition: { S: 1, OPP: 1, OH: 2, MB: 1, L: 1 } },
            { name: '4v4 Simplified', composition: { S: 1, OPP: 1, OH: 1, MB: 1, L: 0 } },
            { name: '3v3 Beach Style', composition: { S: 0, OPP: 1, OH: 1, MB: 1, L: 0 } },
            { name: '5v5 Adaptive', composition: { S: 1, OPP: 1, OH: 2, MB: 1, L: 0 } }
        ];

        standardCompositions.forEach(standard => {
            let canCreate = true;
            let maxTeams = Infinity;
            let flexibilityBonus = 0;

            Object.entries(standard.composition).forEach(([pos, count]) => {
                if (count > 0) {
                    const available = playersByPosition[pos] ? playersByPosition[pos].length : 0;
                    const primaryAvailable = playersByPosition[pos] ? 
                        playersByPosition[pos].filter(p => p.isPrimaryPosition).length : 0;
                    
                    if (available === 0) {
                        canCreate = false;
                    } else {
                        maxTeams = Math.min(maxTeams, Math.floor(available / count));
                        
                        // Bonus for flexibility (more players available than primary)
                        if (available > primaryAvailable) {
                            flexibilityBonus += (available - primaryAvailable) * 10;
                        }
                    }
                }
            });

            if (canCreate && maxTeams > 0) {
                alternatives.push({
                    ...standard,
                    maxTeams,
                    playersPerTeam: Object.values(standard.composition).reduce((a, b) => a + b, 0),
                    flexibilityScore: flexibilityBonus,
                    recommendation: flexibilityBonus > 50 ? 'Recommended' : 'Possible'
                });
            }
        });

        return alternatives.sort((a, b) => {
            // Sort by max teams, then by flexibility
            if (a.maxTeams !== b.maxTeams) return b.maxTeams - a.maxTeams;
            return b.flexibilityScore - a.flexibilityScore;
        });
    }

    // Keep all the existing optimization methods but update them for multiple positions
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
            
            // Accept better solutions or worse solutions with probability
            if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
                currentTeams = newTeams;
                currentScore = newScore;
                
                if (newScore < bestScore) {
                    bestTeams = JSON.parse(JSON.stringify(newTeams));
                    bestScore = newScore;
                }
            }
            
            // Cool down
            temperature *= coolingRate;
            
            // Progress update
            if (iteration % 5000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        return bestTeams;
    }

    async optimizeWithGeneticAlgorithm(initialSolutions, composition) {
        let population = [...initialSolutions];
        
        // Fill population with variations
        while (population.length < this.config.populationSize) {
            const parent = population[Math.floor(Math.random() * initialSolutions.length)];
            population.push(this.mutateTeams(JSON.parse(JSON.stringify(parent)), Object.keys(composition)));
        }

        for (let generation = 0; generation < 100; generation++) {
            // Evaluate fitness
            const fitness = population.map(teams => 1 / (1 + this.evaluateTeamSolution(teams)));
            
            // Selection
            const newPopulation = [];
            
            // Keep best solutions (elitism)
            const sorted = population
                .map((teams, index) => ({ teams, fitness: fitness[index] }))
                .sort((a, b) => b.fitness - a.fitness);
            
            newPopulation.push(...sorted.slice(0, 5).map(item => item.teams));
            
            // Crossover and mutation
            while (newPopulation.length < this.config.populationSize) {
                const parent1 = this.tournamentSelection(population, fitness);
                const parent2 = this.tournamentSelection(population, fitness);
                
                let offspring;
                if (Math.random() < this.config.crossoverRate) {
                    offspring = this.crossoverTeams(parent1, parent2, composition);
                } else {
                    offspring = JSON.parse(JSON.stringify(parent1));
                }
                
                if (Math.random() < this.config.mutationRate) {
                    offspring = this.mutateTeams(offspring, Object.keys(composition));
                }
                
                newPopulation.push(offspring);
            }
            
            population = newPopulation;
            
            // Progress update
            if (generation % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        // Return best solution
        const fitness = population.map(teams => this.evaluateTeamSolution(teams));
        const bestIndex = fitness.indexOf(Math.min(...fitness));
        return population[bestIndex];
    }

    async optimizeWithSmartSwaps(teams, positions) {
        if (teams.length < 2 || positions.length === 0) {
            return teams;
        }

        let bestTeams = JSON.parse(JSON.stringify(teams));
        let bestBalance = this.evaluateTeamSolution(bestTeams);
        let currentTeams = JSON.parse(JSON.stringify(teams));
        
        // Track which swaps have been tried to avoid repetition
        const attemptedSwaps = new Set();
        
        for (let iteration = 0; iteration < this.config.maxIterations * 0.3; iteration++) {
            // Prioritize swaps between most imbalanced teams
            const teamStrengths = currentTeams.map(team => 
                this.eloCalculator.calculateTeamStrength(team).totalRating
            );
            
            const maxStrength = Math.max(...teamStrengths);
            const minStrength = Math.min(...teamStrengths);
            const strongestTeamIndex = teamStrengths.indexOf(maxStrength);
            const weakestTeamIndex = teamStrengths.indexOf(minStrength);
            
            // 70% chance to swap between most imbalanced teams, 30% random
            let team1Index, team2Index;
            if (Math.random() < 0.7) {
                team1Index = strongestTeamIndex;
                team2Index = weakestTeamIndex;
            } else {
                team1Index = Math.floor(Math.random() * teams.length);
                do {
                    team2Index = Math.floor(Math.random() * teams.length);
                } while (team1Index === team2Index);
            }

            const positionToSwap = positions[Math.floor(Math.random() * positions.length)];
            
            const swapResult = this.attemptSmartPlayerSwap(
                currentTeams, team1Index, team2Index, positionToSwap, attemptedSwaps
            );

            if (swapResult.improved) {
                currentTeams = swapResult.teams;
                if (swapResult.balance < bestBalance) {
                    bestTeams = JSON.parse(JSON.stringify(currentTeams));
                    bestBalance = swapResult.balance;
                }
            }

            // Progress update
            if (iteration % 2000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        return bestTeams;
    }

    // Keep other helper methods with minimal changes
    generateNeighborSolution(teams, positions) {
        const newTeams = JSON.parse(JSON.stringify(teams));
        
        // Try multiple swap types
        const swapType = Math.random();
        
        if (swapType < 0.6) {
            // Single player swap
            this.performSingleSwap(newTeams, positions);
        } else if (swapType < 0.9) {
            // Double swap within same position
            this.performDoubleSwap(newTeams, positions);
        } else {
            // Rotation (3-way swap)
            this.performRotationSwap(newTeams, positions);
        }
        
        return newTeams;
    }

    tournamentSelection(population, fitness) {
        const tournamentSize = 3;
        let best = Math.floor(Math.random() * population.length);
        
        for (let i = 1; i < tournamentSize; i++) {
            const competitor = Math.floor(Math.random() * population.length);
            if (fitness[competitor] > fitness[best]) {
                best = competitor;
            }
        }
        
        return JSON.parse(JSON.stringify(population[best]));
    }

    crossoverTeams(parent1, parent2, composition) {
        const offspring = Array.from({ length: parent1.length }, () => []);
        
        // For each position, randomly choose players from either parent
        Object.keys(composition).forEach(position => {
            const parent1Players = parent1.flat().filter(p => 
                (p.currentPosition || p.primaryPosition || p.position) === position);
            const parent2Players = parent2.flat().filter(p => 
                (p.currentPosition || p.primaryPosition || p.position) === position);
            
            const allPlayers = [...parent1Players, ...parent2Players];
            const uniquePlayers = allPlayers.filter((player, index, arr) => 
                arr.findIndex(p => p.id === player.id) === index
            );
            
            // Redistribute these players
            uniquePlayers.forEach((player, index) => {
                offspring[index % offspring.length].push(player);
            });
        });
        
        return offspring;
    }

    mutateTeams(teams, positions) {
        const mutatedTeams = JSON.parse(JSON.stringify(teams));
        
        // Perform 1-3 random swaps
        const numMutations = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numMutations; i++) {
            this.performSingleSwap(mutatedTeams, positions);
        }
        
        return mutatedTeams;
    }

    performDoubleSwap(teams, positions) {
        if (teams.length < 2) return;
        
        const position = positions[Math.floor(Math.random() * positions.length)];
        const teamsWithPosition = teams.filter(team => 
            team.filter(p => 
                (p.currentPosition || p.primaryPosition || p.position) === position
            ).length >= 2
        );
        
        if (teamsWithPosition.length >= 2) {
            const team1 = teamsWithPosition[0];
            const team2 = teamsWithPosition[1];
            
            const team1Players = team1.filter(p => 
                (p.currentPosition || p.primaryPosition || p.position) === position
            ).slice(0, 2);
            const team2Players = team2.filter(p => 
                (p.currentPosition || p.primaryPosition || p.position) === position
            ).slice(0, 2);
            
            // Swap both players
            team1Players.forEach((player, i) => {
                const index1 = team1.findIndex(p => p.id === player.id);
                const index2 = team2.findIndex(p => p.id === team2Players[i].id);
                
                team1[index1] = team2Players[i];
                team2[index2] = player;
            });
        }
    }

    performRotationSwap(teams, positions) {
        if (teams.length < 3) return;
        
        const position = positions[Math.floor(Math.random() * positions.length)];
        const availableTeams = [];
        
        for (let i = 0; i < teams.length && availableTeams.length < 3; i++) {
            const posPlayers = teams[i].filter(p => 
                (p.currentPosition || p.primaryPosition || p.position) === position
            );
            if (posPlayers.length > 0) {
                availableTeams.push({ teamIndex: i, players: posPlayers });
            }
        }
        
        if (availableTeams.length >= 3) {
            const player1 = availableTeams[0].players[0];
            const player2 = availableTeams[1].players[0];
            const player3 = availableTeams[2].players[0];
            
            // Rotation: team1 gets player3, team2 gets player1, team3 gets player2
            const idx1 = teams[availableTeams[0].teamIndex].findIndex(p => p.id === player1.id);
            const idx2 = teams[availableTeams[1].teamIndex].findIndex(p => p.id === player2.id);
            const idx3 = teams[availableTeams[2].teamIndex].findIndex(p => p.id === player3.id);
            
            teams[availableTeams[0].teamIndex][idx1] = player3;
            teams[availableTeams[1].teamIndex][idx2] = player1;
            teams[availableTeams[2].teamIndex][idx3] = player2;
        }
    }

    attemptSmartPlayerSwap(teams, team1Index, team2Index, position, attemptedSwaps) {
        const team1 = teams[team1Index];
        const team2 = teams[team2Index];

        const team1Players = team1.filter(p => 
            (p.currentPosition || p.primaryPosition || p.position) === position ||
            (p.positions && p.positions.includes(position))
        );
        const team2Players = team2.filter(p => 
            (p.currentPosition || p.primaryPosition || p.position) === position ||
            (p.positions && p.positions.includes(position))
        );

        if (team1Players.length === 0 || team2Players.length === 0) {
            return { improved: false };
        }

        // Try all combinations to find best swap
        let bestImprovement = 0;
        let bestSwap = null;

        team1Players.forEach(player1 => {
            team2Players.forEach(player2 => {
                const swapKey = `${player1.id}-${player2.id}`;
                if (attemptedSwaps.has(swapKey)) return;

                const currentScore = this.evaluateTeamSolution(teams);
                
                // Perform temporary swap
                const testTeams = JSON.parse(JSON.stringify(teams));
                const p1Index = testTeams[team1Index].findIndex(p => p.id === player1.id);
                const p2Index = testTeams[team2Index].findIndex(p => p.id === player2.id);
                
                // Update current position for the swap
                const updatedPlayer1 = { ...player2, currentPosition: position };
                const updatedPlayer2 = { ...player1, currentPosition: position };
                
                testTeams[team1Index][p1Index] = updatedPlayer1;
                testTeams[team2Index][p2Index] = updatedPlayer2;
                
                const newScore = this.evaluateTeamSolution(testTeams);
                const improvement = currentScore - newScore;

                if (improvement > bestImprovement) {
                    bestImprovement = improvement;
                    bestSwap = { player1, player2, teams: testTeams };
                }
                
                attemptedSwaps.add(swapKey);
            });
        });

        if (bestSwap && bestImprovement > 0) {
            return {
                improved: true,
                teams: bestSwap.teams,
                balance: this.evaluateTeamSolution(bestSwap.teams)
            };
        }

        return { improved: false };
    }

    getUnusedPlayers(teams, allPlayers) {
        const usedPlayerIds = new Set();
        teams.forEach(team => {
            team.forEach(player => {
                usedPlayerIds.add(player.id);
            });
        });

        return allPlayers.filter(player => !usedPlayerIds.has(player.id));
    }

    /**
     * Enhanced composition analysis with multiple positions
     */
    analyzeCompositionEffectiveness(composition) {
        const analysis = {
            balance: 'good',
            recommendations: [],
            strengths: [],
            weaknesses: []
        };

        const totalPlayers = Object.values(composition).reduce((a, b) => a + b, 0);

        const attackers = (composition.OH || 0) + (composition.OPP || 0);
        const blockers = (composition.MB || 0);
        const setters = composition.S || 0;
        const liberos = composition.L || 0;

        if (setters === 0) {
            analysis.weaknesses.push('No setter - ball distribution will be difficult');
            analysis.balance = 'poor';
        } else if (setters > 1) {
            analysis.recommendations.push('Consider reducing setters to 1 for better specialization');
        }

        if (attackers < 2 && totalPlayers > 4) {
            analysis.weaknesses.push('Limited attacking options');
        }

        if (blockers === 0 && totalPlayers > 4) {
            analysis.weaknesses.push('No middle blockers - weak net defense');
        }

        if (liberos > 1) {
            analysis.recommendations.push('Only one libero is typically needed');
        }

        if (analysis.weaknesses.length === 0) {
            analysis.balance = 'excellent';
        } else if (analysis.weaknesses.length <= 2) {
            analysis.balance = 'good';
        } else {
            analysis.balance = 'needs improvement';
        }

        return analysis;
    }
}

window.TeamOptimizer = TeamOptimizer;
