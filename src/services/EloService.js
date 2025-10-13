/**
 * EloService - ELO rating calculations
 * Pure business logic with no state management
 */
class EloService {
    constructor() {
        this.DEFAULT_RATING = 1500;
        this.BASE_K_FACTOR = 30;
    }

    /**
     * Calculate expected match outcome
     */
    calculateExpectedScore(playerRating, opponentRating) {
        const ratingDifference = opponentRating - playerRating;
        return 1 / (1 + Math.pow(10, ratingDifference / 400));
    }

    /**
     * Dynamic K-factor based on experience
     */
    calculateKFactor(comparisons, rating) {
        if (comparisons < 20) return 40;
        if (rating > 2000 && comparisons > 50) return 15;
        if (rating > 1800 && comparisons > 30) return 20;
        return this.BASE_K_FACTOR;
    }

    /**
     * Calculate rating changes for a position
     */
    calculateRatingChange(winner, loser, position) {
        const winnerRating = winner.ratings?.[position] || this.DEFAULT_RATING;
        const loserRating = loser.ratings?.[position] || this.DEFAULT_RATING;
        const winnerComparisons = winner.comparisons?.[position] || 0;
        const loserComparisons = loser.comparisons?.[position] || 0;

        const winnerExpected = this.calculateExpectedScore(winnerRating, loserRating);
        const loserExpected = this.calculateExpectedScore(loserRating, winnerRating);

        const winnerK = this.calculateKFactor(winnerComparisons, winnerRating);
        const loserK = this.calculateKFactor(loserComparisons, loserRating);

        const winnerChange = winnerK * (1 - winnerExpected);
        const loserChange = loserK * (0 - loserExpected);

        return {
            winner: {
                oldRating: winnerRating,
                newRating: winnerRating + winnerChange,
                change: winnerChange,
                kFactor: winnerK,
                expected: winnerExpected
            },
            loser: {
                oldRating: loserRating,
                newRating: loserRating + loserChange,
                change: loserChange,
                kFactor: loserK,
                expected: loserExpected
            }
        };
    }

    /**
     * Predict match outcome
     */
    predictMatch(player1, player2, position) {
        const p1Rating = player1.ratings?.[position] || this.DEFAULT_RATING;
        const p2Rating = player2.ratings?.[position] || this.DEFAULT_RATING;

        const p1WinProb = this.calculateExpectedScore(p1Rating, p2Rating);
        const p2WinProb = this.calculateExpectedScore(p2Rating, p1Rating);

        return {
            player1: {
                name: player1.name,
                rating: p1Rating,
                position,
                winProbability: p1WinProb,
                winPercentage: Math.round(p1WinProb * 100)
            },
            player2: {
                name: player2.name,
                rating: p2Rating,
                position,
                winProbability: p2WinProb,
                winPercentage: Math.round(p2WinProb * 100)
            },
            ratingDifference: Math.abs(p1Rating - p2Rating),
            isBalanced: Math.abs(p1Rating - p2Rating) < 200
        };
    }

    /**
     * Calculate team strength
     */
    calculateTeamStrength(players) {
        if (!players || players.length === 0) {
            return {
                totalRating: 0,
                averageRating: 0,
                playerCount: 0
            };
        }

        let totalRating = 0;

        players.forEach(player => {
            const position = player.assignedPosition || player.positions?.[0];
            const rating = position && player.ratings?.[position] 
                ? player.ratings[position] 
                : this.DEFAULT_RATING;
            
            totalRating += rating;
        });

        return {
            totalRating: Math.round(totalRating),
            averageRating: Math.round(totalRating / players.length),
            playerCount: players.length
        };
    }

    /**
     * Evaluate balance between teams
     */
    evaluateBalance(teams) {
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
        
        const isBalanced = maxDifference < 300;

        return {
            isBalanced,
            maxDifference: Math.round(maxDifference),
            teams: teamStats.map((stats, index) => ({
                index,
                ...stats,
                strengthRank: ratings.filter(r => r > stats.totalRating).length + 1
            }))
        };
    }

    /**
     * Get player's best position
     */
    getBestPosition(player) {
        if (!player.ratings || !player.positions) {
            return null;
        }

        let bestPosition = null;
        let bestRating = 0;

        player.positions.forEach(pos => {
            const rating = player.ratings[pos] || this.DEFAULT_RATING;
            if (rating > bestRating) {
                bestRating = rating;
                bestPosition = pos;
            }
        });

        return {
            position: bestPosition,
            rating: bestRating,
            comparisons: player.comparisons?.[bestPosition] || 0
        };
    }

    /**
     * Compare player's ratings across positions
     */
    comparePositions(player) {
        if (!player.ratings || !player.positions) {
            return [];
        }

        return player.positions.map(pos => ({
            position: pos,
            rating: player.ratings[pos] || this.DEFAULT_RATING,
            comparisons: player.comparisons?.[pos] || 0,
            comparedWith: (player.comparedWith?.[pos] || []).length
        })).sort((a, b) => b.rating - a.rating);
    }
}

export default new EloService();
