// src/app.js

/**
 * Application Bootstrap
 *
 * Main application entry point that initializes the entire SPA.
 * Handles routing, state management, and global event coordination.
 *
 * Architecture:
 * - Singleton application instance
 * - Event-driven component communication
 * - Centralized state management
 * - Clean routing with History API
 * - Seamless 404 redirect handling
 *
 * @module app
 * @requires core/Router
 * @requires core/EventBus
 * @requires core/StateManager
 * @requires components/base/Toast
 * @requires redirect
 * @version 4.0.0
 * @license MIT
 */

import router from './core/Router.js';
import eventBus from './core/EventBus.js';
import stateManager from './core/StateManager.js';
import toast from './components/base/Toast.js';
import redirectModule from './redirect.js';
import { getIcon } from './components/base/Icons.js';
import { defaultActivity, activities } from './config/activities/index.js';
import { escapeHtml } from './utils/stringUtils.js';
import { initializeServices } from './config/services.js';
import storage from './core/StorageAdapter.js';

// Page imports
import SettingsPage from './pages/SettingsPage.js';
import ComparePage from './pages/ComparePage.js';
import RankingsPage from './pages/RankingsPage.js';
import TeamsPage from './pages/TeamsPage.js';

/**
 * Application configuration constants
 * @constant {Object}
 */
const APP_CONFIG = {
    /** @property {string} Application version */
    VERSION: '4.0.0',

    /** @property {string} Base application name */
    NAME: 'TeamBalance',

    /** @property {number} Welcome toast duration (ms) */
    WELCOME_TOAST_DURATION: 5000
};

/**
 * Main Application Class
 * 
 * Orchestrates application lifecycle, routing, and page management.
 * Implements singleton pattern for global application instance.
 * 
 * Responsibilities:
 * - Application initialization and bootstrap
 * - Route registration and management
 * - Page lifecycle management (create, mount, destroy)
 * - Global event handling
 * - Error boundary and recovery
 * - Navigation state management
 * 
 * @class Application
 */
class Application {
    /**
     * Initialize application instance
     *
     * Sets up initial state and prepares for bootstrap.
     * Does not perform any async operations or side effects.
     *
     * @constructor
     */
    constructor() {
        /** @private {Object} Activity configuration */
        this.activityConfig = this.loadActivityConfig();

        /** @private {BasePage|null} Current active page instance */
        this.currentPage = null;

        /** @private {string|null} Initial path from 404 redirect */
        this.initialPath = null;
    }

    /**
     * Load activity configuration from localStorage or use default
     *
     * @private
     * @returns {Object} Activity configuration with key
     */
    loadActivityConfig() {
        const selectedActivity = storage.get('selectedActivity', 'volleyball');
        const activityConfig = activities[selectedActivity];

        if (!activityConfig) {
            console.warn(`Activity '${selectedActivity}' not found, using default`);
            return { key: 'volleyball', config: defaultActivity };
        }

        return { key: selectedActivity, config: activityConfig };
    }

    /**
     * Initialize application
     * 
     * Main bootstrap sequence that sets up the entire application.
     * This is the entry point called immediately after construction.
     * 
     * Bootstrap sequence:
     * 1. Handle GitHub Pages redirect (SessionStorage or Query Param)
     * 2. Load persisted application state from localStorage
     * 3. Setup global event listeners for app-wide events
     * 4. Register all application routes
     * 5. Initialize router with restored path if available
     * 6. Setup global error handlers
     * 7. Show welcome message for first-time users
     * 
     * @async
     * @public
     * @returns {Promise<void>}
     * @throws {Error} If critical initialization fails
     */
    async init() {
        try {
            console.log(`[INIT] Initializing ${APP_CONFIG.NAME} v${APP_CONFIG.VERSION}...`);
            console.log(`[INIT] Activity: ${this.activityConfig.config.name}`);

            // Step 1: Initialize services with activity config
            this.services = initializeServices(this.activityConfig.config);
            console.log('[OK] Services initialized');

            // Step 2: Handle GitHub Pages 404 redirect
            this.handleRedirect();

            // Step 3: Load persisted application state
            const loaded = stateManager.load();
            if (loaded) {
                console.log('[OK] State loaded from storage');
            } else {
                console.log('[OK] Starting with fresh state');
            }

            // Step 3: Setup global event listeners
            this.setupEventListeners();

            // Step 3.5: Setup navigation click handlers
            this.setupNavigationHandlers();

            // Step 4: Register application routes
            this.registerRoutes();

            // Step 5: Update navigation UI
            this.updateNavigation();

            // Step 6: Initialize router with initial path if available
            if (this.initialPath) {
                router.initialPath = this.initialPath;
            }
            router.init();

            // Step 7: Setup global error handlers
            this.setupErrorHandling();

            console.log(`[OK] ${APP_CONFIG.NAME} initialized successfully`);

            // Step 8: Show welcome message for first-time users
            if (!loaded) {
                toast.info(
                    `Welcome to ${APP_CONFIG.NAME}! Add players to get started.`,
                    APP_CONFIG.WELCOME_TOAST_DURATION
                );
            }

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showFatalError(error);
        }
    }

    /**
     * Handle GitHub Pages redirect
     * 
     * Processes redirects from 404.html using the redirect module.
     * Supports two methods for maximum compatibility:
     * 
     * Method 1: SessionStorage (Preferred)
     * - User accesses /teams/
     * - 404.html stores "/teams/" in sessionStorage
     * - Redirects to clean URL "/"
     * - This method reads from sessionStorage
     * - Routes to /teams/ seamlessly
     * - Result: Clean URL, no query parameters
     * 
     * Method 2: Query Parameter (Fallback)
     * - Used when sessionStorage is unavailable
     * - Reads from ?redirect=/teams/
     * - Cleans URL and routes correctly
     * 
     * Benefits:
     * - Invisible to user (no visible redirect)
     * - Clean URLs (no query parameters in address bar)
     * - Professional UX
     * - SEO-friendly
     * 
     * @private
     * @returns {void}
     */
    handleRedirect() {
        // Method 1: Try to restore from sessionStorage (cleanest approach)
        const storedPath = redirectModule.restore();
        
        if (storedPath) {
            console.log('[REDIRECT] Restoring path from sessionStorage:', storedPath);
            
            // Update browser URL to correct path (no query params)
            const fullPath = router.basePath + storedPath;
            window.history.replaceState(
                { path: storedPath },
                '',
                fullPath
            );
            
            // Store for router initialization
            this.initialPath = storedPath;
            
            console.log('[OK] Redirect handled via sessionStorage');
            return;
        }
        
        // Method 2: Fallback to query parameter (compatibility)
        const url = new URL(window.location);
        
        if (url.searchParams.has('redirect')) {
            const redirectPath = url.searchParams.get('redirect');
            console.log('[REDIRECT] Restoring path from query parameter:', redirectPath);
            
            // Remove redirect parameter from URL
            url.searchParams.delete('redirect');
            
            // Build full path
            const fullPath = router.basePath + redirectPath;
            
            // Update browser URL without reload
            window.history.replaceState(
                { path: redirectPath },
                '',
                fullPath
            );
            
            // Store for router initialization
            this.initialPath = redirectPath;
            
            console.log('[OK] Redirect handled via query parameter');
        }
    }

    /**
     * Register application routes
     * 
     * Maps URL paths to page components. Each route handler
     * is responsible for rendering the appropriate page.
     * 
     * Route Structure:
     * - / (root): Settings/Home page
     * - /compare/: Player comparison interface
     * - /rankings/: Player rankings by position
     * - /teams/: Team builder and optimizer
     * 
     * All routes end with trailing slash for consistency.
     * Router handles normalization of paths automatically.
     * 
     * @private
     * @returns {void}
     */
    registerRoutes() {
        // Home/Settings page
        router.register('/', () => {
            console.log('[ROUTE] Route: / (Settings)');
            this.renderPage('settings', SettingsPage);
        });

        // Player comparison page
        router.register('/compare/', () => {
            console.log('[ROUTE] Route: /compare/');
            this.renderPage('compare', ComparePage);
        });

        // Player rankings page
        router.register('/rankings/', () => {
            console.log('[ROUTE] Route: /rankings/');
            this.renderPage('rankings', RankingsPage);
        });

        // Team builder page
        router.register('/teams/', () => {
            console.log('[ROUTE] Route: /teams/');
            this.renderPage('teams', TeamsPage);
        });
    }

    /**
     * Render a page component
     * 
     * Complete page lifecycle management:
     * 1. Destroy current page (cleanup, event unsubscribe)
     * 2. Clear container DOM
     * 3. Create new page instance
     * 4. Mount page to DOM (render, attach events)
     * 5. Update navigation active state
     * 6. Scroll to top of page
     * 
     * Error Handling:
     * - Creation errors: Show error state in container
     * - Mount errors: Show reload button
     * - All errors logged to console
     * 
     * Performance:
     * - No page caching (always fresh instance)
     * - Automatic cleanup prevents memory leaks
     * - Smooth transitions via scroll-to-top
     * 
     * @private
     * @param {string} name - Internal page identifier for logging
     * @param {Class} PageClass - Page component class to instantiate
     * @returns {void}
     */
    renderPage(name, PageClass) {
        console.log('[PAGE] Rendering page:', name);
        
        // Step 1: Cleanup - Destroy current page
        if (this.currentPage) {
            console.log('[CLEANUP] Destroying previous page');
            try {
                this.currentPage.destroy();
            } catch (error) {
                console.error('[ERROR] Error destroying page:', error);
            }
            this.currentPage = null;
        }

        // Step 2: Get main container element
        const container = document.getElementById('appMain');
        if (!container) {
            console.error('[ERROR] App container #appMain not found!');
            return;
        }
        
        // Step 3: Clear container content
        container.innerHTML = '';
        
        // Step 4: Create new page instance
        console.log('[CREATE] Creating new page instance:', PageClass.name);
        let page;

        try {
            // Pass activity config, activity key, and services to all pages via props
            page = new PageClass(container, {
                activityConfig: this.activityConfig.config,
                activityKey: this.activityConfig.key,
                services: this.services
            });
        } catch (error) {
            console.error('[ERROR] Error creating page:', error);
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">${getIcon('alert', { size: 48, color: 'var(--color-warning, #f59e0b)' })}</div>
                    <p>Failed to create page: ${this.escape(error.message)}</p>
                </div>
            `;
            return;
        }

        // Step 5: Mount page to DOM
        try {
            console.log('[MOUNT] Mounting page...');
            page.mount();
            this.currentPage = page;
            console.log('[OK] Page mounted successfully');
        } catch (error) {
            console.error('[ERROR] Error mounting page:', error);
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">${getIcon('alert', { size: 48, color: 'var(--color-warning, #f59e0b)' })}</div>
                    <p>Failed to load page: ${this.escape(error.message)}</p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        ${getIcon('refresh', { size: 16, className: 'btn-icon' })}
                        Reload Page
                    </button>
                </div>
            `;
            return;
        }

        // Step 6: Update navigation active state
        this.updateNavigation();

        // Step 7: Scroll to top of page
        window.scrollTo(0, 0);
    }

    /**
     * Update navigation active state
     *
     * Highlights the current route's navigation link by adding
     * an 'active' class to the corresponding nav element.
     * Also disables Compare, Rankings, and Teams links when no activity is selected.
     *
     * Process:
     * 1. Query all navigation links with .nav-link class
     * 2. Check if activity is selected
     * 3. Disable/enable relevant links based on activity selection
     * 4. Check each link's data-route attribute
     * 5. Compare with current router route
     * 6. Add/remove 'active' class accordingly
     *
     * This method is called:
     * - After page render
     * - On route change events
     * - During initial navigation
     *
     * @private
     * @returns {void}
     */
    updateNavigation() {
        const links = document.querySelectorAll('.nav-link');
        const currentActivity = storage.get('selectedActivity', null);
        const disabledRoutes = ['/compare/', '/rankings/', '/teams/'];

        links.forEach(link => {
            const route = link.getAttribute('data-route');

            // Disable Compare, Rankings, Teams if no activity selected
            if (!currentActivity && disabledRoutes.includes(route)) {
                link.classList.add('disabled');
                link.setAttribute('aria-disabled', 'true');
            } else {
                link.classList.remove('disabled');
                link.removeAttribute('aria-disabled');
            }

            // Update active state
            if (router.isActive(route)) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Setup navigation click handlers
     *
     * Prevents navigation to disabled routes when no activity is selected.
     * Shows a toast message to guide the user to select an activity first.
     *
     * @private
     * @returns {void}
     */
    setupNavigationHandlers() {
        const links = document.querySelectorAll('.nav-link');
        const disabledRoutes = ['/compare/', '/rankings/', '/teams/'];

        links.forEach(link => {
            link.addEventListener('click', (e) => {
                const route = link.getAttribute('data-route');
                const currentActivity = storage.get('selectedActivity', null);

                // Prevent navigation if no activity selected and route is disabled
                if (!currentActivity && disabledRoutes.includes(route)) {
                    e.preventDefault();
                    toast.error('Please select an activity type first');
                }
            });
        });
    }

    /**
     * Setup global event listeners
     *
     * Subscribes to application-wide events for cross-component communication.
     * Uses EventBus for loose coupling between components.
     *
     * Event Categories:
     * - State Management: load, save, migration
     * - Player Operations: add, remove, update, reset
     * - Comparison Operations: completed
     * - Route Changes: navigation updates
     * - Error Handling: save/load failures
     *
     * All event handlers show appropriate toast notifications
     * for user feedback on important operations.
     *
     * @private
     * @returns {void}
     */
    setupEventListeners() {
        // State management events
        eventBus.on('state:loaded', () => {
            console.log('[State] Loaded from storage');
        });

        eventBus.on('state:saved', () => {
            console.log('[State] Saved to storage');
        });

        eventBus.on('state:migrated', (data) => {
            toast.success(`Data migrated to v${data.to}`, 3000);
        });

        // Player management events
        eventBus.on('player:added', (player) => {
            toast.success(`Player "${player.name}" added!`, 2000);
        });

        eventBus.on('player:removed', (player) => {
            toast.info(`Player "${player.name}" removed`, 2000);
        });

        eventBus.on('player:updated', (player) => {
            toast.success(`Player "${player.name}" updated`, 2000);
        });

        eventBus.on('player:reset', (data) => {
            const posNames = data.positions
                .map(p => this.getPositionName(p))
                .join(', ');
            toast.success(`Reset ${posNames} for ${data.player.name}`, 2500);
        });

        eventBus.on('players:reset-all-positions', (data) => {
            const posNames = data.positions
                .map(p => this.getPositionName(p))
                .join(', ');
            toast.success(
                `Reset ${posNames} for ${data.playersAffected} players`, 
                3000
            );
        });

        // Comparison events
        eventBus.on('comparison:completed', (data) => {
            const posName = this.getPositionName(data.position);
            toast.success(
                `${data.winner.name} defeats ${data.loser.name} at ${posName}!`,
                2500
            );
        });

        // Route change events
        eventBus.on('route:changed', () => {
            this.updateNavigation();
        });

        // Error events
        eventBus.on('state:save-error', () => {
            toast.error('Failed to save data', 3000);
        });

        eventBus.on('state:load-error', () => {
            toast.error('Failed to load saved data', 3000);
        });

        // Window lifecycle events
        window.addEventListener('beforeunload', () => {
            // State auto-saves via debouncing in StateManager
            // No explicit action needed here
        });
    }

    /**
     * Setup global error handlers
     * 
     * Catches unhandled errors and promise rejections at the window level.
     * Provides last line of defense against uncaught errors.
     * 
     * Handlers:
     * - window.error: Synchronous errors
     * - window.unhandledrejection: Promise rejections
     * 
     * Actions:
     * - Log error to console for debugging
     * - Show user-friendly toast notification
     * - Prevent application crash
     * 
     * Note: Does not prevent error propagation, only handles it gracefully.
     * 
     * @private
     * @returns {void}
     */
    setupErrorHandling() {
        // Global synchronous error handler
        window.addEventListener('error', (event) => {
            console.error('[Global Error]', event.error);
            toast.error('An unexpected error occurred', 3000);
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[Unhandled Promise Rejection]', event.reason);
            toast.error('An unexpected error occurred', 3000);
        });
    }

    /**
     * Show fatal error screen
     * 
     * Displays a user-friendly error message when the application
     * fails to initialize or encounters a critical unrecoverable error.
     * 
     * Used for:
     * - Initialization failures
     * - Critical module load errors
     * - Fatal runtime errors
     * 
     * Provides:
     * - Clear error message
     * - Reload button for recovery
     * - Professional error UI
     * 
     * @private
     * @param {Error} error - Error object with message
     * @returns {void}
     */
    showFatalError(error) {
        const container = document.getElementById('appMain');
        if (container) {
            container.innerHTML = `
                <div class="error-container">
                    <h2>${getIcon('alert', { size: 32, color: 'var(--color-warning, #f59e0b)' })} Application Error</h2>
                    <p>Failed to load ${APP_CONFIG.NAME}</p>
                    <p class="error-message">${this.escape(error.message)}</p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        ${getIcon('refresh', { size: 16, className: 'btn-icon' })}
                        Reload Page
                    </button>
                </div>
            `;
        }
    }

    /**
     * Get human-readable position name
     *
     * Converts position codes to full display names.
     * Used throughout the application for consistent display.
     * Uses positions from activity config for consistency.
     *
     * @private
     * @param {string} pos - Position code
     * @returns {string} Position full name or original code if unknown
     */
    getPositionName(pos) {
        return this.activityConfig.config.positions[pos] || pos;
    }

    /**
     * Safely escape HTML string
     * 
     * Prevents XSS attacks by escaping HTML special characters.
     * Used whenever user input or dynamic content is displayed.
     * 
     * Escapes:
     * - & → &amp;
     * - < → &lt;
     * - > → &gt;
     * - " → &quot;
     * - ' → &#039;
     * 
     * Security Note:
     * This is a basic XSS prevention measure. Always validate
     * and sanitize user input on both client and server.
     * 
     * @private
     * @param {string} text - Text to escape
     * @returns {string} Escaped text safe for HTML insertion
     */
    escape(text) {
        return escapeHtml(text);
    }

    /**
     * Get application information
     * 
     * Returns diagnostic information for debugging and monitoring.
     * Accessible via browser console: window.app.getInfo()
     * 
     * Information includes:
     * - Application version
     * - Current route and page
     * - State statistics
     * - Redirect configuration
     * 
     * Usage:
     * ```javascript
     * console.log(window.app.getInfo());
     * ```
     * 
     * @public
     * @returns {Object} Application diagnostic information
     */
    getInfo() {
        return {
            version: APP_CONFIG.VERSION,
            name: APP_CONFIG.NAME,
            currentRoute: router.currentRoute,
            currentPage: this.currentPage?.constructor.name,
            stats: stateManager.getStats(),
            redirectConfig: redirectModule.getConfig()
        };
    }
}

// =============================================================================
// Application Bootstrap
// =============================================================================

/**
 * Create and initialize application instance
 * 
 * This executes immediately when the module loads.
 * The application instance becomes available globally for debugging.
 */
const app = new Application();
app.init();

// =============================================================================
// Global Exports (for debugging and testing)
// =============================================================================

/**
 * Expose application instance globally
 * Useful for debugging in browser console
 * @global
 */
window.app = app;

/**
 * Expose toast globally for manual notifications
 * Useful for debugging and testing
 * @global
 */
window.toast = toast;

// =============================================================================
// Module Export
// =============================================================================

/**
 * Export application instance as default
 * @exports Application
 */
export default app;
