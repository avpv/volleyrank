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
 * Service configuration
 * Defines how each service should be registered
 */
export const serviceConfig = {
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
     * Player Service - Player management
     * Singleton: One player service
     * Dependencies: stateManager, eventBus, eloService
     */
    playerService: {
        implementation: PlayerService,
        lifetime: ServiceLifetime.SINGLETON,
        dependencies: ['stateManager', 'eventBus', 'eloService']
    },

    /**
     * ELO Service - Rating calculations
     * Singleton: Stateless service, can be singleton
     */
    eloService: {
        implementation: EloService,
        lifetime: ServiceLifetime.SINGLETON,
        dependencies: []
    },

    /**
     * Comparison Service - Player comparisons
     * Singleton: One comparison service
     * Dependencies: playerService, eloService, eventBus
     */
    comparisonService: {
        implementation: ComparisonService,
        lifetime: ServiceLifetime.SINGLETON,
        dependencies: ['playerService', 'eloService', 'eventBus']
    },

    /**
     * Team Optimizer Service - Team generation
     * Singleton: Stateless service
     * Dependencies: eloService
     */
    teamOptimizerService: {
        implementation: TeamOptimizerService,
        lifetime: ServiceLifetime.SINGLETON,
        dependencies: ['eloService']
    }
};

/**
 * Initialize service registry
 * Creates and configures the global service registry
 *
 * @returns {ServiceRegistry} Configured registry
 */
export function initializeServices() {
    const registry = createRegistry(serviceConfig);

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
    initializeServices,
    getServiceGraph
};
