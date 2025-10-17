/**
 * TeamOptimizerService - Team balancing with advanced algorithms
 * Uses a hybrid approach of Genetic Algorithm, Simulated Annealing, and Tabu Search.
 * Enhanced with a hyper-heuristic layer for adaptive operator selection across all algorithms.
 * Refactored for stateless operation and external configuration.
 */
import eloService from './EloService.js';

// A simple deep merge utility to handle configuration
function _deepMerge(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            _deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

/**
 * Manages the selection and rewarding of different heuristic operators.
 * Uses a credit-assignment system to adaptively choose the best low-level heuristic.
 */
class HeuristicManager {
    constructor(operators, rewardMultiplier = 1.0) {
        this.operators = operators; // e.g., [{ name: 'simpleSwap', function: ... }]
        this.scores = Object.fromEntries(operators.map(op => [op.name, 1.0]));
        this.REWARD_MULTIPLIER = rewardMultiplier;
        this.DECAY_RATE = 0.98;
        this.MIN_SCORE = 0.1;
    }

    selectOperator() {
        const totalScore = Object.values(this.scores).reduce((sum, score) => sum + score, 0);
        let pick = Math.random() * totalScore;
        for (const operator of this.operators) {
            pick -= this.scores[operator.name];
            if (pick <= 0) return operator;
        }
        return this.operators[0]; // Fallback
    }

    updateScore(operatorName, improvement) {
        for (const name in this.scores) {
            this.scores[name] = Math.max(this.MIN_SCORE, this.scores[name] * this.DECAY_RATE);
        }
        if (improvement > 0) {
            this.scores[operatorName] += (1 + Math.log1p(improvement)) * this.REWARD_MULTIPLIER;
        }
    }
}

class TeamOptimizerService {
    constructor(userConfig = {}) {
        this.positions = { 'S': 'Setter', 'OPP': 'Opposite', 'OH': 'Outside Hitter', 'MB': 'Middle Blocker', 'L': 'Libero' };
        
        const defaultConfig = {
            useGeneticAlgorithm: true,
            useTabuSearch: true,
            useSimulatedAnnealing: true,
            adaptiveParameters: { positionBalanceWeight: 0.3, varianceWeight: 0.5 },
            algorithms: {
                geneticAlgorithm: {
                    populationSize: 20, generationCount: 100, mutationRate: 0.15, crossoverRate: 0.7,
                    elitismCount: 2, tournamentSize: 3, maxStagnation: 20, useHyperHeuristic: true
                },
                tabuSearch: {
                    tabuTenure: 50, iterations: 5000, neighborCount: 20, aspirationCriteria: true,
                    diversification: { enabled: true, frequency: 1000 }, useHyperHeuristic: true
                },
                simulatedAnnealing: {
                    initialTemperature: 1000, coolingRate: 0.995, iterations: 50000,
                    reheatEnabled: true, reheatTemperature: 500, reheatIterations: 10000,
                    equilibriumIterations: 100, useHyperHeuristic: true
                },
                localSearch: {
                    iterations: 1000, searchStrategy: 'first-improvement', neighborhoodSize: 10,
                    perturbationEnabled: true, perturbationStrength: 0.1, useHyperHeuristic: true
                }
            }
        };

        this.config = _deepMerge(defaultConfig, userConfig);
    }

    async optimize(composition, teamCount, players) {
        const validation = this.enhancedValidate(composition, teamCount, players);
        if (!validation.isValid) throw new Error(validation.errors.map(e => e.message).join(', '));

        this._adaptParameters(teamCount, players.length);
        const playersByPosition = this.groupByPosition(players);
        const positions = Object.keys(composition).filter(pos => composition[pos] > 0);
        const initialSolutions = this.generateInitialSolutions(composition, teamCount, playersByPosition);

        const runContext = {
            stats: this._createEmptyStats(),
            config: this.config,
            // Create a shared manager for neighborhood-based algorithms
            neighborhoodHeuristicManager: new HeuristicManager([
                { name: 'simpleSwap', function: this.performSwap.bind(this) },
                { name: 'adaptiveSwap', function: this.performAdaptiveSwap.bind(this) },
                { name: 'doubleSwap', function: this.performDoubleSwap.bind(this) }
            ], 2.0) // Higher reward for neighborhood algos
        };
        
        const promises = [];
        const names = [];

        if (this.config.useGeneticAlgorithm) {
            promises.push(this.runGeneticAlgorithm(initialSolutions, composition, teamCount, playersByPosition, positions, runContext));
            names.push('Genetic Algorithm');
        }
        if (this.config.useTabuSearch) {
            promises.push(this.runTabuSearch(initialSolutions[0], positions, runContext));
            names.push('Tabu Search');
        }
        if (this.config.useSimulatedAnnealing) {
            promises.push(this.runSimulatedAnnealing(initialSolutions[0], positions, runContext));
            names.push('Simulated Annealing');
        }
        // Fallback removed for brevity, assuming at least one is true

        const results = await Promise.all(promises);
        const scores = results.map(r => this.evaluateSolution(r));
        const bestIdx = scores.indexOf(Math.min(...scores));
        
        let bestTeams = await this.runLocalSearch(results[bestIdx], positions, runContext);

        bestTeams.sort((a, b) => eloService.calculateTeamStrength(b).totalRating - eloService.calculateTeamStrength(a).totalRating);

        return {
            teams: bestTeams,
            balance: eloService.evaluateBalance(bestTeams),
            unusedPlayers: this.getUnusedPlayers(bestTeams, players),
            validation,
            algorithm: names[bestIdx],
            statistics: this._getAlgorithmStatistics(runContext)
        };
    }

    // --- ALGORITHMS ---

    async runGeneticAlgorithm(initialPop, composition, teamCount, playersByPosition, positions, runContext) {
        const config = runContext.config.algorithms.geneticAlgorithm;
        const hManager = config.useHyperHeuristic ? new HeuristicManager([
            { name: 'smartMutate', function: this.smartMutate.bind(this) },
            { name: 'disruptiveMutate', function: this.disruptiveMutate.bind(this) }
        ]) : null;

        let population = [...initialPop];
        while (population.length < config.populationSize) {
            population.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }

        let bestScore = Infinity;
        let stagnationCount = 0;

        for (let gen = 0; gen < config.generationCount; gen++) {
            runContext.stats.geneticAlgorithm.generations = gen + 1;
            
            let scored = population.map(i => ({ teams: i, score: this.evaluateSolution(i) })).sort((a, b) => a.score - b.score);

            if (scored[0].score < bestScore) {
                bestScore = scored[0].score;
                stagnationCount = 0;
                runContext.stats.geneticAlgorithm.improvements++;
            } else {
                stagnationCount++;
            }

            const newPopulation = scored.slice(0, config.elitismCount).map(s => s.teams);

            while (newPopulation.length < config.populationSize) {
                const parent1 = this.tournamentSelection(scored, config.tournamentSize);
                const child = (Math.random() < config.crossoverRate)
                    ? this.enhancedCrossover(parent1, this.tournamentSelection(scored, config.tournamentSize), composition)
                    : this._fastCloneTeams(parent1);
                newPopulation.push(child);
            }

            for (let i = config.elitismCount; i < newPopulation.length; i++) {
                if (Math.random() < config.mutationRate) {
                    if (hManager) {
                        const oldScore = this.evaluateSolution(newPopulation[i]);
                        const operator = hManager.selectOperator();
                        operator.function(newPopulation[i], positions);
                        const newScore = this.evaluateSolution(newPopulation[i]);
                        hManager.updateScore(operator.name, oldScore - newScore);
                    } else {
                        this.smartMutate(newPopulation[i], positions);
                    }
                }
            }
            
            population = newPopulation;
            if (stagnationCount++ >= config.maxStagnation) {
                this.diversifyPopulation(population, composition, teamCount, playersByPosition);
                stagnationCount = 0;
            }
            if (gen % 10 === 0) await new Promise(r => setTimeout(r, 0));
        }
        return population.map(p => ({ teams: p, score: this.evaluateSolution(p) })).sort((a, b) => a.score - b.score)[0].teams;
    }

    async runSimulatedAnnealing(initialTeams, positions, runContext) {
        const config = runContext.config.algorithms.simulatedAnnealing;
        const hManager = config.useHyperHeuristic ? runContext.neighborhoodHeuristicManager : null;

        let current = this._fastCloneTeams(initialTeams), best = this._fastCloneTeams(initialTeams);
        let currentScore = this.evaluateSolution(current), bestScore = currentScore;
        let temp = config.initialTemperature, iterSinceImprovement = 0, acceptedInEquilibrium = 0;

        for (let iter = 0; iter < config.iterations; iter++) {
            runContext.stats.simulatedAnnealing.iterations = iter + 1;
            runContext.stats.simulatedAnnealing.temperature = temp;
            
            const neighbor = this._fastCloneTeams(current);
            let operatorName = 'default';

            if (hManager) {
                const operator = hManager.selectOperator();
                operator.function(neighbor, positions);
                operatorName = operator.name;
            } else {
                this.performAdaptiveSwap(neighbor, positions); // Default behavior
            }
            
            const neighborScore = this.evaluateSolution(neighbor);
            const delta = neighborScore - currentScore;

            if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
                if (hManager) hManager.updateScore(operatorName, currentScore - neighborScore);
                
                current = neighbor;
                currentScore = neighborScore;
                acceptedInEquilibrium++;
                
                if (neighborScore < bestScore) {
                    best = this._fastCloneTeams(neighbor);
                    bestScore = neighborScore;
                    iterSinceImprovement = 0;
                    runContext.stats.simulatedAnnealing.improvements++;
                } else {
                    iterSinceImprovement++;
                }
            }

            if (iter > 0 && iter % config.equilibriumIterations === 0) {
                temp *= config.coolingRate;
            }
            
            if (config.reheatEnabled && iterSinceImprovement > config.reheatIterations && temp < config.reheatTemperature) {
                temp = config.reheatTemperature;
                iterSinceImprovement = 0;
            }
            
            if (iter % 5000 === 0) await new Promise(r => setTimeout(r, 0));
        }
        return best;
    }

    async runTabuSearch(initialTeams, positions, runContext) {
        const config = runContext.config.algorithms.tabuSearch;
        const hManager = config.useHyperHeuristic ? runContext.neighborhoodHeuristicManager : null;
        
        let current = this._fastCloneTeams(initialTeams), best = this._fastCloneTeams(initialTeams);
        let currentScore = this.evaluateSolution(current), bestScore = currentScore;
        const tabuList = [];
        let iterSinceImprovement = 0;

        for (let iter = 0; iter < config.iterations; iter++) {
            runContext.stats.tabuSearch.iterations = iter + 1;
            
            const neighborsMeta = this.generateNeighborhood(current, positions, config.neighborCount, hManager);
            
            let bestNeighbor = null, bestNeighborScore = Infinity, bestNeighborOp = null;
            
            for (const { neighbor, operatorName } of neighborsMeta) {
                const hash = this.hashSolution(neighbor), score = this.evaluateSolution(neighbor);
                const isTabu = tabuList.includes(hash);
                const satisfiesAspiration = config.aspirationCriteria && score < bestScore;
                
                if ((!isTabu || satisfiesAspiration) && score < bestNeighborScore) {
                    bestNeighbor = neighbor; bestNeighborScore = score; bestNeighborOp = operatorName;
                }
            }
            
            if (bestNeighbor) {
                if (hManager) hManager.updateScore(bestNeighborOp, currentScore - bestNeighborScore);
                current = bestNeighbor;
                currentScore = bestNeighborScore;
                
                tabuList.push(this.hashSolution(current));
                if (tabuList.length > config.tabuTenure) tabuList.shift();
                
                if (currentScore < bestScore) {
                    best = this._fastCloneTeams(current); bestScore = currentScore;
                    iterSinceImprovement = 0;
                    runContext.stats.tabuSearch.improvements++;
                } else iterSinceImprovement++;
            }

            if (config.diversification.enabled && iterSinceImprovement > config.diversification.frequency) {
                current = this.createRandomSolution(composition, teamCount, playersByPosition);
                currentScore = this.evaluateSolution(current);
                iterSinceImprovement = 0;
            }
            
            if (iter % 500 === 0) await new Promise(r => setTimeout(r, 0));
        }
        return best;
    }

    async runLocalSearch(teams, positions, runContext, maxIterations = null) {
        const config = runContext.config.algorithms.localSearch;
        const hManager = config.useHyperHeuristic ? runContext.neighborhoodHeuristicManager : null;
        const iterations = maxIterations || config.iterations;
        
        let current = this._fastCloneTeams(teams), improved = true, iter = 0;
        
        while (improved && iter < iterations) {
            iter++;
            runContext.stats.localSearch.iterations = iter;

            const neighborhoodMeta = this.generateNeighborhood(current, positions, config.neighborhoodSize, hManager);
            let bestNeighbor = null, bestScore = this.evaluateSolution(current);

            for (const { neighbor, operatorName } of neighborhoodMeta) {
                const neighborScore = this.evaluateSolution(neighbor);
                if (neighborScore < bestScore) {
                    bestNeighbor = neighbor;
                    bestScore = neighborScore;
                    if (config.searchStrategy === 'first-improvement') break;
                }
            }

            if (bestNeighbor) {
                current = bestNeighbor;
                improved = true;
                runContext.stats.localSearch.improvements++;
            } else {
                improved = false;
            }
            
            if (config.perturbationEnabled && !improved) {
                this.perturbSolution(current, positions, config.perturbationStrength);
                improved = true;
            }
            if (iter % 100 === 0) await new Promise(r => setTimeout(r, 0));
        }
        return current;
    }

    // --- HEURISTIC OPERATORS (Low-Level) ---

    performSwap(teams, positions) {
        if (teams.length < 2) return false;
        const t1 = Math.floor(Math.random() * teams.length);
        let t2;
        do { t2 = Math.floor(Math.random() * teams.length); } while (t1 === t2);

        const pos = positions[Math.floor(Math.random() * positions.length)];
        const t1Players = teams[t1].filter(p => p.assignedPosition === pos);
        const t2Players = teams[t2].filter(p => p.assignedPosition === pos);
        
        if (t1Players.length > 0 && t2Players.length > 0) {
            const p1 = t1Players[Math.floor(Math.random() * t1Players.length)];
            const p2 = t2Players[Math.floor(Math.random() * t2Players.length)];
            
            const idx1 = teams[t1].findIndex(p => p.id === p1.id);
            const idx2 = teams[t2].findIndex(p => p.id === p2.id);
            
            [teams[t1][idx1], teams[t2][idx2]] = [teams[t2][idx2], teams[t1][idx1]];
            return true;
        }
        return false;
    }

    performAdaptiveSwap(teams, positions) {
        const teamStrengths = teams.map((team, idx) => ({ 
            idx, 
            strength: eloService.calculateTeamStrength(team).totalRating 
        })).sort((a, b) => b.strength - a.strength);
        
        const strongestIdx = teamStrengths[0].idx;
        const weakestIdx = teamStrengths[teamStrengths.length - 1].idx;
        
        if (strongestIdx !== weakestIdx && Math.random() < 0.7) {
            const position = positions[Math.floor(Math.random() * positions.length)];
            
            const strongPlayers = teams[strongestIdx].filter(p => p.assignedPosition === position);
            const weakPlayers = teams[weakestIdx].filter(p => p.assignedPosition === position);
            
            if (strongPlayers.length > 0 && weakPlayers.length > 0) {
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
                    return true;
                }
            }
        }
        return this.performSwap(teams, positions);
    }
    
    /** New operator: Swaps two players from the strongest team with two from the weakest */
    performDoubleSwap(teams, positions) {
        if (teams.length < 2) return false;
        const teamStrengths = teams.map((team, idx) => ({ 
            idx, 
            strength: eloService.calculateTeamStrength(team).totalRating 
        })).sort((a, b) => b.strength - a.strength);
        const t1 = teamStrengths[0].idx, t2 = teamStrengths[teamStrengths.length - 1].idx;
        if (t1 === t2) return this.performSwap(teams, positions); // Fallback

        // Find two distinct positions to swap
        const pos1 = positions[Math.floor(Math.random() * positions.length)];
        let pos2;
        do { pos2 = positions[Math.floor(Math.random() * positions.length)]; } while (positions.length > 1 && pos1 === pos2);
        
        const t1p1 = teams[t1].find(p => p.assignedPosition === pos1);
        const t2p1 = teams[t2].find(p => p.assignedPosition === pos1);
        const t1p2 = teams[t1].find(p => p.assignedPosition === pos2);
        const t2p2 = teams[t2].find(p => p.assignedPosition === pos2);

        if (t1p1 && t2p1) {
            const idx1 = teams[t1].findIndex(p => p.id === t1p1.id), idx2 = teams[t2].findIndex(p => p.id === t2p1.id);
            [teams[t1][idx1], teams[t2][idx2]] = [teams[t2][idx2], teams[t1][idx1]];
        }
        if (t1p2 && t2p2) {
            const idx1 = teams[t1].findIndex(p => p.id === t1p2.id), idx2 = teams[t2].findIndex(p => p.id === t2p2.id);
            [teams[t1][idx1], teams[t2][idx2]] = [teams[t2][idx2], teams[t1][idx1]];
        }
        return true;
    }

    smartMutate(teams, positions) {
        const positionImbalances = positions.map(pos => {
            const posStrengths = teams.map(team => 
                team.filter(p => p.assignedPosition === pos)
                    .reduce((sum, p) => sum + p.positionRating, 0)
            );
            return { 
                pos, 
                imbalance: Math.max(...posStrengths) - Math.min(...posStrengths) 
            };
        }).sort((a, b) => b.imbalance - a.imbalance);
        
        const swapCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < swapCount; i++) {
            const useProblematic = Math.random() < 0.6;
            const position = useProblematic && positionImbalances.length > 0 
                ? positionImbalances[0].pos 
                : positions[Math.floor(Math.random() * positions.length)];
            
            this.performAdaptiveSwap(teams, [position]);
        }
    }

    /** New GA mutation operator: more disruptive */
    disruptiveMutate(teams, positions) { 
        this.performDoubleSwap(teams, positions); 
    }

    // --- NEIGHBORHOOD GENERATION ---

    generateNeighborhood(teams, positions, size, hManager) {
        const neighborhood = [];
        for (let i = 0; i < size; i++) {
            const neighbor = this._fastCloneTeams(teams);
            let operatorName = 'default';
            if (hManager) {
                const operator = hManager.selectOperator();
                operator.function(neighbor, positions);
                operatorName = operator.name;
            } else {
                this.performAdaptiveSwap(neighbor, positions); // Default
            }
            neighborhood.push({ neighbor, operatorName });
        }
        return neighborhood;
    }

    // --- SOLUTION GENERATION, EVALUATION, AND HELPERS ---

    /**
     * Evaluate solution quality (lower is better)
     */
    evaluateSolution(teams) {
        if (!teams || teams.length === 0) return Infinity;

        const teamStrengths = teams.map(team => 
            eloService.calculateTeamStrength(team).totalRating
        );

        const balance = Math.max(...teamStrengths) - Math.min(...teamStrengths);
        
        const avg = teamStrengths.reduce((a, b) => a + b, 0) / teamStrengths.length;
        const variance = teamStrengths.reduce((sum, strength) => 
            sum + Math.pow(strength - avg, 2), 0) / teamStrengths.length;

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

        return balance * 1.0 + Math.sqrt(variance) * this.config.adaptiveParameters.varianceWeight + 
               positionImbalance * this.config.adaptiveParameters.positionBalanceWeight;
    }

    generateInitialSolutions(composition, teamCount, playersByPosition) {
        const candidates = [];
        
        candidates.push(this.createBalancedSolution(composition, teamCount, playersByPosition));
        candidates.push(this.createSnakeDraftSolution(composition, teamCount, playersByPosition));
        
        for (let i = 0; i < 3; i++) {
            candidates.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }
        
        candidates.push(this.createPositionFocusedSolution(composition, teamCount, playersByPosition));
        
        return candidates;
    }

    createBalancedSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        
        const positionOrder = Object.entries(composition)
            .filter(([pos, count]) => count > 0)
            .sort((a, b) => {
                const aAvail = (playersByPosition[a[0]] || []).length;
                const bAvail = (playersByPosition[b[0]] || []).length;
                const aRatio = aAvail / (a[1] * teamCount);
                const bRatio = bAvail / (b[1] * teamCount);
                return aRatio - bRatio;
            });
        
        positionOrder.forEach(([position, neededCount]) => {
            const totalNeeded = neededCount * teamCount;
            const players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating)
                .slice(0, totalNeeded);
            
            for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                for (let i = 0; i < neededCount; i++) {
                    const playerIdx = teamIdx * neededCount + i;
                    if (playerIdx < players.length) {
                        teams[teamIdx].push(players[playerIdx]);
                        usedIds.add(players[playerIdx].id);
                    }
                }
            }
        });
        
        return teams;
    }

    createSnakeDraftSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();

        const positionOrder = Object.entries(composition)
            .filter(([pos, count]) => count > 0)
            .sort((a, b) => {
                const aAvail = (playersByPosition[a[0]] || []).length;
                const bAvail = (playersByPosition[b[0]] || []).length;
                const aRatio = aAvail / (a[1] * teamCount);
                const bRatio = bAvail / (b[1] * teamCount);
                return aRatio - bRatio;
            });

        positionOrder.forEach(([position, neededCount]) => {
            const totalNeeded = neededCount * teamCount;
            const players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating)
                .slice(0, totalNeeded);

            let playerIndex = 0;
            for (let round = 0; round < neededCount; round++) {
                const isEvenRound = round % 2 === 0;
                
                for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                    if (playerIndex < players.length) {
                        const actualTeamIdx = isEvenRound ? teamIdx : (teamCount - 1 - teamIdx);
                        teams[actualTeamIdx].push(players[playerIndex]);
                        usedIds.add(players[playerIndex].id);
                        playerIndex++;
                    }
                }
            }
        });

        return teams;
    }

    createRandomSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();

        const positionOrder = Object.entries(composition)
            .filter(([pos, count]) => count > 0)
            .sort((a, b) => {
                const aAvail = (playersByPosition[a[0]] || []).length;
                const bAvail = (playersByPosition[b[0]] || []).length;
                const aRatio = aAvail / (a[1] * teamCount);
                const bRatio = bAvail / (b[1] * teamCount);
                return aRatio - bRatio;
            });

        positionOrder.forEach(([position, neededCount]) => {
            const totalNeeded = neededCount * teamCount;
            let players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .slice(0, totalNeeded);
            
            for (let i = players.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [players[i], players[j]] = [players[j], players[i]];
            }

            for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                for (let i = 0; i < neededCount; i++) {
                    const playerIdx = teamIdx * neededCount + i;
                    if (playerIdx < players.length) {
                        teams[teamIdx].push(players[playerIdx]);
                        usedIds.add(players[playerIdx].id);
                    }
                }
            }
        });

        return teams;
    }

    createPositionFocusedSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        
        const positionPriority = ['S', 'OPP', 'OH', 'MB', 'L'];
        const positionOrder = Object.entries(composition)
            .filter(([pos, count]) => count > 0)
            .sort((a, b) => {
                const aPriority = positionPriority.indexOf(a[0]);
                const bPriority = positionPriority.indexOf(b[0]);
                return aPriority - bPriority;
            });
        
        positionOrder.forEach(([position, neededCount]) => {
            const totalNeeded = neededCount * teamCount;
            const players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating)
                .slice(0, totalNeeded);
            
            for (let i = 0; i < neededCount; i++) {
                for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                    const playerIdx = teamIdx * neededCount + i;
                    if (playerIdx < players.length) {
                        teams[teamIdx].push(players[playerIdx]);
                        usedIds.add(players[playerIdx].id);
                    }
                }
            }
        });
        
        return teams;
    }

    enhancedCrossover(parent1, parent2, composition) {
        const child = Array.from({ length: parent1.length }, () => []);
        const usedIds = new Set();
        
        const splitPoint = Math.floor(parent1.length / 2);
        
        for (let i = 0; i < splitPoint; i++) {
            parent1[i].forEach(player => {
                child[i].push({...player});
                usedIds.add(player.id);
            });
        }
        
        for (let i = splitPoint; i < parent2.length; i++) {
            parent2[i].forEach(player => {
                if (!usedIds.has(player.id)) {
                    child[i].push({...player});
                    usedIds.add(player.id);
                }
            });
        }
        
        parent2.forEach(team => {
            team.forEach(player => {
                if (!usedIds.has(player.id)) {
                    let placed = false;
                    for (let i = 0; i < child.length; i++) {
                        const posCount = child[i].filter(p => 
                            p.assignedPosition === player.assignedPosition
                        ).length;
                        const targetCount = composition[player.assignedPosition] || 0;
                        
                        if (posCount < targetCount) {
                            child[i].push({...player});
                            usedIds.add(player.id);
                            placed = true;
                            break;
                        }
                    }
                    
                    if (!placed) {
                        const teamSizes = child.map(t => t.length);
                        const minSize = Math.min(...teamSizes);
                        const targetTeam = teamSizes.indexOf(minSize);
                        child[targetTeam].push({...player});
                        usedIds.add(player.id);
                    }
                }
            });
        });
        
        return child;
    }

    tournamentSelection(scoredPopulation, tournamentSize) {
        let best = null;
        for (let i = 0; i < tournamentSize; i++) {
            const candidate = scoredPopulation[Math.floor(Math.random() * scoredPopulation.length)];
            if (!best || candidate.score < best.score) {
                best = candidate;
            }
        }
        return best.teams;
    }

    diversifyPopulation(population, composition, teamCount, playersByPosition) {
        const keepCount = Math.floor(population.length * 0.3);
        for (let i = keepCount; i < population.length; i++) {
            if (Math.random() < 0.7) {
                population[i] = this.createRandomSolution(composition, teamCount, playersByPosition);
            } else {
                population[i] = this.createPositionFocusedSolution(composition, teamCount, playersByPosition);
            }
        }
    }

    perturbSolution(teams, positions, strength) {
        const perturbationCount = Math.max(1, Math.floor(teams.length * positions.length * strength));
        
        for (let i = 0; i < perturbationCount; i++) {
            this.performSwap(teams, positions);
        }
    }

    enhancedValidate(composition, teamCount, players) {
        const errors = [];
        const warnings = [];
        
        const playersByPosition = this.groupByPosition(players);
        let totalNeeded = 0;
        
        Object.entries(composition).forEach(([position, count]) => {
            const needed = count * teamCount;
            const available = playersByPosition[position]?.length || 0;
            
            totalNeeded += needed;
            
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

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            totalNeeded,
            totalAvailable: players.length,
            unusedPlayers: players.length - totalNeeded,
            playersPerTeam: totalNeeded / teamCount
        };
    }

    groupByPosition(players) {
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

    getUnusedPlayers(teams, allPlayers) {
        const usedIds = new Set();
        teams.forEach(team => {
            team.forEach(player => {
                usedIds.add(player.id);
            });
        });

        return allPlayers.filter(p => !usedIds.has(p.id));
    }

    hashSolution(teams) {
        return teams.map(team => 
            team.map(p => p.id).sort().join(',')
        ).join('|');
    }

    _fastCloneTeams(teams) {
        return teams.map(team => team.map(player => ({ ...player })));
    }

    _adaptParameters(teamCount, totalPlayers) {
        const complexity = teamCount * totalPlayers;
        const gaConfig = this.config.algorithms.geneticAlgorithm;
        const tsConfig = this.config.algorithms.tabuSearch;
        const saConfig = this.config.algorithms.simulatedAnnealing;
        const lsConfig = this.config.algorithms.localSearch;
        
        if (complexity < 50) {
            gaConfig.generationCount = 50;
            tsConfig.iterations = 2000;
            saConfig.iterations = 10000;
            lsConfig.iterations = 500;
        } else if (complexity < 200) {
            gaConfig.generationCount = 100;
            tsConfig.iterations = 5000;
            saConfig.iterations = 30000;
            lsConfig.iterations = 1000;
        } else {
            gaConfig.generationCount = 150;
            tsConfig.iterations = 8000;
            saConfig.iterations = 50000;
            lsConfig.iterations = 1500;
        }
    }

    _createEmptyStats() {
        return {
            geneticAlgorithm: { generations: 0, improvements: 0 },
            tabuSearch: { iterations: 0, improvements: 0 },
            simulatedAnnealing: { iterations: 0, improvements: 0, temperature: 0 },
            localSearch: { iterations: 0, improvements: 0 }
        };
    }

    _getAlgorithmStatistics(runContext) {
        return {
            geneticAlgorithm: { 
                ...runContext.stats.geneticAlgorithm, 
                config: runContext.config.algorithms.geneticAlgorithm 
            },
            tabuSearch: { 
                ...runContext.stats.tabuSearch, 
                config: runContext.config.algorithms.tabuSearch 
            },
            simulatedAnnealing: { 
                ...runContext.stats.simulatedAnnealing, 
                config: runContext.config.algorithms.simulatedAnnealing 
            },
            localSearch: { 
                ...runContext.stats.localSearch, 
                config: runContext.config.algorithms.localSearch 
            }
        };
    }
}

export default TeamOptimizerService;
