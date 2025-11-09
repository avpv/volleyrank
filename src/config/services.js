/**
 * Services Configuration
 * Central configuration for dependency injection
 *
 * This file defines all application services and their dependencies,
 * providing a clear picture of the application architecture.
 */

import { ServiceLifetime, createRegistry } from '../core/ServiceRegistry.js';

// Core services
import EventBus from '../core/EventBus.js';
import StateManager from '../core/StateManager.js';
import StorageAdapter from '../core/StorageAdapter.js';
import Router from '../core/Router.js';
import errorHandler from '../core/ErrorHandler.js';

// Business services
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

        // ===== Business Services =====

        /**
         * ELO Service - Rating calculations
         * Singleton: Stateless service, can be singleton
         * Dependencies: activityConfig (for position weights)
         */
        eloService: {
            implementation: EloService,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: [],
            factory: () => new EloService(activityConfig)
        },

        /**
         * Player Service - Player management
         * Singleton: One player service
         * Dependencies: activityConfig, stateManager, eventBus, eloService
         */
        playerService: {
            implementation: PlayerService,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: ['stateManager', 'eventBus', 'eloService'],
            factory: (deps) => new PlayerService(
                activityConfig,
                deps.stateManager,
                deps.eventBus,
                deps.eloService
            )
        },

        /**
         * Comparison Service - Player comparisons
         * Singleton: One comparison service
         * Dependencies: activityConfig, playerService, eloService, eventBus
         */
        comparisonService: {
            implementation: ComparisonService,
            lifetime: ServiceLifetime.SINGLETON,
            dependencies: ['playerService', 'eloService', 'eventBus'],
            factory: (deps) => new ComparisonService(
                activityConfig,
                deps.playerService,
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
