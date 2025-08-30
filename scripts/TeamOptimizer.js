/**
 * Team optimizer for creating balanced teams
 */
class TeamOptimizer {
    constructor(eloCalculator) {
        this.eloCalculator = eloCalculator;
        this.maxIterations = 20000;
        this.positions = {
            'S': 'Setter',
            'OPP': 'Opposite', 
            'OH': 'Outside Hitter',
            'MB': 'Middle Blocker',
            'L': 'Libero'
        };
    }

    /**
     * Validate team composition requirements
     * @param {object} composition - composition requirements
     * @param {number} teamCount - number of teams
     * @param {array} availablePlayers - available players
     * @returns {object} validation result
     */
    validateTeamRequirements(composition, teamCount, availablePlayers) {
        const errors = [];
        const warnings = [];
        
        // Group players by position
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
     * Group players by position
     * @param {array} players - array of players
     * @returns {object} players grouped by position
     */
    groupPlayersByPosition(players) {
        const grouped = {};
        Object.keys(this.positions).forEach(pos => {
            grouped[pos] = [];
        });

        players.forEach(player => {
            if (grouped[player.position]) {
                grouped[player.position].push(player);
            }
        });

        return grouped;
    }

    /**
     * Create optimized teams
     * @param {object} composition - composition requirements
     * @param {number} teamCount - number of teams
     * @param {array} availablePlayers - available players
     * @returns {Promise<object>} optimization result
     */
    async optimizeTeams(composition, teamCount, availablePlayers) {
        // Validate input data
        const validation = this.validateTeamRequirements(composition, teamCount, availablePlayers);
        if (!validation.isValid) {
            throw new Error(`Cannot create teams: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        const playersByPosition = this.groupPlayersByPosition(availablePlayers);
        
        // Initialize teams
        let teams = Array.from({ length: teamCount }, () => []);

        // Distribute players by position using snake draft
        for (const [position, neededCount] of Object.entries(composition)) {
            if (neededCount === 0) continue;

            const positionPlayers = playersByPosition[position]
                .sort((a, b) => b.rating - a.rating)
                .slice(0, neededCount * teamCount);

            // Snake draft distribution for balance
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
            }
        }

        // Optimize using random swaps
        teams = await this.optimizeByRandomSwaps(teams, Object.keys(composition));

        // Sort teams by strength
        teams.sort((a, b) => {
            const strengthA = this.eloCalculator.calculateTeamStrength(a).totalRating;
            const strengthB = this.eloCalculator.calculateTeamStrength(b).totalRating;
            return strengthB - strengthA;
        });

        // Analyze result
        const balance = this.eloCalculator.evaluateTeamBalance(teams);
        const unusedPlayers = this.getUnusedPlayers(teams, availablePlayers);

        return {
            teams,
            balance,
            unusedPlayers,
            validation,
            stats: {
                totalTeams: teams.length,
                playersUsed: teams.reduce((sum, team) => sum + team.length, 0),
                averageTeamRating: Math.round(
                    teams.reduce((sum, team) => 
                        sum + this.eloCalculator.calculateTeamStrength(team).averageRating, 0
                    ) / teams.length
                )
            }
        };
    }

    /**
     * Optimize teams using random swaps
     * @param {array} teams - array of teams
     * @param {array} positions - positions for swaps
     * @returns {Promise<array>} optimized teams
     */
    async optimizeByRandomSwaps(teams, positions) {
        if (teams.length < 2 || positions.length === 0) {
            return teams;
        }

        let bestTeams = JSON.parse(JSON.stringify(teams)); // Deep copy
        let bestBalance = this.calculateTeamBalance(bestTeams);
        
        const iterationsPerBatch = 1000;
        const totalBatches = Math.ceil(this.maxIterations / iterationsPerBatch);

        for (let batch = 0; batch < totalBatches; batch++) {
            for (let iteration = 0; iteration < iterationsPerBatch; iteration++) {
                // Select random teams for swap
                const team1Index = Math.floor(Math.random() * teams.length);
                let team2Index;
                do {
                    team2Index = Math.floor(Math.random() * teams.length);
                } while (team1Index === team2Index);

                // Select position for swap
                const positionToSwap = positions[Math.floor(Math.random() * positions.length)];
                
                // Attempt swap
                const swapResult = this.attemptPlayerSwap(
                    teams, team1Index, team2Index, positionToSwap
                );

                if (swapResult.improved) {
                    teams = swapResult.teams;
                    if (swapResult.balance < bestBalance) {
                        bestTeams = JSON.parse(JSON.stringify(teams));
                        bestBalance = swapResult.balance;
                    }
                }
            }

            // Small pause to avoid blocking UI (in real application)
            if (batch % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        return bestTeams;
    }

    /**
     * Attempt player swap between teams
     * @param {array} teams - teams
     * @param {number} team1Index - first team index
     * @param {number} team2Index - second team index
     * @param {string} position - position for swap
     * @returns {object} attempt result
     */
    attemptPlayerSwap(teams, team1Index, team2Index, position) {
        const team1 = teams[team1Index];
        const team2 = teams[team2Index];

        // Find players at specified position
        const team1Players = team1.filter(p => p.position === position);
        const team2Players = team2.filter(p => p.position === position);

        if (team1Players.length === 0 || team2Players.length === 0) {
            return { improved: false };
        }

        // Select random players for swap
        const player1 = team1Players[Math.floor(Math.random() * team1Players.length)];
        const player2 = team2Players[Math.floor(Math.random() * team2Players.length)];

        // Calculate current balance
        const currentBalance = this.calculateTeamBalance(teams);

        // Create copy for testing swap
        const testTeams = JSON.parse(JSON.stringify(teams));
        
        // Perform swap
        const player1Index = testTeams[team1Index].findIndex(p => p.id === player1.id);
        const player2Index = testTeams[team2Index].findIndex(p => p.id === player2.id);
        
        testTeams[team1Index][player1Index] = player2;
        testTeams[team2Index][player2Index] = player1;

        // Calculate new balance
        const newBalance = this.calculateTeamBalance(testTeams);

        if (newBalance < currentBalance) {
            return {
                improved: true,
                teams: testTeams,
                balance: newBalance
            };
        }

        return { improved: false };
    }

    /**
     * Calculate team balance (difference between strongest and weakest)
     * @param {array} teams - array of teams
     * @returns {number} imbalance indicator
     */
    calculateTeamBalance(teams) {
        const strengths = teams.map(team => 
            this.eloCalculator.calculateTeamStrength(team).totalRating
        );
        
        return Math.max(...strengths) - Math.min(...strengths);
    }

    /**
     * Get unused players
     * @param {array} teams - teams
     * @param {array} allPlayers - all available players
     * @returns {array} unused players
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

    /**
     * Suggest alternative compositions
     * @param {object} composition - current composition
     * @param {array} availablePlayers - available players
     * @returns {array} alternative composition variants
     */
    suggestAlternativeCompositions(composition, availablePlayers) {
        const playersByPosition = this.groupPlayersByPosition(availablePlayers);
        const alternatives = [];

        // Standard volleyball compositions
        const standardCompositions = [
            { name: '6v6 Standard', composition: { S: 1, OPP: 1, OH: 2, MB: 2, L: 0 } },
            { name: '6v6 with Libero', composition: { S: 1, OPP: 1, OH: 2, MB: 1, L: 1 } },
            { name: '4v4 Simplified', composition: { S: 1, OPP: 1, OH: 1, MB: 1, L: 0 } },
            { name: '3v3 Beach Style', composition: { S: 0, OPP: 1, OH: 1, MB: 1, L: 0 } }
        ];

        standardCompositions.forEach(standard => {
            let canCreate = true;
            let maxTeams = Infinity;

            Object.entries(standard.composition).forEach(([pos, count]) => {
                if (count > 0) {
                    const available = playersByPosition[pos] ? playersByPosition[pos].length : 0;
                    if (available === 0) {
                        canCreate = false;
                    } else {
                        maxTeams = Math.min(maxTeams, Math.floor(available / count));
                    }
                }
            });

            if (canCreate && maxTeams > 0) {
                alternatives.push({
                    ...standard,
                    maxTeams,
                    playersPerTeam: Object.values(standard.composition).reduce((a, b) => a + b, 0)
                });
            }
        });

        return alternatives.sort((a, b) => b.maxTeams - a.maxTeams);
    }

    /**
     * Analyze composition effectiveness
     * @param {object} composition - team composition
     * @returns {object} effectiveness analysis
     */
    analyzeCompositionEffectiveness(composition) {
        const analysis = {
            balance: 'good',
            recommendations: [],
            strengths: [],
            weaknesses: []
        };

        const totalPlayers = Object.values(composition).reduce((a, b) => a + b, 0);

        // Analyze attack and defense balance
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

        // Determine overall balance
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
