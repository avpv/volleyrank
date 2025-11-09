/**
 * Services Configuration (REFACTORED)
 * Central configuration for dependency injection
 *
 * This file defines all application services and their dependencies,
 * providing a clear picture of the application architecture.
 *
 * CHANGES:
 * - Added PlayerRepository for data access layer
 * - Added ValidationService for centralized validation
 * - Updated service dependencies to use repository pattern
 * - Cleaner separation of concerns
 */

import { ServiceLifetime, createRegistry } from '../core/ServiceRegistry.js';

// Core services
import EventBus from '../core/EventBus.js';
import StateManager from '../core/StateManager.js';
import StorageAdapter from '../core/StorageAdapter.js';
import Router from '../core/Router.js';
import errorHandler from '../core/ErrorHandler.js';

// Repository layer (NEW)
import PlayerRepository from '../repositories/PlayerRepository.js';

// Business services
import ValidationService from '../services/ValidationService.js';
import PlayerService from '../services/PlayerService.js';
import EloService from '../services/EloService.js';
import ComparisonService from '../services/ComparisonService.js';
import TeamOptimizerService from '../services/TeamOptimizerService.js';

/**
 * Service configuration factory
 * Defines how each service should be registered
 *
 * @param {Object} activityConfig - Activity configuration (positions, weights, etc.)
 * @returns {Object} Service configuration
 */
export function createServiceConfig(activityConfig) {
    return {
        // ===== Core Services =====

        /**
         * Event Bus - Event aggregator
         * Singleton: One event bus for entire app
         */
        eventBus: {
            implementation: EventBus,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: []
        },

        /**
         * Storage Adapter - localStorage wrapper
         * Singleton: One storage instance
         */
        storageAdapter: {
            implementation: StorageAdapter,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: []
        },

        /**
         * State Manager - Application state
         * Singleton: One state for entire app
         * Dependencies: storageAdapter, eventBus
         */
        stateManager: {
            implementation: StateManager,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: ['storageAdapter', 'eventBus']
        },

        /**
         * Router - Page routing
         * Singleton: One router for entire app
         * Dependencies: eventBus
         */
        router: {
            implementation: Router,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: ['eventBus']
        },

        /**
         * Error Handler - Error management
         * Singleton: One error handler for entire app
         */
        errorHandler: {
            implementation: errorHandler,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: []
        },

        // ===== Repository Layer (NEW) =====

        /**
         * Player Repository - Data access for players
         * Singleton: One repository instance
         * Dependencies: stateManager, eventBus
         *
         * Purpose: Encapsulate all data access operations
         * Benefits: Loose coupling, easier testing, single source of truth
         */
        playerRepository: {
            implementation: PlayerRepository,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: ['stateManager', 'eventBus']
        },

        // ===== Validation Layer (NEW) =====

        /**
         * Validation Service - Centralized validation
         * Singleton: Stateless service
         * Dependencies: activityConfig
         *
         * Purpose: Centralize all validation logic
         * Benefits: Reusability, consistency, easier testing
         */
        validationService: {
            implementation: ValidationService,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: [],
            factory: () => new ValidationService(activityConfig)
        },

        // ===== Business Services =====

        /**
         * ELO Service - Rating calculations
         * Singleton: Stateless service
         * Dependencies: activityConfig (for position weights)
         */
        eloService: {
            implementation: EloService,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: [],
            factory: () => new EloService(activityConfig)
        },

        /**
         * Player Service - Player management (REFACTORED)
         * Singleton: One player service
         * Dependencies: activityConfig, playerRepository, validationService, eventBus, eloService
         *
         * Changes:
         * - Now uses PlayerRepository instead of StateManager
         * - Now uses ValidationService instead of internal validation
         * - Focused on business logic only
         */
        playerService: {
            implementation: PlayerService,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: ['playerRepository', 'validationService', 'eventBus', 'eloService'],
            factory: (deps) => new PlayerService(
                activityConfig,
                deps.playerRepository,
                deps.validationService,
                deps.eventBus,
                deps.eloService
            )
        },

        /**
         * Comparison Service - Player comparisons (REFACTORED)
         * Singleton: One comparison service
         * Dependencies: activityConfig, playerRepository, validationService, eloService, eventBus
         *
         * Changes:
         * - Now uses PlayerRepository instead of StateManager
         * - Now uses ValidationService for input validation
         * - Split long methods into smaller focused methods
         * - Better separation of concerns
         */
        comparisonService: {
            implementation: ComparisonService,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: ['playerRepository', 'validationService', 'eloService', 'eventBus'],
            factory: (deps) => new ComparisonService(
                activityConfig,
                deps.playerRepository,
                deps.validationService,
                deps.eloService,
                deps.eventBus
            )
        },

        /**
         * Team Optimizer Service - Team generation
         * Singleton: Stateless service
         * Dependencies: activityConfig, eloService
         */
        teamOptimizerService: {
            implementation: TeamOptimizerService,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: ['eloService'],
            factory: (deps) => new TeamOptimizerService(
                activityConfig,
                deps.eloService
            )
        }
    };
}

// Backwards compatibility: export serviceConfig as empty object
// Applications should now call createServiceConfig(activityConfig)
export const serviceConfig = {};

/**
 * Initialize service registry
 * Creates and configures the global service registry
 *
 * @param {Object} activityConfig - Activity configuration (positions, weights, etc.)
 * @returns {ServiceRegistry} Configured registry
 */
export function initializeServices(activityConfig) {
    if (!activityConfig) {
        throw new Error('Activity configuration is required. Import from config/activities/');
    }

    console.log(`[Services] Initializing with activity: ${activityConfig.name || 'Unknown'}`);

    const config = createServiceConfig(activityConfig);
    const registry = createRegistry(config);

    // Validate configuration
    const validation = registry.validate();
    if (!validation.valid) {
        console.error('[Services] Validation failed:', validation.errors);
        throw new Error('Service configuration is invalid');
    }

    // Lock registry to prevent runtime modifications
    registry.lock();

    console.log('[Services] Initialized successfully');
    console.log('[Services] Available services:', registry.getServiceNames());

    // Log architecture improvements
    console.log('[Services] Architecture improvements:');
    console.log('  ✓ Repository pattern for data access');
    console.log('  ✓ Centralized validation service');
    console.log('  ✓ Improved separation of concerns');
    console.log('  ✓ Better testability and maintainability');

    return registry;
}

/**
 * Get dependency graph
 * Useful for debugging and understanding architecture
 *
 * @param {ServiceRegistry} registry - Service registry
 * @returns {Object} Dependency graph
 */
export function getServiceGraph(registry) {
    return registry.getDependencyGraph();
}

export default {
    serviceConfig,
    createServiceConfig,
    initializeServices,
    getServiceGraph
};
