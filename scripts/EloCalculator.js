/**
 * ELO rating system for calculating rating changes
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
     * Calculate rating change
     * @param {object} winner - winner object
     * @param {object} loser - loser object
     * @returns {object} new ratings
     */
    calculateRatingChange(winner, loser) {
        const winnerExpected = this.calculateExpectedScore(winner.rating, loser.rating);
        const loserExpected = this.calculateExpectedScore(loser.rating, winner.rating);

        const winnerKFactor = this.calculateKFactor(winner.comparisons, winner.rating);
        const loserKFactor = this.calculateKFactor(loser.comparisons, loser.rating);

        const winnerChange = winnerKFactor * (1 - winnerExpected);
        const loserChange = loserKFactor * (0 - loserExpected);

        return {
            winner: {
                oldRating: winner.rating,
                newRating: winner.rating + winnerChange,
                change: winnerChange,
                kFactor: winnerKFactor,
                expected: winnerExpected
            },
            loser: {
                oldRating: loser.rating,
                newRating: loser.rating + loserChange,
                change: loserChange,
                kFactor: loserKFactor,
                expected: loserExpected
            }
        };
    }

    /**
     * Predict match win probability
     * @param {object} player1 - first player
     * @param {object} player2 - second player
     * @returns {object} win probabilities
     */
    predictMatch(player1, player2) {
        const player1WinProbability = this.calculateExpectedScore(player1.rating, player2.rating);
        const player2WinProbability = this.calculateExpectedScore(player2.rating, player1.rating);

        return {
            player1: {
                name: player1.name,
                rating: player1.rating,
                winProbability: player1WinProbability,
                winPercentage: Math.round(player1WinProbability * 100)
            },
            player2: {
                name: player2.name,
                rating: player2.rating,
                winProbability: player2WinProbability,
                winPercentage: Math.round(player2WinProbability * 100)
            },
            ratingDifference: Math.abs(player1.rating - player2.rating),
            isBalanced: Math.abs(player1.rating - player2.rating) < 200
        };
    }

    /**
     * Calculate team strength
     * @param {array} players - array of players
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

        const totalRating = players.reduce((sum, player) => sum + player.rating, 0);
        const averageRating = totalRating / players.length;

        // Count team composition
        const composition = {};
        players.forEach(player => {
            composition[player.position] = (composition[player.position] || 0) + 1;
        });

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
     * Calculate player progress over time
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
}

window.EloCalculator = EloCalculator;
