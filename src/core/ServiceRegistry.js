/**
 * Service Registry
 * Dependency Injection container for managing application services
 *
 * This module provides:
 * - Service registration and resolution
 * - Singleton and transient service lifetimes
 * - Dependency injection
 * - Service lifecycle management
 * - Factory pattern support
 *
 * Benefits:
 * - Loose coupling between components
 * - Easy testing with mock services
 * - Centralized service configuration
 * - Clear dependency graph
 */

/**
 * Service Lifetime
 * Determines how service instances are managed
 */
export const ServiceLifetime = {
    /** Single instance shared across application */
    SINGLETON: 'singleton',

    /** New instance created for each request */
    TRANSIENT: 'transient',

    /** Single instance per scope */
    SCOPED: 'scoped'
};

/**
 * Service Registration
 * Describes how a service should be created and managed
 */
class ServiceRegistration {
    /**
     * @param {string} name - Service name/identifier
     * @param {Function|Object} implementation - Service class or factory
     * @param {string} lifetime - Service lifetime
     * @param {Array<string>} dependencies - Service dependencies
     */
    constructor(name, implementation, lifetime = ServiceLifetime.SINGLETON, dependencies = []) {
        this.name = name;
        this.implementation = implementation;
        this.lifetime = lifetime;
        this.dependencies = dependencies;
        this.instance = null;
    }

    /**
     * Check if instance exists
     */
    hasInstance() {
        return this.instance !== null;
    }

    /**
     * Get or create instance
     */
    getInstance(registry) {
        // Return existing instance for singleton
        if (this.lifetime === ServiceLifetime.SINGLETON && this.instance) {
            return this.instance;
        }

        // Create new instance
        const instance = this.createInstance(registry);

        // Store instance if singleton
        if (this.lifetime === ServiceLifetime.SINGLETON) {
            this.instance = instance;
        }

        return instance;
    }

    /**
     * Create new instance
     */
    createInstance(registry) {
        // If implementation is a function (class or factory)
        if (typeof this.implementation === 'function') {
            // Resolve dependencies
            const deps = this.dependencies.map(depName => registry.resolve(depName));

            // Check if it's a class (has prototype methods)
            if (this.implementation.prototype && this.implementation.prototype.constructor === this.implementation) {
                // Create instance with dependencies
                return new this.implementation(...deps);
            } else {
                // It's a factory function
                return this.implementation(...deps);
            }
        }

        // If implementation is already an object, return it
        return this.implementation;
    }

    /**
     * Clear singleton instance
     */
    clearInstance() {
        this.instance = null;
    }
}

/**
 * Service Registry
 * Container for managing service dependencies
 */
class ServiceRegistry {
    constructor() {
        /** @type {Map<string, ServiceRegistration>} */
        this.services = new Map();

        /** @type {Set<string>} Resolution stack to detect circular dependencies */
        this.resolutionStack = new Set();

        /** @type {boolean} Lock to prevent modifications after initialization */
        this.locked = false;
    }

    /**
     * Register a service
     *
     * @param {string} name - Service name/identifier
     * @param {Function|Object} implementation - Service class, factory, or instance
     * @param {Object} options - Registration options
     * @param {string} options.lifetime - Service lifetime (singleton, transient, scoped)
     * @param {Array<string>} options.dependencies - Service dependencies
     * @returns {ServiceRegistry} This registry (for chaining)
     *
     * @example
     * registry.register('playerService', PlayerService, {
     *   lifetime: ServiceLifetime.SINGLETON,
     *   dependencies: ['storageAdapter', 'eventBus']
     * });
     */
    register(name, implementation, options = {}) {
        if (this.locked) {
            throw new Error('ServiceRegistry is locked. Cannot register services after initialization.');
        }

        const {
            lifetime = ServiceLifetime.SINGLETON,
            dependencies = []
        } = options;

        // Validate name
        if (!name || typeof name !== 'string') {
            throw new Error('Service name must be a non-empty string');
        }

        // Validate implementation
        if (!implementation) {
            throw new Error(`Service implementation is required for '${name}'`);
        }

        // Warn if overwriting existing service
        if (this.services.has(name)) {
            console.warn(`[ServiceRegistry] Overwriting existing service: ${name}`);
        }

        // Create and store registration
        const registration = new ServiceRegistration(name, implementation, lifetime, dependencies);
        this.services.set(name, registration);

        return this; // For chaining
    }

    /**
     * Register a singleton service
     * Shorthand for register with SINGLETON lifetime
     *
     * @param {string} name - Service name
     * @param {Function|Object} implementation - Service implementation
     * @param {Array<string>} dependencies - Service dependencies
     * @returns {ServiceRegistry} This registry (for chaining)
     */
    singleton(name, implementation, dependencies = []) {
        return this.register(name, implementation, {
            lifetime: ServiceLifetime.SINGLETON,
            dependencies
        });
    }

    /**
     * Register a transient service
     * Shorthand for register with TRANSIENT lifetime
     *
     * @param {string} name - Service name
     * @param {Function|Object} implementation - Service implementation
     * @param {Array<string>} dependencies - Service dependencies
     * @returns {ServiceRegistry} This registry (for chaining)
     */
    transient(name, implementation, dependencies = []) {
        return this.register(name, implementation, {
            lifetime: ServiceLifetime.TRANSIENT,
            dependencies
        });
    }

    /**
     * Register an existing instance
     * Automatically registered as singleton
     *
     * @param {string} name - Service name
     * @param {Object} instance - Service instance
     * @returns {ServiceRegistry} This registry (for chaining)
     */
    instance(name, instance) {
        const registration = new ServiceRegistration(name, instance, ServiceLifetime.SINGLETON, []);
        registration.instance = instance;
        this.services.set(name, registration);
        return this;
    }

    /**
     * Check if service is registered
     *
     * @param {string} name - Service name
     * @returns {boolean} True if service is registered
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * Resolve a service
     * Creates instance if needed and resolves dependencies
     *
     * @param {string} name - Service name
     * @returns {*} Service instance
     * @throws {Error} If service not found or circular dependency detected
     *
     * @example
     * const playerService = registry.resolve('playerService');
     */
    resolve(name) {
        // Check if service exists
        if (!this.services.has(name)) {
            throw new Error(`Service '${name}' not found in registry`);
        }

        // Check for circular dependency
        if (this.resolutionStack.has(name)) {
            const chain = Array.from(this.resolutionStack).join(' -> ');
            throw new Error(`Circular dependency detected: ${chain} -> ${name}`);
        }

        // Add to resolution stack
        this.resolutionStack.add(name);

        try {
            // Get registration
            const registration = this.services.get(name);

            // Get or create instance
            const instance = registration.getInstance(this);

            return instance;
        } finally {
            // Remove from resolution stack
            this.resolutionStack.delete(name);
        }
    }

    /**
     * Resolve multiple services
     *
     * @param {Array<string>} names - Service names
     * @returns {Array<*>} Service instances
     */
    resolveMany(names) {
        return names.map(name => this.resolve(name));
    }

    /**
     * Get all registered service names
     *
     * @returns {Array<string>} Service names
     */
    getServiceNames() {
        return Array.from(this.services.keys());
    }

    /**
     * Get service registration info
     *
     * @param {string} name - Service name
     * @returns {Object|null} Registration info or null if not found
     */
    getServiceInfo(name) {
        if (!this.services.has(name)) {
            return null;
        }

        const registration = this.services.get(name);
        return {
            name: registration.name,
            lifetime: registration.lifetime,
            dependencies: registration.dependencies,
            hasInstance: registration.hasInstance()
        };
    }

    /**
     * Clear all singleton instances
     * Useful for testing or reset scenarios
     */
    clearInstances() {
        this.services.forEach(registration => {
            if (registration.lifetime === ServiceLifetime.SINGLETON) {
                registration.clearInstance();
            }
        });
    }

    /**
     * Clear a specific service instance
     *
     * @param {string} name - Service name
     */
    clearInstance(name) {
        if (this.services.has(name)) {
            this.services.get(name).clearInstance();
        }
    }

    /**
     * Lock the registry
     * Prevents further service registration
     * Useful to ensure services are only registered during initialization
     */
    lock() {
        this.locked = true;
    }

    /**
     * Unlock the registry
     * Allows service registration again
     */
    unlock() {
        this.locked = false;
    }

    /**
     * Create a child scope
     * Useful for scoped services in specific contexts
     *
     * @returns {ServiceRegistry} New scoped registry
     */
    createScope() {
        const scope = new ServiceRegistry();

        // Copy all service registrations
        this.services.forEach((registration, name) => {
            scope.services.set(name, registration);
        });

        return scope;
    }

    /**
     * Dispose all services
     * Calls dispose() method on services that have it
     */
    dispose() {
        this.services.forEach(registration => {
            if (registration.instance && typeof registration.instance.dispose === 'function') {
                try {
                    registration.instance.dispose();
                } catch (error) {
                    console.error(`Error disposing service ${registration.name}:`, error);
                }
            }
        });

        this.services.clear();
        this.resolutionStack.clear();
    }

    /**
     * Create dependency graph
     * Returns object showing service dependencies
     *
     * @returns {Object} Dependency graph
     */
    getDependencyGraph() {
        const graph = {};

        this.services.forEach((registration, name) => {
            graph[name] = {
                dependencies: registration.dependencies,
                lifetime: registration.lifetime,
                hasInstance: registration.hasInstance()
            };
        });

        return graph;
    }

    /**
     * Validate all services can be resolved
     * Checks for missing dependencies and circular references
     *
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];
        const warnings = [];

        this.services.forEach((registration, name) => {
            // Check dependencies exist
            registration.dependencies.forEach(depName => {
                if (!this.services.has(depName)) {
                    errors.push(`Service '${name}' depends on missing service '${depName}'`);
                }
            });

            // Try to resolve (this will catch circular dependencies)
            try {
                this.resolve(name);
            } catch (error) {
                errors.push(`Failed to resolve '${name}': ${error.message}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
}

/**
 * Global service registry instance
 * Used by default throughout the application
 */
const globalRegistry = new ServiceRegistry();

/**
 * Helper function to create a configured registry
 * Sets up all core services
 *
 * @param {Object} services - Services to register
 * @returns {ServiceRegistry} Configured registry
 */
export function createRegistry(services = {}) {
    const registry = new ServiceRegistry();

    Object.entries(services).forEach(([name, config]) => {
        registry.register(name, config.implementation, {
            lifetime: config.lifetime || ServiceLifetime.SINGLETON,
            dependencies: config.dependencies || []
        });
    });

    return registry;
}

// Export registry and helpers
export default globalRegistry;
export {
    ServiceRegistry,
    ServiceRegistration,
    globalRegistry
};
