// src/services/optimizer/utils/solutionGenerators.js

/**
 * Generators for initial team solutions using different strategies
 */

/**
 * Generate multiple initial solutions using different strategies
 * @param {Object} composition - Position composition requirements
 * @param {number} teamCount - Number of teams
 * @param {Object} playersByPosition - Players grouped by position
 * @returns {Array} Array of initial solutions
 */
export function generateInitialSolutions(composition, teamCount, playersByPosition) {
    const strategies = [
        () => createGreedySolution(composition, teamCount, playersByPosition),
        () => createBalancedSolution(composition, teamCount, playersByPosition),
        () => createSnakeDraftSolution(composition, teamCount, playersByPosition),
        () => createRandomSolution(composition, teamCount, playersByPosition)
    ];
    
    return strategies.map(strategy => strategy());
}

/**
 * Create a greedy solution by assigning strongest players first
 */
function createGreedySolution(composition, teamCount, playersByPosition) {
    const teams = Array.from({ length: teamCount }, () => []);
    const usedIds = new Set();
    
    const positionPriority = ['MB', 'S', 'L', 'OPP', 'OH'];
    const positionOrder = positionPriority
        .map(pos => [pos, composition[pos]])
        .filter(([, count]) => count && count > 0);

    positionOrder.forEach(([position, neededCount]) => {
        const players = (playersByPosition[position] || [])
            .filter(p => !usedIds.has(p.id))
            .sort((a, b) => b.positionRating - a.positionRating);
        
        let playerIdx = 0;
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

/**
 * Create a balanced solution by round-robin assignment
 */
function createBalancedSolution(composition, teamCount, playersByPosition) {
    const teams = Array.from({ length: teamCount }, () => []);
    const usedIds = new Set();
    
    const positionPriority = ['MB', 'S', 'L', 'OPP', 'OH'];
    const positionOrder = positionPriority
        .map(pos => [pos, composition[pos]])
        .filter(([, count]) => count && count > 0);

    positionOrder.forEach(([position, neededCount]) => {
        const players = (playersByPosition[position] || [])
            .filter(p => !usedIds.has(p.id))
            .sort((a, b) => b.positionRating - a.positionRating);
        
        let playerIdx = 0;
        for (let round = 0; round < neededCount; round++) {
            for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
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

/**
 * Create a snake draft solution (1→2→3→3→2→1)
 */
export function createSnakeDraftSolution(composition, teamCount, playersByPosition) {
    const teams = Array.from({ length: teamCount }, () => []);
    const usedIds = new Set();
    
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
        let round = 0;
        while (playerIdx < players.length) {
            const isReverseRound = round % 2 === 1;
            
            for (let slotInRound = 0; slotInRound < teamCount; slotInRound++) {
                const teamIdx = isReverseRound ? (teamCount - 1 - slotInRound) : slotInRound;
                
                const currentCount = teams[teamIdx].filter(p => p.assignedPosition === position).length;
                if (currentCount < neededCount && playerIdx < players.length) {
                    teams[teamIdx].push(players[playerIdx]);
                    usedIds.add(players[playerIdx].id);
                    playerIdx++;
                }
            }
            round++;
            
            if (round > 100) {
                console.warn(`Warning: Snake draft exceeded 100 rounds for ${position}`);
                break;
            }
        }
    });
    return teams;
}

/**
 * Create a random solution by shuffling players
 */
export function createRandomSolution(composition, teamCount, playersByPosition) {
    const teams = Array.from({ length: teamCount }, () => []);
    const usedIds = new Set();

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
