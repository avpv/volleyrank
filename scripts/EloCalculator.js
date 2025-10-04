/**
 * ELO rating system for calculating rating changes
 * Updated to support multiple position ratings
 */
class EloCalculator {
    constructor() {
        this.defaultRating = 1500;
        this.baseKFactor = 30;
    }

    /**
     * Calculate expected match outcome
     * @param {number} playerRating - player's rating
     * @param {number} opponentRating - opponent's rating
     * @returns {number} expected result (0-1)
     */
    calculateExpectedScore(playerRating, opponentRating) {
        const ratingDifference = opponentRating - playerRating;
        return 1 / (1 + Math.pow(10, ratingDifference / 400));
    }

    /**
     * Dynamic K-factor based on player experience
     * @param {number} comparisons - number of comparisons
     * @param {number} rating - current rating
     * @returns {number} K-factor
     */
    calculateKFactor(comparisons, rating) {
        // New players (less than 20 comparisons) - high K-factor
        if (comparisons < 20) {
            return 40;
        }
        
        // Experienced players with high rating - low K-factor
        if (rating > 2000 && comparisons > 50) {
            return 15;
        }
        
        // Mid-level players
        if (rating > 1800 && comparisons > 30) {
            return 20;
        }
        
        // Standard K-factor
        return this.baseKFactor;
    }

    /**
     * Calculate rating change for a specific position
     * @param {object} winner - winner object
     * @param {object} loser - loser object
     * @param {string} position - position being compared
     * @returns {object} new ratings
     */
    calculateRatingChangeForPosition(winner, loser, position) {
        const winnerRating = winner.ratings[position] || this.defaultRating;
        const loserRating = loser.ratings[position] || this.defaultRating;
        const winnerComparisons = winner.comparisons[position] || 0;
        const loserComparisons = loser.comparisons[position] || 0;

        const winnerExpected = this.calculateExpectedScore(winnerRating, loserRating);
        const loserExpected = this.calculateExpectedScore(loserRating, winnerRating);

        const winnerKFactor = this.calculateKFactor(winnerComparisons, winnerRating);
        const loserKFactor = this.calculateKFactor(loserComparisons, loserRating);

        const winnerChange = winnerKFactor * (1 - winnerExpected);
        const loserChange = loserKFactor * (0 - loserExpected);

        return {
            winner: {
                oldRating: winnerRating,
                newRating: winnerRating + winnerChange,
                change: winnerChange,
                kFactor: winnerKFactor,
                expected: winnerExpected
            },
            loser: {
                oldRating: loserRating,
                newRating: loserRating + loserChange,
                change: loserChange,
                kFactor: loserKFactor,
                expected: loserExpected
            }
        };
    }

    /**
     * Legacy method for backward compatibility
     */
    calculateRatingChange(winner, loser) {
        // Use the first position or default rating
        const position = winner.positions ? winner.positions[0] : null;
        if (position) {
            return this.calculateRatingChangeForPosition(winner, loser, position);
        }
        
        // Fallback for old data structure
        const winnerRating = winner.rating || this.defaultRating;
        const loserRating = loser.rating || this.defaultRating;
        const winnerComparisons = winner.comparisons || 0;
        const loserComparisons = loser.comparisons || 0;

        const winnerExpected = this.calculateExpectedScore(winnerRating, loserRating);
        const loserExpected = this.calculateExpectedScore(loserRating, winnerRating);

        const winnerKFactor = this.calculateKFactor(winnerComparisons, winnerRating);
        const loserKFactor = this.calculateKFactor(loserComparisons, loserRating);

        const winnerChange = winnerKFactor * (1 - winnerExpected);
        const loserChange = loserKFactor * (0 - loserExpected);

        return {
            winner: {
                oldRating: winnerRating,
                newRating: winnerRating + winnerChange,
                change: winnerChange,
                kFactor: winnerKFactor,
                expected: winnerExpected
            },
            loser: {
                oldRating: loserRating,
                newRating: loserRating + loserChange,
                change: loserChange,
                kFactor: loserKFactor,
                expected: loserExpected
            }
        };
    }

    /**
     * Predict match win probability for a specific position
     * @param {object} player1 - first player
     * @param {object} player2 - second player
     * @param {string} position - position to compare
     * @returns {object} win probabilities
     */
    predictMatchAtPosition(player1, player2, position) {
        const p1Rating = player1.ratings[position] || this.defaultRating;
        const p2Rating = player2.ratings[position] || this.defaultRating;

        const player1WinProbability = this.calculateExpectedScore(p1Rating, p2Rating);
        const player2WinProbability = this.calculateExpectedScore(p2Rating, p1Rating);

        return {
            player1: {
                name: player1.name,
                rating: p1Rating,
                position: position,
                winProbability: player1WinProbability,
                winPercentage: Math.round(player1WinProbability * 100)
            },
            player2: {
                name: player2.name,
                rating: p2Rating,
                position: position,
                winProbability: player2WinProbability,
                winPercentage: Math.round(player2WinProbability * 100)
            },
            ratingDifference: Math.abs(p1Rating - p2Rating),
            isBalanced: Math.abs(p1Rating - p2Rating) < 200
        };
    }

    /**
     * Legacy method for backward compatibility
     */
    predictMatch(player1, player2) {
        const position = player1.positions ? player1.positions[0] : null;
        if (position) {
            return this.predictMatchAtPosition(player1, player2, position);
        }

        const p1Rating = player1.rating || this.defaultRating;
        const p2Rating = player2.rating || this.defaultRating;

        const player1WinProbability = this.calculateExpectedScore(p1Rating, p2Rating);
        const player2WinProbability = this.calculateExpectedScore(p2Rating, p1Rating);

        return {
            player1: {
                name: player1.name,
                rating: p1Rating,
                winProbability: player1WinProbability,
                winPercentage: Math.round(player1WinProbability * 100)
            },
            player2: {
                name: player2.name,
                rating: p2Rating,
                winProbability: player2WinProbability,
                winPercentage: Math.round(player2WinProbability * 100)
            },
            ratingDifference: Math.abs(p1Rating - p2Rating),
            isBalanced: Math.abs(p1Rating - p2Rating) < 200
        };
    }

    /**
     * Calculate team strength (updated for position-specific ratings)
     * @param {array} players - array of players with assigned positions
     * @returns {object} team statistics
     */
    calculateTeamStrength(players) {
        if (!players || players.length === 0) {
            return {
                totalRating: 0,
                averageRating: 0,
                playerCount: 0,
                composition: {}
            };
        }

        let totalRating = 0;
        const composition = {};

        players.forEach(player => {
            // Use assigned position rating if available, otherwise use first position
            const position = player.assignedPosition || (player.positions ? player.positions[0] : null);
            const rating = position && player.ratings ? 
                (player.ratings[position] || this.defaultRating) : 
                (player.rating || this.defaultRating);
            
            totalRating += rating;
            composition[position] = (composition[position] || 0) + 1;
        });

        const averageRating = totalRating / players.length;

        return {
            totalRating: Math.round(totalRating),
            averageRating: Math.round(averageRating),
            playerCount: players.length,
            composition
        };
    }

    /**
     * Evaluate balance between teams
     * @param {array} teams - array of teams
     * @returns {object} balance evaluation
     */
    evaluateTeamBalance(teams) {
        if (!teams || teams.length < 2) {
            return {
                isBalanced: true,
                maxDifference: 0,
                teams: []
            };
        }

        const teamStats = teams.map(team => this.calculateTeamStrength(team));
        const ratings = teamStats.map(stats => stats.totalRating);
        
        const maxRating = Math.max(...ratings);
        const minRating = Math.min(...ratings);
        const maxDifference = maxRating - minRating;
        
        // Teams are considered balanced if difference is less than 300 ELO
        const isBalanced = maxDifference < 300;

        return {
            isBalanced,
            maxDifference: Math.round(maxDifference),
            averageDifference: Math.round(maxDifference / 2),
            teams: teamStats.map((stats, index) => ({
                index,
                ...stats,
                strengthRank: ratings.filter(r => r > stats.totalRating).length + 1
            }))
        };
    }

    /**
     * Simulate match between teams
     * @param {array} team1 - first team
     * @param {array} team2 - second team
     * @returns {object} simulation result
     */
    simulateMatch(team1, team2) {
        const team1Stats = this.calculateTeamStrength(team1);
        const team2Stats = this.calculateTeamStrength(team2);
        
        const team1WinProbability = this.calculateExpectedScore(
            team1Stats.averageRating, 
            team2Stats.averageRating
        );
        
        return {
            team1: {
                ...team1Stats,
                winProbability: team1WinProbability,
                winPercentage: Math.round(team1WinProbability * 100)
            },
            team2: {
                ...team2Stats,
                winProbability: 1 - team1WinProbability,
                winPercentage: Math.round((1 - team1WinProbability) * 100)
            },
            isBalanced: Math.abs(team1Stats.averageRating - team2Stats.averageRating) < 100,
            ratingDifference: Math.abs(team1Stats.averageRating - team2Stats.averageRating)
        };
    }

    /**
     * Get recommendations for improving balance
     * @param {array} teams - array of teams
     * @returns {array} array of recommendations
     */
    getBalanceRecommendations(teams) {
        const balance = this.evaluateTeamBalance(teams);
        const recommendations = [];

        if (!balance.isBalanced) {
            const strongestTeam = balance.teams.reduce((prev, current) => 
                prev.totalRating > current.totalRating ? prev : current
            );
            
            const weakestTeam = balance.teams.reduce((prev, current) => 
                prev.totalRating < current.totalRating ? prev : current
            );

            recommendations.push({
                type: 'swap_players',
                message: `Consider swapping players between Team ${strongestTeam.index + 1} and Team ${weakestTeam.index + 1}`,
                priority: 'high'
            });

            if (balance.maxDifference > 500) {
                recommendations.push({
                    type: 'redistribute',
                    message: 'Large rating difference detected. Consider completely redistributing players.',
                    priority: 'critical'
                });
            }
        }

        return recommendations;
    }

    /**
     * Calculate player progress over time for a specific position
     * @param {array} ratingHistory - rating history
     * @returns {object} progress statistics
     */
    calculateProgress(ratingHistory) {
        if (!ratingHistory || ratingHistory.length < 2) {
            return {
                totalChange: 0,
                averageChange: 0,
                trend: 'stable',
                peakRating: this.defaultRating,
                lowestRating: this.defaultRating
            };
        }

        const firstRating = ratingHistory[0].rating;
        const lastRating = ratingHistory[ratingHistory.length - 1].rating;
        const totalChange = lastRating - firstRating;
        
        const peakRating = Math.max(...ratingHistory.map(h => h.rating));
        const lowestRating = Math.min(...ratingHistory.map(h => h.rating));
        
        const recentGames = ratingHistory.slice(-5);
        const recentTrend = recentGames.length >= 2 ? 
            recentGames[recentGames.length - 1].rating - recentGames[0].rating : 0;

        let trend = 'stable';
        if (recentTrend > 50) trend = 'improving';
        else if (recentTrend < -50) trend = 'declining';

        return {
            totalChange: Math.round(totalChange),
            averageChange: Math.round(totalChange / (ratingHistory.length - 1)),
            trend,
            peakRating: Math.round(peakRating),
            lowestRating: Math.round(lowestRating),
            gamesPlayed: ratingHistory.length,
            recentTrend: Math.round(recentTrend)
        };
    }

    /**
     * Get player's best position based on ratings
     * @param {object} player - player object with ratings
     * @returns {object} best position info
     */
    getBestPosition(player) {
        if (!player.ratings || !player.positions || player.positions.length === 0) {
            return null;
        }

        let bestPosition = null;
        let bestRating = 0;

        player.positions.forEach(pos => {
            const rating = player.ratings[pos] || this.defaultRating;
            if (rating > bestRating) {
                bestRating = rating;
                bestPosition = pos;
            }
        });

        return {
            position: bestPosition,
            rating: bestRating,
            comparisons: player.comparisons[bestPosition] || 0
        };
    }

    /**
     * Compare player's ratings across positions
     * @param {object} player - player object with ratings
     * @returns {array} position comparison data
     */
    comparePlayerPositions(player) {
        if (!player.ratings || !player.positions) {
            return [];
        }

        return player.positions.map(pos => ({
            position: pos,
            rating: player.ratings[pos] || this.defaultRating,
            comparisons: player.comparisons[pos] || 0,
            comparedWith: (player.comparedWith[pos] || []).length
        })).sort((a, b) => b.rating - a.rating);
    }
}

window.EloCalculator = EloCalculator;
