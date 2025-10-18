/**
 * Ultimate Team Optimizer Workflow
 */
import eloService from './EloService.js';

class TeamOptimizerService {
    constructor() {
        this.positions = {
            'S': 'Setter',
            'OPP': 'Opposite',
            'OH': 'Outside Hitter',
            'MB': 'Middle Blocker',
            'L': 'Libero'
        };
        
        this.config = {
            useGeneticAlgorithm: true,
            useTabuSearch: true,
            useSimulatedAnnealing: true,
            adaptiveSwapEnabled: true,
            adaptiveParameters: {
                strongWeakSwapProbability: 0.6,
                positionBalanceWeight: 0.3,
                varianceWeight: 0.5
            }
        };
        
        this.algorithmConfigs = {
            geneticAlgorithm: {
                populationSize: 20,
                generationCount: 100,
                mutationRate: 0.2,
                crossoverRate: 0.7,
                elitismCount: 2,
                tournamentSize: 3,
                maxStagnation: 20
            },
            tabuSearch: {
                tabuTenure: 50,
                iterations: 5000,
                neighborCount: 20,
                diversificationFrequency: 1000
            },
            simulatedAnnealing: {
                initialTemperature: 1000,
                coolingRate: 0.995,
                iterations: 50000,
                reheatEnabled: true,
                reheatTemperature: 500,
                reheatIterations: 10000
            },
            localSearch: {
                iterations: 1500,
                neighborhoodSize: 10
            }
        };
        
        this.tabuList = [];
        this.algorithmStats = {};
    }

    async optimize(composition, teamCount, players) {
        const validation = this.enhancedValidate(composition, teamCount, players);
        if (!validation.isValid) {
            throw new Error(validation.errors.map(e => e.message).join(', '));
        }

        this.adaptParameters(teamCount, players.length);
        const playersByPosition = this.groupByPosition(players);
        const positions = Object.keys(composition).filter(pos => composition[pos] > 0);
        
        const candidates = this.generateInitialSolutions(composition, teamCount, playersByPosition);
        this.resetAlgorithmStats();

        const algorithmPromises = [];
        const algorithmNames = [];
        
        if (this.config.useGeneticAlgorithm) {
            algorithmPromises.push(this.runGeneticAlgorithm(candidates, composition, teamCount, playersByPosition, positions));
            algorithmNames.push('Genetic Algorithm');
        }
        if (this.config.useTabuSearch) {
            algorithmPromises.push(this.runTabuSearch(candidates[0], positions));
            algorithmNames.push('Tabu Search');
        }
        if (this.config.useSimulatedAnnealing) {
            algorithmPromises.push(this.runSimulatedAnnealing(candidates[0], positions));
            algorithmNames.push('Simulated Annealing');
        }
        
        if (algorithmPromises.length === 0) {
            this.config.useGeneticAlgorithm = true;
            this.config.useTabuSearch = true;
            return this.optimize(composition, teamCount, players);
        }

        const results = await Promise.all(algorithmPromises);
        const scores = results.map(r => this.evaluateSolution(r));
        const bestIdx = scores.indexOf(Math.min(...scores));
        
        console.log(`Best initial result from: ${algorithmNames[bestIdx]}`);
        const bestTeams = await this.runLocalSearch(results[bestIdx], positions);

        bestTeams.sort((a, b) => {
            const aStrength = eloService.calculateTeamStrength(a).totalRating;
            const bStrength = eloService.calculateTeamStrength(b).totalRating;
            return bStrength - aStrength;
        });

        const balance = eloService.evaluateBalance(bestTeams);
        const unused = this.getUnusedPlayers(bestTeams, players);

        return {
            teams: bestTeams,
            balance,
            unusedPlayers: unused,
            validation,
            algorithm: `${algorithmNames[bestIdx]} + Local Search Refinement`,
            statistics: this.getAlgorithmStatistics()
        };
    }

    performUniversalSwap(teams, positions) {
        const rand = Math.random();
        
        if (rand < 0.25) {
            this.performSwap(teams, positions);
        } 
        else if (rand < 0.5) {
            this.performAdaptiveSwap(teams, positions);
        } 
        else if (rand < 0.75) {
            this.performCrossTeamPositionSwap(teams);
        } 
        else {
            this.performPositionSwap(teams);
        }
    }

    performAdaptiveSwap(teams, positions) {
        const teamStrengths = teams.map((team, idx) => ({
            idx,
            strength: eloService.calculateTeamStrength(team).totalRating
        })).sort((a, b) => b.strength - a.strength);
        
        if (teamStrengths.length < 2) {
            return this.performSwap(teams, positions);
        }
        
        const strongestIdx = teamStrengths[0].idx;
        const weakestIdx = teamStrengths[teamStrengths.length - 1].idx;
        
        if (Math.random() < this.config.adaptiveParameters.strongWeakSwapProbability && strongestIdx !== weakestIdx) {
            const position = positions[Math.floor(Math.random() * positions.length)];
            const strongPlayers = teams[strongestIdx].filter(p => p.assignedPosition === position);
            const weakPlayers = teams[weakestIdx].filter(p => p.assignedPosition === position);
            
            if (strongPlayers.length > 0 && weakPlayers.length > 0) {
                const weakestInStrong = strongPlayers.reduce((min, p) => p.positionRating < min.positionRating ? p : min);
                const strongestInWeak = weakPlayers.reduce((max, p) => p.positionRating > max.positionRating ? p : max);
                const idx1 = teams[strongestIdx].findIndex(p => p.id === weakestInStrong.id);
                const idx2 = teams[weakestIdx].findIndex(p => p.id === strongestInWeak.id);
                
                if (idx1 !== -1 && idx2 !== -1 && weakestInStrong.positionRating < strongestInWeak.positionRating) {
                     [teams[strongestIdx][idx1], teams[weakestIdx][idx2]] = [teams[weakestIdx][idx2], teams[strongestIdx][idx1]];
                     return;
                }
            }
        }
        this.performSwap(teams, positions);
    }
    
    performSwap(teams, positions) {
        if (teams.length < 2 || positions.length === 0) return;
        const t1_idx = Math.floor(Math.random() * teams.length);
        let t2_idx;
        do { t2_idx = Math.floor(Math.random() * teams.length); } while (t1_idx === t2_idx);
        
        const pos = positions[Math.floor(Math.random() * positions.length)];
        const t1Players = teams[t1_idx].filter(p => p.assignedPosition === pos);
        const t2Players = teams[t2_idx].filter(p => p.assignedPosition === pos);
        
        if (t1Players.length > 0 && t2Players.length > 0) {
            const p1 = t1Players[Math.floor(Math.random() * t1Players.length)];
            const p2 = t2Players[Math.floor(Math.random() * t2Players.length)];
            const idx1 = teams[t1_idx].findIndex(p => p.id === p1.id);
            const idx2 = teams[t2_idx].findIndex(p => p.id === p2.id);
            if (idx1 !== -1 && idx2 !== -1) {
                [teams[t1_idx][idx1], teams[t2_idx][idx2]] = [teams[t2_idx][idx2], teams[t1_idx][idx1]];
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
        do { idx2 = Math.floor(Math.random() * team.length); } while (idx1 === idx2);
        
        const p1 = team[idx1];
        const p2 = team[idx2];
        
        if (p1.positions.includes(p2.assignedPosition) && p2.positions.includes(p1.assignedPosition)) {
            const p1_new_pos = p2.assignedPosition;
            const p2_new_pos = p1.assignedPosition;
            
            p1.assignedPosition = p1_new_pos;
            p1.positionRating = p1.ratings[p1_new_pos] || 1500;
            
            p2.assignedPosition = p2_new_pos;
            p2.positionRating = p2.ratings[p2_new_pos] || 1500;
        }
    }

    performCrossTeamPositionSwap(teams) {
        if (teams.length < 2) return;
        const t1_idx = Math.floor(Math.random() * teams.length);
        let t2_idx;
        do { t2_idx = Math.floor(Math.random() * teams.length); } while (t1_idx === t2_idx);

        const team1 = teams[t1_idx];
        const team2 = teams[t2_idx];
        if (team1.length === 0 || team2.length === 0) return;

        const p1_idx = Math.floor(Math.random() * team1.length);
        const p2_idx = Math.floor(Math.random() * team2.length);
        const p1 = team1[p1_idx];
        const p2 = team2[p2_idx];

        if (p1.assignedPosition === p2.assignedPosition) return;
        
        if (p1.positions.includes(p2.assignedPosition) && p2.positions.includes(p1.assignedPosition)) {
            const p1_new_pos = p2.assignedPosition;
            const p2_new_pos = p1.assignedPosition;

            [teams[t1_idx][p1_idx], teams[t2_idx][p2_idx]] = [p2, p1];
            
            p1.assignedPosition = p1_new_pos;
            p1.positionRating = p1.ratings[p1_new_pos] || 1500;
            
            p2.assignedPosition = p2_new_pos;
            p2.positionRating = p2.ratings[p2_new_pos] || 1500;
        }
    }

    cloneTeams(teams) {
        if (!Array.isArray(teams)) {
            console.error('cloneTeams: teams is not an array', teams);
            return [];
        }
        return teams.map(team => {
            if (!Array.isArray(team)) {
                console.error('cloneTeams: team is not an array', team);
                return [];
            }
            return team.map(player => ({ ...player }));
        });
    }

    async runGeneticAlgorithm(initialPop, composition, teamCount, playersByPosition, positions) {
        const config = this.algorithmConfigs.geneticAlgorithm;
        let population = [...initialPop];
        
        while (population.length < config.populationSize) {
            population.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }

        let bestScore = Infinity;
        let stagnationCount = 0;

        for (let gen = 0; gen < config.generationCount; gen++) {
            this.algorithmStats.geneticAlgorithm.generations = gen + 1;
            const scored = population.map(individual => ({
                teams: individual,
                score: this.evaluateSolution(individual)
            })).sort((a, b) => a.score - b.score);

            if (scored[0].score < bestScore) {
                bestScore = scored[0].score;
                stagnationCount = 0;
                this.algorithmStats.geneticAlgorithm.improvements++;
            } else {
                stagnationCount++;
            }

            const newPopulation = scored.slice(0, config.elitismCount).map(s => s.teams);

            while (newPopulation.length < config.populationSize) {
                const parent1 = this.tournamentSelection(scored, config.tournamentSize);
                if (Math.random() < config.crossoverRate) {
                    const parent2 = this.tournamentSelection(scored, config.tournamentSize);
                    newPopulation.push(this.enhancedCrossover(parent1, parent2, composition));
                } else {
                    newPopulation.push(this.cloneTeams(parent1));
                }
            }

            for (let i = config.elitismCount; i < newPopulation.length; i++) {
                if (Math.random() < config.mutationRate) {
                    this.performUniversalSwap(newPopulation[i], positions);
                }
            }

            if (stagnationCount >= config.maxStagnation) {
                for (let i = Math.ceil(population.length / 2); i < population.length; i++) {
                     population[i] = this.createRandomSolution(composition, teamCount, playersByPosition);
                }
                stagnationCount = 0;
            }
            
            population = newPopulation;
            if (gen % 10 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }

        return population.map(ind => ({ teams: ind, score: this.evaluateSolution(ind) }))
            .sort((a, b) => a.score - b.score)[0].teams;
    }
    
    async runTabuSearch(initialTeams, positions) {
        const config = this.algorithmConfigs.tabuSearch;
        let current = this.cloneTeams(initialTeams);
        let best = this.cloneTeams(current);
        let bestScore = this.evaluateSolution(best);
        this.tabuList = [];
        let iterationSinceImprovement = 0;

        for (let iter = 0; iter < config.iterations; iter++) {
            this.algorithmStats.tabuSearch.iterations = iter + 1;
            const neighbors = this.generateNeighborhood(current, positions, config.neighborCount);
            
            let bestNeighbor = null;
            let bestNeighborScore = Infinity;
            
            for (const neighbor of neighbors) {
                const hash = this.hashSolution(neighbor);
                const score = this.evaluateSolution(neighbor);
                if ((!this.tabuList.includes(hash) || score < bestScore) && score < bestNeighborScore) {
                    bestNeighbor = neighbor;
                    bestNeighborScore = score;
                }
            }
            
            if (bestNeighbor) {
                current = bestNeighbor;
                const currentScore = bestNeighborScore;
                this.tabuList.push(this.hashSolution(current));
                if (this.tabuList.length > config.tabuTenure) this.tabuList.shift();
                
                if (currentScore < bestScore) {
                    best = this.cloneTeams(current);
                    bestScore = currentScore;
                    iterationSinceImprovement = 0;
                    this.algorithmStats.tabuSearch.improvements++;
                } else {
                    iterationSinceImprovement++;
                }
            }
            if (iterationSinceImprovement > config.diversificationFrequency) {
                current = this.generateNeighborhood(best, positions, 1)[0];
                iterationSinceImprovement = 0;
                this.tabuList = [];
            }
            if (iter % 500 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }
        return best;
    }

    async runSimulatedAnnealing(initialTeams, positions) {
        const config = this.algorithmConfigs.simulatedAnnealing;
        let current = this.cloneTeams(initialTeams);
        let best = this.cloneTeams(current);
        let currentScore = this.evaluateSolution(current);
        let bestScore = currentScore;
        let temp = config.initialTemperature;
        let iterationSinceImprovement = 0;

        for (let iter = 0; iter < config.iterations; iter++) {
            this.algorithmStats.simulatedAnnealing.iterations = iter + 1;
            this.algorithmStats.simulatedAnnealing.temperature = temp;
            
            const neighbor = this.cloneTeams(current);
            this.performUniversalSwap(neighbor, positions);
            const neighborScore = this.evaluateSolution(neighbor);
            const delta = neighborScore - currentScore;
            
            if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
                current = neighbor;
                currentScore = neighborScore;
                if (neighborScore < bestScore) {
                    best = this.cloneTeams(neighbor);
                    bestScore = neighborScore;
                    iterationSinceImprovement = 0;
                    this.algorithmStats.simulatedAnnealing.improvements++;
                } else {
                    iterationSinceImprovement++;
                }
            }
            temp *= config.coolingRate;
            if (config.reheatEnabled && iterationSinceImprovement > config.reheatIterations) {
                temp = config.reheatTemperature;
                iterationSinceImprovement = 0;
            }
            if (iter % 5000 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }
        return best;
    }

    async runLocalSearch(teams, positions) {
        const config = this.algorithmConfigs.localSearch;
        let current = this.cloneTeams(teams);
        let currentScore = this.evaluateSolution(current);
        
        for (let iter = 0; iter < config.iterations; iter++) {
            this.algorithmStats.localSearch.iterations = iter + 1;
            const neighbor = this.cloneTeams(current);
            this.performUniversalSwap(neighbor, positions);
            const neighborScore = this.evaluateSolution(neighbor);
            if (neighborScore < currentScore) {
                current = neighbor;
                currentScore = neighborScore;
                this.algorithmStats.localSearch.improvements++;
            }
            if (iter % 100 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }
        return current;
    }
    
    generateNeighborhood(teams, positions, size) {
        return Array.from({ length: size }, () => {
            const neighbor = this.cloneTeams(teams);
            this.performUniversalSwap(neighbor, positions);
            return neighbor;
        });
    }

    evaluateSolution(teams) {
        if (!teams || !Array.isArray(teams) || teams.length === 0) return Infinity;
        
        const teamStrengths = teams.map(team => {
            if (!Array.isArray(team)) return 0;
            return eloService.calculateTeamStrength(team).totalRating;
        });
        
        if (teamStrengths.some(isNaN)) return Infinity;

        const balance = Math.max(...teamStrengths) - Math.min(...teamStrengths);
        const avg = teamStrengths.reduce((a, b) => a + b, 0) / teamStrengths.length;
        const variance = teamStrengths.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / teamStrengths.length;

        let positionImbalance = 0;
        Object.keys(this.positions).forEach(pos => {
            const posStrengths = teams.map(team =>
                team.filter(p => p.assignedPosition === pos).reduce((sum, p) => sum + p.positionRating, 0)
            );
            if (posStrengths.length > 1 && posStrengths.some(s => s > 0)) {
                positionImbalance += (Math.max(...posStrengths) - Math.min(...posStrengths));
            }
        });

        return balance + Math.sqrt(variance) * this.config.adaptiveParameters.varianceWeight + 
               positionImbalance * this.config.adaptiveParameters.positionBalanceWeight;
    }

    enhancedValidate(composition, teamCount, players) {
        const errors = [];
        const warnings = [];
        let totalNeeded = 0;
        
        Object.entries(composition).forEach(([position, count]) => {
            if (count > 0) {
                const needed = count * teamCount;
                const available = players.filter(p => p.positions.includes(position)).length;
                totalNeeded += needed;
                if (available < needed) {
                    errors.push({ position, needed, available, message: `Not enough ${this.positions[position]}s: need ${needed}, have ${available}` });
                }
            }
        });
        if(players.length < totalNeeded) {
            errors.push({message: `Not enough total players: need ${totalNeeded}, have ${players.length}`});
        }

        return { isValid: errors.length === 0, errors, warnings };
    }

    groupByPosition(players) {
        const grouped = {};
        players.forEach(player => {
            if (player.positions && Array.isArray(player.positions)) {
                player.positions.forEach(position => {
                    if (!grouped[position]) grouped[position] = [];
                    grouped[position].push({ ...player, assignedPosition: position, positionRating: player.ratings[position] || 1500 });
                });
            }
        });
        return grouped;
    }

    generateInitialSolutions(composition, teamCount, playersByPosition) {
        const solutions = [];
        solutions.push(this.createBalancedSolution(composition, teamCount, playersByPosition));
        solutions.push(this.createSnakeDraftSolution(composition, teamCount, playersByPosition));
        for(let i=0; i<3; i++) {
           solutions.push(this.createRandomSolution(composition, teamCount, playersByPosition));
        }
        return solutions;
    }
    
    createBalancedSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        const positionOrder = Object.entries(composition).filter(([, count]) => count > 0);
    
        positionOrder.forEach(([position, neededCount]) => {
            const players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating);
    
            let playerIdx = 0;
            
            for (let slot = 0; slot < neededCount; slot++) {
                
                for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                    if (playerIdx < players.length) {
                        teams[teamIdx].push(players[playerIdx]);
                        usedIds.add(players[playerIdx].id);
                        playerIdx++;
                    }
                }
            }
        });
        return teams;
    }
    
    createSnakeDraftSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        const positionOrder = Object.entries(composition).filter(([, count]) => count > 0);
    
        positionOrder.forEach(([position, neededCount]) => {
            const players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id))
                .sort((a, b) => b.positionRating - a.positionRating);
            
            let playerIdx = 0;
            
            for (let slot = 0; slot < neededCount; slot++) {
                
                for (let i = 0; i < teamCount; i++) {
                    if (playerIdx < players.length) {
                        const teamIdx = slot % 2 === 0 ? i : teamCount - 1 - i;
                        teams[teamIdx].push(players[playerIdx]);
                        usedIds.add(players[playerIdx].id);
                        playerIdx++;
                    }
                }
            }
        });
        return teams;
    }

    createRandomSolution(composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const usedIds = new Set();
        const totalPlayersPerTeam = Object.values(composition).reduce((a, b) => a + b, 0);
    
        Object.entries(composition).forEach(([position, neededCount]) => {
            if (neededCount === 0) return;
            
            const players = (playersByPosition[position] || [])
                .filter(p => !usedIds.has(p.id));
            
            for (let i = players.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [players[i], players[j]] = [players[j], players[i]];
            }
    
            let playerIdx = 0;
            for (let slot = 0; slot < neededCount; slot++) {
                for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
                    if (playerIdx < players.length) {
                        teams[teamIdx].push(players[playerIdx]);
                        usedIds.add(players[playerIdx].id);
                        playerIdx++;
                    }
                }
            }
        });
    
        return teams;
    }

    enhancedCrossover(parent1, parent2, composition) {
        const child = Array.from({ length: parent1.length }, () => []);
        const usedIds = new Set();
        const slicePoint = Math.floor(Math.random() * parent1.length);
        
        for (let i = 0; i < slicePoint; i++) {
            child[i] = parent1[i].map(p => ({ ...p }));
            parent1[i].forEach(p => usedIds.add(p.id));
        }
        
        const remainingPlayers = parent2.flat().filter(p => !usedIds.has(p.id));
        remainingPlayers.forEach(player => {
            let placed = false;
            for (let i = 0; i < child.length; i++) {
                const needsPos = (child[i].filter(p => p.assignedPosition === player.assignedPosition).length) < (composition[player.assignedPosition] || 0);
                if (needsPos) {
                    child[i].push({ ...player });
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                const smallestTeam = child.reduce((smallest, current) => current.length < smallest.length ? current : smallest, child[0]);
                smallestTeam.push({ ...player });
            }
        });
        return child;
    }
    
    getUnusedPlayers(teams, allPlayers) {
        const usedIds = new Set(teams.flat().map(p => p.id));
        return allPlayers.filter(p => !usedIds.has(p.id));
    }

    hashSolution(teams) {
        return teams.map(team => team.map(p => p.id).sort().join(',')).sort().join('|');
    }

    tournamentSelection(scoredPopulation, size) {
        let best = null;
        for (let i = 0; i < size; i++) {
            const idx = Math.floor(Math.random() * scoredPopulation.length);
            if (!best || scoredPopulation[idx].score < best.score) {
                best = scoredPopulation[idx];
            }
        }
        return best.teams;
    }

    adaptParameters(teamCount, totalPlayers) {
    }
    
    resetAlgorithmStats() {
        this.algorithmStats = {
            geneticAlgorithm: { generations: 0, improvements: 0 },
            tabuSearch: { iterations: 0, improvements: 0 },
            simulatedAnnealing: { iterations: 0, improvements: 0, temperature: 0 },
            localSearch: { iterations: 0, improvements: 0 }
        };
    }

    getAlgorithmStatistics() {
        return this.algorithmStats;
    }
}

export default new TeamOptimizerService();
