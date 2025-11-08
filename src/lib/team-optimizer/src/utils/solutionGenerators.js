// src/services/optimizer/utils/solutionGenerators.js

/**
 * Generators for initial team solutions using different strategies
 */

// Track warnings to avoid spam
const warningTracker = {
    counts: new Map(),
    lastReset: Date.now(),
    resetInterval: 5000, // Reset every 5 seconds

    shouldWarn(key) {
        const now = Date.now();
        if (now - this.lastReset > this.resetInterval) {
            this.counts.clear();
            this.lastReset = now;
        }

        const count = this.counts.get(key) || 0;
        this.counts.set(key, count + 1);

        // Only warn once per position per reset interval
        return count === 0;
    }
};

/**
 * Calculate position scarcity - how tight each position's player supply is
 * @param {Object} composition - Position requirements
 * @param {number} teamCount - Number of teams
 * @param {Object} playersByPosition - Available players by position
 * @param {Set} usedIds - Already allocated player IDs
 * @returns {Object} Position scarcity scores (lower = more scarce)
 */
function calculatePositionScarcity(composition, teamCount, playersByPosition, usedIds) {
    const scarcity = {};

    Object.entries(composition).forEach(([position, neededPerTeam]) => {
        if (!neededPerTeam || neededPerTeam === 0) {
            scarcity[position] = Infinity; // Not needed
            return;
        }

        const totalNeeded = neededPerTeam * teamCount;
        const availablePlayers = (playersByPosition[position] || [])
            .filter(p => !usedIds.has(p.id));
        const availableCount = availablePlayers.length;

        // Scarcity score: ratio of available to needed (lower = more scarce)
        scarcity[position] = availableCount / totalNeeded;
    });

    return scarcity;
}

/**
 * Create a smart solution that prioritizes specialists and handles scarcity
 * This should eliminate most allocation warnings by making intelligent choices
 * @param {boolean} randomize - Add randomization to avoid identical solutions
 */
function createSmartSolution(composition, teamCount, playersByPosition, randomize = false) {
    const teams = Array.from({ length: teamCount }, () => []);
    const usedIds = new Set();

    // Get all positions we need to fill
    const positionsNeeded = Object.entries(composition)
        .filter(([, count]) => count && count > 0)
        .map(([pos, count]) => ({ position: pos, count }));

    // Phase 1: Allocate specialist players (those who can only play one position)
    positionsNeeded.forEach(({ position, count: neededCount }) => {
        const specialists = (playersByPosition[position] || [])
            .filter(p => !usedIds.has(p.id) && p.positions.length === 1)
            .sort((a, b) => {
                const aRating = randomize ? a.positionRating + (Math.random() - 0.5) * 30 : a.positionRating;
                const bRating = randomize ? b.positionRating + (Math.random() - 0.5) * 30 : b.positionRating;
                return bRating - aRating;
            });

        let playerIdx = 0;
        for (let teamIdx = 0; teamIdx < teamCount && playerIdx < specialists.length; teamIdx++) {
            for (let slot = 0; slot < neededCount && playerIdx < specialists.length; slot++) {
                const currentCount = teams[teamIdx].filter(p => p.assignedPosition === position).length;
                if (currentCount < neededCount) {
                    teams[teamIdx].push(specialists[playerIdx]);
                    usedIds.add(specialists[playerIdx].id);
                    playerIdx++;
                }
            }
        }
    });

    // Phase 2: Allocate multi-position players based on position scarcity
    // Keep filling until all positions are satisfied
    let maxIterations = 100;
    let iteration = 0;

    while (iteration < maxIterations) {
        iteration++;
        let madeProgress = false;

        // Calculate current scarcity for remaining positions
        const scarcity = calculatePositionScarcity(composition, teamCount, playersByPosition, usedIds);

        // Sort positions by scarcity (most scarce first)
        const positionsByScarcity = positionsNeeded
            .map(({ position }) => ({ position, scarcity: scarcity[position] }))
            .filter(({ scarcity }) => scarcity < Infinity)
            .sort((a, b) => a.scarcity - b.scarcity);

        // Try to fill the most scarce position
        for (const { position } of positionsByScarcity) {
            const neededCount = composition[position];

            // Check if any team still needs this position
            let needsMore = false;
            for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                const currentCount = teams[teamIdx].filter(p => p.assignedPosition === position).length;
                if (currentCount < neededCount) {
                    needsMore = true;
                    break;
                }
            }

            if (!needsMore) continue;

            // Get available players for this position (including multi-position)
            const availablePlayers = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .sort((a, b) => {
                    // Prefer players with fewer position options (more specialized)
                    if (a.positions.length !== b.positions.length) {
                        return a.positions.length - b.positions.length;
                    }

                    // Then by rating (with optional randomization)
                    const aRating = randomize ? a.positionRating + (Math.random() - 0.5) * 30 : a.positionRating;
                    const bRating = randomize ? b.positionRating + (Math.random() - 0.5) * 30 : b.positionRating;
                    return bRating - aRating;
                });

            if (availablePlayers.length === 0) continue;

            // Allocate players to teams that need this position
            for (let teamIdx = 0; teamIdx < teamCount && availablePlayers.length > 0; teamIdx++) {
                const currentCount = teams[teamIdx].filter(p => p.assignedPosition === position).length;

                if (currentCount < neededCount) {
                    const player = availablePlayers.shift();
                    teams[teamIdx].push(player);
                    usedIds.add(player.id);
                    madeProgress = true;
                }
            }
        }

        // If we didn't make any progress, we're done (either complete or stuck)
        if (!madeProgress) break;
    }

    // Check if we successfully filled all positions and log warnings if not
    positionsNeeded.forEach(({ position, count: neededCount }) => {
        for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
            const currentCount = teams[teamIdx].filter(p => p.assignedPosition === position).length;
            if (currentCount < neededCount) {
                const warningKey = `smart-${position}`;
                if (warningTracker.shouldWarn(warningKey)) {
                    console.warn(`Warning: Not enough ${position} players for team ${teamIdx + 1} (smart allocation - this indicates insufficient players)`);
                }
            }
        }
    });

    return teams;
}

/**
 * Generate multiple initial solutions using different strategies
 * All strategies now include randomization to ensure diversity
 * @param {Object} composition - Position composition requirements
 * @param {number} teamCount - Number of teams
 * @param {Object} playersByPosition - Players grouped by position
 * @returns {Array} Array of initial solutions
 */
export function generateInitialSolutions(composition, teamCount, playersByPosition) {
    const strategies = [
        () => createSmartSolution(composition, teamCount, playersByPosition, false),  // NEW: Smart allocation
        () => createSmartSolution(composition, teamCount, playersByPosition, true),   // NEW: Smart with randomization
        () => createGreedySolution(composition, teamCount, playersByPosition, true),  // with randomization
        () => createBalancedSolution(composition, teamCount, playersByPosition, true), // with randomization
        () => createSnakeDraftSolution(composition, teamCount, playersByPosition, true), // with randomization
        () => createRandomSolution(composition, teamCount, playersByPosition)
    ];

    return strategies.map(strategy => strategy());
}

/**
 * Create a greedy solution by assigning strongest players first
 * @param {boolean} randomize - Add randomization to avoid identical solutions
 */
function createGreedySolution(composition, teamCount, playersByPosition, randomize = false) {
    const teams = Array.from({ length: teamCount }, () => []);
    const usedIds = new Set();

    const positionPriority = ['MB', 'S', 'L', 'OPP', 'OH'];
    // Randomize position order if requested
    const positionOrder = positionPriority
        .map(pos => [pos, composition[pos]])
        .filter(([, count]) => count && count > 0);

    if (randomize) {
        // Shuffle position order for diversity
        for (let i = positionOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positionOrder[i], positionOrder[j]] = [positionOrder[j], positionOrder[i]];
        }
    }

    positionOrder.forEach(([position, neededCount]) => {
        const players = (playersByPosition[position] || [])
            .filter(p => !usedIds.has(p.id))
            .sort((a, b) => {
                // Add noise to ratings if randomizing
                const aRating = randomize ? a.positionRating + (Math.random() - 0.5) * 50 : a.positionRating;
                const bRating = randomize ? b.positionRating + (Math.random() - 0.5) * 50 : b.positionRating;
                return bRating - aRating;
            });

        let playerIdx = 0;
        for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
            for (let slot = 0; slot < neededCount; slot++) {
                if (playerIdx < players.length) {
                    teams[teamIdx].push(players[playerIdx]);
                    usedIds.add(players[playerIdx].id);
                    playerIdx++;
                } else {
                    const warningKey = `greedy-${position}`;
                    if (warningTracker.shouldWarn(warningKey)) {
                        console.warn(`Warning: Not enough ${position} players for team ${teamIdx + 1} (greedy allocation)`);
                    }
                }
            }
        }
    });
    return teams;
}

/**
 * Create a balanced solution by round-robin assignment
 * @param {boolean} randomize - Add randomization to avoid identical solutions
 */
function createBalancedSolution(composition, teamCount, playersByPosition, randomize = false) {
    const teams = Array.from({ length: teamCount }, () => []);
    const usedIds = new Set();

    const positionPriority = ['MB', 'S', 'L', 'OPP', 'OH'];
    const positionOrder = positionPriority
        .map(pos => [pos, composition[pos]])
        .filter(([, count]) => count && count > 0);

    if (randomize) {
        // Shuffle position order for diversity
        for (let i = positionOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positionOrder[i], positionOrder[j]] = [positionOrder[j], positionOrder[i]];
        }
    }

    positionOrder.forEach(([position, neededCount]) => {
        const players = (playersByPosition[position] || [])
            .filter(p => !usedIds.has(p.id))
            .sort((a, b) => {
                // Add noise to ratings if randomizing
                const aRating = randomize ? a.positionRating + (Math.random() - 0.5) * 40 : a.positionRating;
                const bRating = randomize ? b.positionRating + (Math.random() - 0.5) * 40 : b.positionRating;
                return bRating - aRating;
            });

        let playerIdx = 0;

        // Optionally start from a random round offset for more diversity
        const startOffset = randomize ? Math.floor(Math.random() * teamCount) : 0;

        for (let round = 0; round < neededCount; round++) {
            for (let i = 0; i < teamCount; i++) {
                const teamIdx = (i + startOffset) % teamCount;
                if (playerIdx < players.length) {
                    teams[teamIdx].push(players[playerIdx]);
                    usedIds.add(players[playerIdx].id);
                    playerIdx++;
                } else {
                    const warningKey = `balanced-${position}`;
                    if (warningTracker.shouldWarn(warningKey)) {
                        console.warn(`Warning: Not enough ${position} players for team ${teamIdx + 1} (balanced allocation)`);
                    }
                }
            }
        }
    });
    return teams;
}

/**
 * Create a snake draft solution (1→2→3→3→2→1)
 * @param {boolean} randomize - Add randomization to avoid identical solutions
 */
export function createSnakeDraftSolution(composition, teamCount, playersByPosition, randomize = false) {
    const teams = Array.from({ length: teamCount }, () => []);
    const usedIds = new Set();

    const positionPriority = ['MB', 'S', 'L', 'OPP', 'OH'];
    const positionOrder = positionPriority
        .map(pos => [pos, composition[pos]])
        .filter(([, count]) => count && count > 0);

    if (randomize) {
        // Shuffle position order for diversity
        for (let i = positionOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positionOrder[i], positionOrder[j]] = [positionOrder[j], positionOrder[i]];
        }
    }

    positionOrder.forEach(([position, neededCount]) => {
        const players = (playersByPosition[position] || [])
            .filter(p => !usedIds.has(p.id))
            .sort((a, b) => {
                // Prioritize players who can only play this position
                const aSpecialist = a.positions.length === 1 ? 1 : 0;
                const bSpecialist = b.positions.length === 1 ? 1 : 0;
                if (aSpecialist !== bSpecialist) return bSpecialist - aSpecialist;

                // Then sort by rating with optional noise
                const aRating = randomize ? a.positionRating + (Math.random() - 0.5) * 30 : a.positionRating;
                const bRating = randomize ? b.positionRating + (Math.random() - 0.5) * 30 : b.positionRating;
                return bRating - aRating;
            });

        let playerIdx = 0;

        // TRUE SNAKE DRAFT: 1→2→3→3→2→1→1→2→3...
        // Optionally start with reverse order for more diversity
        let round = randomize && Math.random() > 0.5 ? 1 : 0;

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
                const warningKey = `snake-exceeded-${position}`;
                if (warningTracker.shouldWarn(warningKey)) {
                    console.warn(`Warning: Snake draft exceeded 100 rounds for ${position}`);
                }
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
                    const warningKey = `random-${position}`;
                    if (warningTracker.shouldWarn(warningKey)) {
                        console.warn(`Warning: Not enough ${position} players for team ${teamIdx + 1} (random allocation)`);
                    }
                }
            }
        }
    });

    return teams;
}
