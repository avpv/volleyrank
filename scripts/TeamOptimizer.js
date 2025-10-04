/**
 * Team optimizer with multiple position ratings
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
            initialTemperature: 1000,
            coolingRate: 0.995
        };
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
                            rating: player.ratings[position] || 1500 // For compatibility
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
     * Main optimization method
     */
    async optimizeTeams(composition, teamCount, availablePlayers) {
        const validation = this.validateTeamRequirements(composition, teamCount, availablePlayers);
        if (!validation.isValid) {
            throw new Error(`Cannot create teams: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        const playersByPosition = this.groupPlayersByPosition(availablePlayers);
        
        // Generate initial solutions
        const candidates = [];
        
        candidates.push(this.createBalancedRatingSolution(composition, teamCount, playersByPosition));
        candidates.push(this.createSnakeDraftSolution(composition, teamCount, playersByPosition));
        
        for (let i = 0; i < 2; i++) {
            candidates.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }

        // Optimize each candidate
        const optimizedCandidates = [];
        for (let i = 0; i < candidates.length; i++) {
            let optimized;
            
            if (this.config.simulatedAnnealingEnabled) {
                optimized = await this.optimizeWithSimulatedAnnealing(
                    candidates[i], 
                    Object.keys(composition)
                );
            } else {
                optimized = candidates[i];
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
            algorithm: 'Multi-Position Rating Optimization'
        };
    }

    /**
     * Create balanced rating solution
     */
    createBalancedRatingSolution(composition, teamCount, playersByPosition) {
        let teams = Array.from({ length: teamCount }, () => []);
        const usedPlayerIds = new Set();
        
        for (const [position, neededCount] of Object.entries(composition)) {
            if (neededCount === 0) continue;
            
            const positionPlayers = (playersByPosition[position] || [])
                .filter(p => !usedPlayerIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating)
                .slice(0, neededCount * teamCount);
            
            positionPlayers.forEach(player => {
                const teamRatings = teams.map(team => 
                    team.reduce((sum, p) => sum + (p.positionRating || p.rating), 0)
                );
                const minRatingIndex = teamRatings.indexOf(Math.min(...teamRatings));
                teams[minRatingIndex].push(player);
                usedPlayerIds.add(player.id);
            });
        }
        
        return teams;
    }

    /**
     * Create snake draft solution
     */
    createSnakeDraftSolution(composition, teamCount, playersByPosition) {
        let teams = Array.from({ length: teamCount }, () => []);
        const usedPlayerIds = new Set();

        for (const [position, neededCount] of Object.entries(composition)) {
            if (neededCount === 0) continue;

            let positionPlayers = (playersByPosition[position] || [])
                .filter(p => !usedPlayerIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating)
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
     * Create random solution
     */
    createRandomSolution(composition, teamCount, playersByPosition) {
        let teams = Array.from({ length: teamCount }, () => []);
        const usedPlayerIds = new Set();

        for (const [position, neededCount] of Object.entries(composition)) {
            if (neededCount === 0) continue;

            let positionPlayers = (playersByPosition[position] || [])
                .filter(p => !usedPlayerIds.has(p.id))
                .slice(0, neededCount * teamCount);
            
            // Shuffle
            for (let i = positionPlayers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positionPlayers[i], positionPlayers[j]] = [positionPlayers[j], positionPlayers[i]];
            }

            positionPlayers.forEach((player, index) => {
                teams[index % teamCount].push(player);
                usedPlayerIds.add(player.id);
            });
        }

        return teams;
    }

    /**
     * Calculate team strength using position-specific ratings
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
     * Evaluate team solution
     */
    evaluateTeamSolution(teams) {
        if (!teams || teams.length === 0) return Infinity;

        const teamStrengths = teams.map(team => this.calculateTeamStrength(team));

        const balance = Math.max(...teamStrengths) - Math.min(...teamStrengths);
        
        const avgStrength = teamStrengths.reduce((a, b) => a + b, 0) / teamStrengths.length;
        const variance = teamStrengths.reduce((sum, strength) => 
            sum + Math.pow(strength - avgStrength, 2), 0) / teamStrengths.length;

        return balance + Math.sqrt(variance) * 0.5;
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
        this.performSingleSwap(newTeams, positions);
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
