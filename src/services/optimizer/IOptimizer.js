// src/services/optimizer/IOptimizer.js

/**
 * Base interface/class for all optimization algorithms.
 * Each optimizer must implement the solve() method.
 */
class IOptimizer {
    /**
     * @param {Object} config - Algorithm-specific configuration
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * Solve the optimization problem and return the best solution.
     * 
     * @param {Object} problemContext - Context containing:
     *   - initialSolution: Array of teams (starting point)
     *   - composition: Position composition requirements
     *   - teamCount: Number of teams to create
     *   - playersByPosition: Players grouped by position
     *   - positions: Array of position keys
     *   - evaluateFn: Function to evaluate solution quality
     * @returns {Promise<Array>} Best solution found (array of teams)
     */
    async solve(problemContext) {
        throw new Error('Method solve() must be implemented by subclass');
    }

    /**
     * Get algorithm-specific statistics
     * @returns {Object} Statistics object
     */
    getStatistics() {
        return {
            iterations: 0,
            improvements: 0
        };
    }
}

export default IOptimizer;
