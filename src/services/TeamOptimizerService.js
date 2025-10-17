/**
 * TeamOptimizerService - Adapter for new TeamOptimizer
 * Maintains compatibility with existing application architecture
 */
import eloService from './EloService.js';

// Simple EventEmitter implementation for browser
class SimpleEventEmitter {
    constructor() {
        this.events = new Map();
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => callback(data));
        }
    }

    off(event, callback) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
}

// Optimization strategies
const OPTIMIZATION_STRATEGIES = {
    BALANCED: 'balanced',
    COMPETITIVE: 'competitive',
    DEVELOPMENTAL: 'developmental',
    POSITION_FOCUSED: 'position_focused'
};

const POSITION_GROUPS = {
    'S': { name: 'Setter', weight: 1.3, priority: 1 },
    'OPP': { name: 'Opposite', weight: 1.2, priority: 2 },
    'OH': { name: 'Outside Hitter', weight: 1.1, priority: 3 },
    'MB': { name: 'Middle Blocker', weight: 1.0, priority: 4 },
    'L': { name: 'Libero', weight: 0.9, priority: 5 }
};

// ========== PLAYER ADAPTER ==========
class PlayerAdapter {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.positions = data.positions || [];
        this.ratings = data.ratings || {};
        this.comparisons = data.comparisons || {};
        this.comparedWith = data.comparedWith || {};
        this.createdAt = data.createdAt;
    }

    canPlay(position) {
        return this.positions.includes(position);
    }

    getRatingFor(position) {
        return this.ratings[position] || 1500;
    }

    toPlainObject(assignedPosition) {
        return {
            id: this.id,
            name: this.name,
            positions: this.positions,
            ratings: this.ratings,
            comparisons: this.comparisons,
            comparedWith: this.comparedWith,
            createdAt: this.createdAt,
            assignedPosition: assignedPosition,
            positionRating: this.getRatingFor(assignedPosition)
        };
    }
}

// ========== TEAM BUILDER ==========
class TeamBuilder {
    constructor(composition, teamCount, players) {
        this.composition = composition;
        this.teamCount = teamCount;
        this.players = players.map(p => new PlayerAdapter(p));
        this.teams = Array.from({ length: teamCount }, () => []);
    }

    createBalancedSolution() {
        const positions = this.getPositionsByScarcity();
        
        positions.forEach(([position, requiredCount]) => {
            const totalNeeded = requiredCount * this.teamCount;
            const eligiblePlayers = this.players
                .filter(p => p.canPlay(position) && !this.isPlayerAssigned(p.id))
                .sort((a, b) => b.getRatingFor(position) - a.getRatingFor(position))
                .slice(0, totalNeeded);

            eligiblePlayers.forEach((player, index) => {
                const teamIndex = index % this.teamCount;
                this.teams[teamIndex].push(player.toPlainObject(position));
            });
        });

        return this.teams;
    }

    createSnakeDraftSolution() {
        const teams = Array.from({ length: this.teamCount }, () => []);
        const positions = this.getPositionsByScarcity();
        
        positions.forEach(([position, requiredCount]) => {
            const totalNeeded = requiredCount * this.teamCount;
            const eligiblePlayers = this.players
                .filter(p => p.canPlay(position) && !this.isPlayerAssignedInTeams(p.id, teams))
                .sort((a, b) => b.getRatingFor(position) - a.getRatingFor(position))
                .slice(0, totalNeeded);

            for (let round = 0; round < requiredCount; round++) {
                for (let teamIndex = 0; teamIndex < this.teamCount; teamIndex++) {
                    const playerIndex = round * this.teamCount + teamIndex;
                    if (playerIndex < eligiblePlayers.length) {
                        const actualTeamIndex = round % 2 === 0 ? teamIndex : this.teamCount - 1 - teamIndex;
                        teams[actualTeamIndex].push(eligiblePlayers[playerIndex].toPlainObject(position));
                    }
                }
            }
        });

        return teams;
    }

    createRandomSolution() {
        const teams = Array.from({ length: this.teamCount }, () => []);
        const shuffledPlayers = [...this.players].sort(() => Math.random() - 0.5);
        let playerIndex = 0;

        Object.entries(this.composition).forEach(([position, requiredCount]) => {
            for (let teamIdx = 0; teamIdx < this.teamCount; teamIdx++) {
                for (let i = 0; i < requiredCount; i++) {
                    while (playerIndex < shuffledPlayers.length) {
                        const player = shuffledPlayers[playerIndex];
                        playerIndex++;
                        
                        if (player.canPlay(position) && !this.isPlayerAssignedInTeams(player.id, teams)) {
                            teams[teamIdx].push(player.toPlainObject(position));
                            break;
                        }
                    }
                }
            }
        });

        return teams;
    }

    getPositionsByScarcity() {
        return Object.entries(this.composition)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => {
                const [posA, countA] = a;
                const [posB, countB] = b;
                
                const playersA = this.players.filter(p => p.canPlay(posA)).length;
                const playersB = this.players.filter(p => p.canPlay(posB)).length;
                
                const ratioA = playersA / (countA * this.teamCount);
                const ratioB = playersB / (countB * this.teamCount);
                
                return ratioA - ratioB;
            });
    }

    isPlayerAssigned(playerId) {
        return this.teams.some(team => team.some(p => p.id === playerId));
    }

    isPlayerAssignedInTeams(playerId, teams) {
        return teams.some(team => team.some(p => p.id === playerId));
    }
}

// ========== OPTIMIZER ==========
class SimpleOptimizer {
    constructor() {
        this.maxIterations = 5000;
        this.coolingRate = 0.995;
        this.initialTemperature = 1000;
    }

    async optimize(teams, positions) {
        let current = this.cloneTeams(teams);
        let best = this.cloneTeams(teams);
        let currentScore = this.evaluateSolution(current);
        let bestScore = currentScore;
        let temperature = this.initialTemperature;

        for (let iter = 0; iter < this.maxIterations; iter++) {
            const neighbor = this.cloneTeams(current);
            
            if (Math.random() < 0.8) {
                this.performSwap(neighbor, positions);
            } else {
                this.performPositionSwap(neighbor);
            }
            
            const neighborScore = this.evaluateSolution(neighbor);
            const delta = neighborScore - currentScore;
            
            if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
                current = neighbor;
                currentScore = neighborScore;
                
                if (neighborScore < bestScore) {
                    best = this.cloneTeams(neighbor);
                    bestScore = neighborScore;
                }
            }
            
            temperature *= this.coolingRate;
            
            if (iter % 500 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        return best;
    }

    evaluateSolution(teams) {
        const teamStrengths = teams.map(team => 
            team.reduce((sum, player) => sum + player.positionRating, 0)
        );

        const balance = Math.max(...teamStrengths) - Math.min(...teamStrengths);
        
        const avg = teamStrengths.reduce((a, b) => a + b, 0) / teamStrengths.length;
        const variance = teamStrengths.reduce((sum, strength) => 
            sum + Math.pow(strength - avg, 2), 0) / teamStrengths.length;

        return balance * 1.0 + Math.sqrt(variance) * 0.5;
    }

    performSwap(teams, positions) {
        if (teams.length < 2) return;
    
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
            
            if (!p1.positions.includes(pos) || !p2.positions.includes(pos)) {
                return;
            }
            
            const idx1 = teams[t1].findIndex(p => p.id === p1.id);
            const idx2 = teams[t2].findIndex(p => p.id === p2.id);
            
            if (idx1 !== -1 && idx2 !== -1) {
                [teams[t1][idx1], teams[t2][idx2]] = [teams[t2][idx2], teams[t1][idx1]];
            }
        }
    }

    performPositionSwap(teams) {
        if (teams.length === 0) return;
        
        const teamIndex = Math.floor(Math.random() * teams.length);
        const team = teams[teamIndex];
        
        if (team.length < 2) return;
        
        const idx1 = Math.floor(Math.random() * team.length);
        let idx2;
        do {
            idx2 = Math.floor(Math.random() * team.length);
        } while (idx1 === idx2);
        
        const p1 = team[idx1];
        const p2 = team[idx2];
        
        if (p1.positions.includes(p2.assignedPosition) && 
            p2.positions.includes(p1.assignedPosition)) {
            
            const tempPos = p1.assignedPosition;
            const tempRating = p1.positionRating;
            
            p1.assignedPosition = p2.assignedPosition;
            p1.positionRating = p1.ratings[p2.assignedPosition] || 1500;
            
            p2.assignedPosition = tempPos;
            p2.positionRating = p2.ratings[tempPos] || 1500;
        }
    }

    cloneTeams(teams) {
        return teams.map(team => team.map(player => ({ ...player })));
    }
}

// ========== MAIN SERVICE (SINGLETON) ==========
class TeamOptimizerService {
    constructor() {
        this.optimizer = new SimpleOptimizer();
        this.isOptimizing = false;
    }

    async optimize(composition, teamCount, players) {
        if (this.isOptimizing) {
            throw new Error('Optimization already in progress');
        }

        this.isOptimizing = true;

        try {
            this.validate(composition, teamCount, players);

            const builder = new TeamBuilder(composition, teamCount, players);
            
            const candidates = [
                builder.createBalancedSolution(),
                builder.createSnakeDraftSolution(),
                builder.createRandomSolution()
            ];

            const positions = Object.keys(composition).filter(pos => composition[pos] > 0);

            const optimizedCandidates = await Promise.all(
                candidates.map(candidate => this.optimizer.optimize(candidate, positions))
            );

            const scores = optimizedCandidates.map(c => this.optimizer.evaluateSolution(c));
            const bestIdx = scores.indexOf(Math.min(...scores));
            const bestTeams = optimizedCandidates[bestIdx];

            bestTeams.sort((a, b) => {
                const aStrength = a.reduce((sum, p) => sum + p.positionRating, 0);
                const bStrength = b.reduce((sum, p) => sum + p.positionRating, 0);
                return bStrength - aStrength;
            });

            const balance = eloService.evaluateBalance(bestTeams);
            
            const usedIds = new Set();
            bestTeams.forEach(team => team.forEach(p => usedIds.add(p.id)));
            const unusedPlayers = players.filter(p => !usedIds.has(p.id));

            const algorithmNames = ['Balanced Distribution', 'Snake Draft', 'Random Distribution'];

            return {
                teams: bestTeams,
                balance: {
                    isBalanced: balance.isBalanced,
                    maxDifference: balance.maxDifference
                },
                unusedPlayers,
                validation: {
                    isValid: true,
                    errors: [],
                    warnings: []
                },
                algorithm: algorithmNames[bestIdx] + ' + Simulated Annealing'
            };

        } catch (error) {
            throw error;
        } finally {
            this.isOptimizing = false;
        }
    }

    validate(composition, teamCount, players) {
        const errors = [];
        
        if (teamCount < 1) {
            errors.push({ message: 'Must have at least 1 team' });
        }

        let totalNeeded = 0;
        Object.entries(composition).forEach(([position, count]) => {
            const needed = count * teamCount;
            totalNeeded += needed;
            const available = players.filter(p => p.positions && p.positions.includes(position)).length;
            
            if (available < needed) {
                errors.push({
                    position,
                    needed,
                    available,
                    message: `Not enough ${position}s: need ${needed}, have ${available}`
                });
            }
        });

        if (errors.length > 0) {
            throw new Error(errors.map(e => e.message).join(', '));
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: [],
            totalNeeded,
            totalAvailable: players.length
        };
    }
}

export default new TeamOptimizerService();
