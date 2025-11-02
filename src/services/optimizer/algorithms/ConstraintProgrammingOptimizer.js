// src/services/optimizer/algorithms/ConstraintProgrammingOptimizer.js

import IOptimizer from '../IOptimizer.js';
import { generateInitialSolutions } from '../utils/solutionGenerators.js';

/**
 * Constraint Programming Optimizer
 * Uses backtracking with constraint propagation and intelligent heuristics
 */
class ConstraintProgrammingOptimizer extends IOptimizer {
    constructor(config) {
        super(config);
        this.stats = {
            iterations: 0,
            improvements: 0,
            backtracks: 0,
            conflicts: 0
        };
    }

    /**
     * Solve using Constraint Programming
     * @param {Object} problemContext - Problem context
     * @returns {Promise<Array>} Best solution found
     */
    async solve(problemContext) {
        const {
            composition,
            teamCount,
            playersByPosition
        } = problemContext;

        try {
            // Build constraint model
            const variables = this.buildCPVariables(composition, teamCount, playersByPosition);
            const constraints = this.buildCPConstraints(composition, teamCount, variables);

            // Try to find solution using backtracking with constraint propagation
            const solution = await this.cpBacktrackingSearch(
                variables,
                constraints,
                composition,
                teamCount,
                playersByPosition
            );

            if (!solution) {
                console.warn(`CP: No solution found after ${this.stats.backtracks} backtracks, using greedy construction`);
                return generateInitialSolutions(composition, teamCount, playersByPosition)[0];
            }

            return this.convertCPSolutionToTeams(solution, variables, composition, teamCount, playersByPosition);
        } catch (error) {
            console.error('CP: Error during optimization:', error);
            return generateInitialSolutions(composition, teamCount, playersByPosition)[0];
        }
    }

    /**
     * Build CP variables: each player needs to be assigned to a team and position
     */
    buildCPVariables(composition, teamCount, playersByPosition) {
        const variables = [];
        
        // For each team and position slot, we need to assign a player
        for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
            Object.entries(composition).forEach(([position, count]) => {
                for (let slot = 0; slot < count; slot++) {
                    const eligiblePlayers = playersByPosition[position] || [];
                    variables.push({
                        id: `team${teamIdx}_${position}_${slot}`,
                        teamIndex: teamIdx,
                        position: position,
                        slotIndex: slot,
                        domain: eligiblePlayers.map(p => p.id),
                        assignment: null,
                        constraints: []
                    });
                }
            });
        }
        
        return variables;
    }

    /**
     * Build CP constraints
     */
    buildCPConstraints(composition, teamCount, variables) {
        const constraints = [];
        
        // Constraint 1: Each player can only be assigned once (AllDifferent)
        constraints.push({
            type: 'all-different',
            variables: variables,
            check: (assignments) => {
                const assigned = assignments.filter(a => a !== null);
                return assigned.length === new Set(assigned).size;
            }
        });
        
        // Constraint 2: Team balance (soft constraint)
        for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
            const teamVars = variables.filter(v => v.teamIndex === teamIdx);
            constraints.push({
                type: 'team-balance',
                variables: teamVars,
                teamIndex: teamIdx,
                check: (assignments, playersByPosition) => {
                    // This is a soft constraint - always true, but affects score
                    return true;
                }
            });
        }
        
        return constraints;
    }

    /**
     * Backtracking search with constraint propagation
     */
    async cpBacktrackingSearch(variables, constraints, composition, teamCount, playersByPosition, depth = 0) {
        this.stats.iterations++;
        
        // Check if solution is complete
        if (variables.every(v => v.assignment !== null)) {
            return variables.map(v => v.assignment);
        }
        
        // Check backtrack limit
        if (this.stats.backtracks >= this.config.maxBacktracks) {
            return null;
        }
        
        // Select next variable using heuristic
        const nextVar = this.selectCPVariable(variables);
        if (!nextVar) return null;
        
        // Order values using heuristic
        const orderedValues = this.orderCPValues(nextVar, variables, playersByPosition);
        
        // Try each value
        for (const playerId of orderedValues) {
            // Assign value
            nextVar.assignment = playerId;
            
            // Check constraints
            if (this.checkCPConstraints(variables, constraints, playersByPosition)) {
                // Propagate constraints
                const propagatedDomains = this.propagateCPConstraints(variables, constraints);
                
                // Recursively search
                const result = await this.cpBacktrackingSearch(
                    variables, 
                    constraints, 
                    composition, 
                    teamCount, 
                    playersByPosition,
                    depth + 1
                );
                
                if (result) return result;
                
                // Restore domains after failed branch
                this.restoreCPDomains(variables, propagatedDomains);
            } else {
                this.stats.conflicts++;
            }
            
            // Unassign and backtrack
            nextVar.assignment = null;
            this.stats.backtracks++;
        }
        
        if (depth % 50 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        
        return null;
    }

    /**
     * Select next variable to assign (most constrained first)
     */
    selectCPVariable(variables) {
        const unassigned = variables.filter(v => v.assignment === null);
        if (unassigned.length === 0) return null;
        
        if (this.config.variableOrderingHeuristic === 'most-constrained') {
            // Choose variable with smallest domain (MRV - Minimum Remaining Values)
            return unassigned.reduce((min, v) => 
                v.domain.length < min.domain.length ? v : min
            );
        }
        
        return unassigned[0];
    }

    /**
     * Order values for a variable (least constraining first)
     */
    orderCPValues(variable, allVariables, playersByPosition) {
        if (this.config.valueOrderingHeuristic === 'least-constraining') {
            // Try to order by how many options it leaves for other variables
            return [...variable.domain].sort((a, b) => {
                const aConstrains = this.countConstrainedByAssignment(a, variable, allVariables);
                const bConstrains = this.countConstrainedByAssignment(b, variable, allVariables);
                return aConstrains - bConstrains;
            });
        }
        
        return variable.domain;
    }

    /**
     * Count how many variables would be constrained by this assignment
     */
    countConstrainedByAssignment(playerId, variable, allVariables) {
        let count = 0;
        allVariables.forEach(v => {
            if (v !== variable && v.assignment === null && v.domain.includes(playerId)) {
                count++;
            }
        });
        return count;
    }

    /**
     * Check if current partial assignment satisfies constraints
     */
    checkCPConstraints(variables, constraints, playersByPosition) {
        const assignments = variables.map(v => v.assignment);
        
        for (const constraint of constraints) {
            if (constraint.type === 'all-different') {
                const assigned = assignments.filter(a => a !== null);
                if (assigned.length !== new Set(assigned).size) {
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * Propagate constraints to reduce domains
     */
    propagateCPConstraints(variables, constraints) {
        const oldDomains = new Map();
        
        // Save current domains
        variables.forEach(v => {
            oldDomains.set(v.id, [...v.domain]);
        });
        
        // Remove assigned values from other variables' domains
        const assignedValues = new Set(
            variables.filter(v => v.assignment !== null).map(v => v.assignment)
        );
        
        variables.forEach(v => {
            if (v.assignment === null) {
                v.domain = v.domain.filter(playerId => !assignedValues.has(playerId));
            }
        });
        
        return oldDomains;
    }

    /**
     * Restore domains after backtracking
     */
    restoreCPDomains(variables, oldDomains) {
        variables.forEach(v => {
            const oldDomain = oldDomains.get(v.id);
            if (oldDomain) {
                v.domain = [...oldDomain];
            }
        });
    }

    /**
     * Convert CP solution to team structure
     */
    convertCPSolutionToTeams(solution, variables, composition, teamCount, playersByPosition) {
        const teams = Array.from({ length: teamCount }, () => []);
        const allPlayers = Object.values(playersByPosition).flat();
        const playerMap = new Map(allPlayers.map(p => [p.id, p]));
        
        variables.forEach((variable, idx) => {
            const playerId = solution[idx];
            const player = playerMap.get(playerId);
            if (player) {
                teams[variable.teamIndex].push(player);
            }
        });
        
        return teams;
    }

    getStatistics() {
        return this.stats;
    }
}

export default ConstraintProgrammingOptimizer;
