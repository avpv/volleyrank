/**
 * Application Bootstrap
 * 
 * Main application entry point that initializes the entire VolleyRank SPA.
 * Handles routing, state management, and global event coordination.
 * 
 * @module app
 * @requires core/Router
 * @requires core/EventBus
 * @requires core/StateManager
 * @requires components/base/Toast
 * @version 4.0.0
 */

import router from './core/Router.js';
import eventBus from './core/EventBus.js';
import stateManager from './core/StateManager.js';
import toast from './components/base/Toast.js';

// Page imports
import SettingsPage from './pages/SettingsPage.js';
import ComparePage from './pages/ComparePage.js';
import RankingsPage from './pages/RankingsPage.js';
import TeamsPage from './pages/TeamsPage.js';

/**
 * Main Application Class
 * 
 * Orchestrates application lifecycle, routing, and page management.
 * Implements singleton pattern for global application instance.
 * 
 * @class Application
 */
class Application {
    /**
     * Initialize application instance
     * @constructor
     */
    constructor() {
        /** @private {BasePage|null} Current active page instance */
        this.currentPage = null;
        
        /** @private {string|null} Initial path from 404 redirect */
        this.initialPath = null;
    }

    /**
     * Initialize application
     * 
     * Bootstrap sequence:
     * 1. Handle GitHub Pages redirect
     * 2. Load persisted state
     * 3. Setup event listeners
     * 4. Register routes
     * 5. Initialize router
     * 6. Setup error handlers
     * 
     * @async
     * @returns {Promise<void>}
     * @throws {Error} If critical initialization fails
     */
    async init() {
        try {
            console.log('🏐 Initializing VolleyRank v4.0...');

            // Handle GitHub Pages 404 redirect
            this.handleRedirect();

            // Load persisted application state
            const loaded = stateManager.load();
            if (loaded) {
                console.log('✓ State loaded from storage');
            } else {
                console.log('✓ Starting with fresh state');
            }

            // Setup global event listeners
            this.setupEventListeners();

            // Register application routes
            this.registerRoutes();

            // Update navigation UI
            this.updateNavigation();

            // Initialize router with initial path if available
            if (this.initialPath) {
                router.initialPath = this.initialPath;
            }
            router.init();

            // Setup global error handlers
            this.setupErrorHandling();

            console.log('✓ VolleyRank initialized successfully');

            // Show welcome message for first-time users
            if (!loaded) {
                toast.info('Welcome to VolleyRank! Add players to get started.', 5000);
            }

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showFatalError(error);
        }
    }

    /**
     * Handle GitHub Pages redirect
     * 
     * Processes the 'redirect' query parameter set by 404.html,
     * extracts the original path, and prepares it for routing.
     * 
     * @private
     * @returns {void}
     */
    handleRedirect() {
        const url = new URL(window.location);
        
        // Check for redirect parameter from 404.html
        if (url.searchParams.has('redirect')) {
            const redirectPath = url.searchParams.get('redirect');
            console.log('🔄 Handling redirect from 404:', redirectPath);
            
            // Remove redirect parameter from URL
            url.searchParams.delete('redirect');
            
            // Build full path with base URL
            const fullPath = router.basePath + redirectPath;
            
            // Update browser URL without reload
            window.history.replaceState(
                { path: redirectPath }, 
                '', 
                fullPath
            );
            
            // Store for router initialization
            this.initialPath = redirectPath;
        }
    }

    /**
     * Register application routes
     * 
     * Maps URL paths to page components. Each route handler
     * is responsible for rendering the appropriate page.
     * 
     * @private
     * @returns {void}
     */
    registerRoutes() {
        // Home/Settings page
        router.register('/', () => {
            console.log('📍 Route: / (Settings)');
            this.renderPage('settings', SettingsPage);
        });

        // Player comparison page
        router.register('/compare/', () => {
            console.log('📍 Route: /compare/');
            this.renderPage('compare', ComparePage);
        });

        // Player rankings page
        router.register('/rankings/', () => {
            console.log('📍 Route: /rankings/');
            this.renderPage('rankings', RankingsPage);
        });

        // Team builder page
        router.register('/teams/', () => {
            console.log('📍 Route: /teams/');
            this.renderPage('teams', TeamsPage);
        });
    }

    /**
     * Render a page component
     * 
     * Lifecycle:
     * 1. Destroy current page if exists
     * 2. Clear container
     * 3. Create new page instance
     * 4. Mount page to DOM
     * 5. Update navigation state
     * 
     * @private
     * @param {string} name - Internal page identifier
     * @param {Class} PageClass - Page component class
     * @returns {void}
     */
    renderPage(name, PageClass) {
        console.log('📄 Rendering page:', name);
        
        // Cleanup: Destroy current page
        if (this.currentPage) {
            console.log('🗑️ Destroying previous page');
            try {
                this.currentPage.destroy();
            } catch (error) {
                console.error('❌ Error destroying page:', error);
            }
            this.currentPage = null;
        }

        // Get main container element
        const container = document.getElementById('appMain');
        if (!container) {
            console.error('❌ App container #appMain not found!');
            return;
        }
        
        // Clear container content
        container.innerHTML = '';
        
        // Create new page instance
        console.log('🆕 Creating new page instance:', PageClass.name);
        let page;
        
        try {
            page = new PageClass(container);
        } catch (error) {
            console.error('❌ Error creating page:', error);
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <p>Failed to create page: ${this.escape(error.message)}</p>
                </div>
            `;
            return;
        }

        // Mount page to DOM
        try {
            console.log('⬆️ Mounting page...');
            page.mount();
            this.currentPage = page;
            console.log('✅ Page mounted successfully');
        } catch (error) {
            console.error('❌ Error mounting page:', error);
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <p>Failed to load page: ${this.escape(error.message)}</p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        Reload Page
                    </button>
                </div>
            `;
            return;
        }

        // Update navigation active state
        this.updateNavigation();

        // Scroll to top of page
        window.scrollTo(0, 0);
    }

    /**
     * Update navigation active state
     * 
     * Highlights the current route's navigation link by adding
     * an 'active' class to the corresponding nav element.
     * 
     * @private
     * @returns {void}
     */
    updateNavigation() {
        const links = document.querySelectorAll('.nav-link');
        
        links.forEach(link => {
            const route = link.getAttribute('data-route');
            if (router.isActive(route)) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Setup global event listeners
     * 
     * Subscribes to application-wide events for:
     * - State management
     * - Player operations
     * - Comparison operations
     * - Routing changes
     * - Error handling
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
            // State auto-saves via debouncing
        });
    }

    /**
     * Setup global error handlers
     * 
     * Catches unhandled errors and promise rejections,
     * logs them for debugging, and shows user-friendly messages.
     * 
     * @private
     * @returns {void}
     */
    setupErrorHandling() {
        // Global error handler
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
     * fails to initialize or encounters a critical error.
     * 
     * @private
     * @param {Error} error - Error object
     * @returns {void}
     */
    showFatalError(error) {
        const container = document.getElementById('appMain');
        if (container) {
            container.innerHTML = `
                <div class="error-container">
                    <h2>⚠️ Application Error</h2>
                    <p>Failed to load VolleyRank</p>
                    <p class="error-message">${this.escape(error.message)}</p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }

    /**
     * Get human-readable position name
     * 
     * @private
     * @param {string} pos - Position code (S, OPP, OH, MB, L)
     * @returns {string} Position full name
     */
    getPositionName(pos) {
        const positions = {
            'S': 'Setter',
            'OPP': 'Opposite',
            'OH': 'Outside Hitter',
            'MB': 'Middle Blocker',
            'L': 'Libero'
        };
        return positions[pos] || pos;
    }

    /**
     * Safely escape HTML string
     * 
     * Prevents XSS attacks by escaping HTML special characters.
     * 
     * @private
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escape(text) {
        if (typeof text !== 'string') return '';
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Get application information
     * 
     * Returns diagnostic information for debugging purposes.
     * 
     * @public
     * @returns {Object} Application info object
     */
    getInfo() {
        return {
            version: '4.0.0',
            currentRoute: router.currentRoute,
            currentPage: this.currentPage?.constructor.name,
            stats: stateManager.getStats()
        };
    }
}

// Create and initialize application instance
const app = new Application();
app.init();

// Export for debugging and testing
window.app = app;
window.toast = toast;

export default app;
