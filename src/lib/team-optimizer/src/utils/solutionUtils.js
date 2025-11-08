// src/services/optimizer/utils/solutionUtils.js

/**
 * Utility functions for working with team solutions
 */

/**
 * Deep clone teams array
 * @param {Array} teams - Array of teams to clone
 * @returns {Array} Cloned teams
 */
export function cloneTeams(teams) {
    return teams.map(team => team.map(player => ({ ...player })));
}

/**
 * Create a hash string representing the solution for tabu search
 * @param {Array} teams - Array of teams
 * @returns {string} Hash string
 */
export function hashSolution(teams) {
    return teams.map(team => 
        team.map(p => p.id).sort().join(',')
    ).sort().join('|');
}

/**
 * Get unused players from all available players
 * @param {Array} teams - Array of teams
 * @param {Array} allPlayers - All available players
 * @returns {Array} Unused players
 */
export function getUnusedPlayers(teams, allPlayers) {
    const usedIds = new Set(teams.flat().map(p => p.id));
    return allPlayers.filter(p => !usedIds.has(p.id));
}

/**
 * Sort players in a team by position order
 * @param {Array} team - Team to sort
 * @param {Array} positionOrder - Order of positions ['S', 'OPP', 'OH', 'MB', 'L']
 * @returns {Array} Sorted team
 */
export function sortTeamByPosition(team, positionOrder) {
    return team.sort((a, b) => {
        const posA = a.assignedPosition || a.positions?.[0];
        const posB = b.assignedPosition || b.positions?.[0];
        
        const indexA = positionOrder.indexOf(posA);
        const indexB = positionOrder.indexOf(posB);
        
        // If position not found, put at the end
        const orderA = indexA === -1 ? 999 : indexA;
        const orderB = indexB === -1 ? 999 : indexB;
        
        return orderA - orderB;
    });
}
