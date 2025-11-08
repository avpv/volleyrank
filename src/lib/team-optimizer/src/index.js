/**
 * Team Optimizer Library
 * Universal team balancing for sports
 *
 * @module team-optimizer
 * @author avpv
 * @license MIT
 */

// Core
export { default as TeamOptimizerService } from './core/TeamOptimizerService.js';
export { default as IOptimizer } from './core/IOptimizer.js';

// Algorithms
export { default as GeneticAlgorithmOptimizer } from './algorithms/GeneticAlgorithmOptimizer.js';
export { default as TabuSearchOptimizer } from './algorithms/TabuSearchOptimizer.js';
export { default as SimulatedAnnealingOptimizer } from './algorithms/SimulatedAnnealingOptimizer.js';
export { default as AntColonyOptimizer } from './algorithms/AntColonyOptimizer.js';
export { default as ConstraintProgrammingOptimizer } from './algorithms/ConstraintProgrammingOptimizer.js';
export { default as LocalSearchOptimizer } from './algorithms/LocalSearchOptimizer.js';

// Utils
export * from './utils/solutionGenerators.js';
export * from './utils/solutionUtils.js';
export * from './utils/swapOperations.js';
export * from './utils/configHelpers.js';

// Sport configurations
export { default as volleyballConfig } from './config/volleyball.js';
export { default as footballConfig } from './config/football.js';
export { default as basketballConfig } from './config/basketball.js';
