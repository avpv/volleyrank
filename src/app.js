/**
 * Application Bootstrap
 * Initializes the entire application
 */
import router from './core/Router.js';
import eventBus from './core/EventBus.js';
import stateManager from './core/StateManager.js';
import toast from './components/base/Toast.js';

// Import pages
import SettingsPage from './pages/SettingsPage.js';
import ComparePage from './pages/ComparePage.js';
import RankingsPage from './pages/RankingsPage.js';
import TeamsPage from './pages/TeamsPage.js';

class Application {
    constructor() {
        this.currentPage = null;
        this.pages = new Map();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            console.log('🏐 Initializing VolleyRank v4.0...');

            // Handle GitHub Pages redirect
            this.handleRedirect();

            // Load saved state
            const loaded = stateManager.load();
            if (loaded) {
                console.log('✓ State loaded from storage');
            } else {
                console.log('✓ Starting with fresh state');
            }

            // Setup global event listeners
            this.setupEventListeners();

            // Register routes
            this.registerRoutes();

            // Update navigation
            this.updateNavigation();

            // Initialize router
            router.init();

            // Setup global error handler
            this.setupErrorHandling();

            console.log('✓ VolleyRank initialized successfully');

            // Show welcome toast if first visit
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
     */
    handleRedirect() {
        // Simply clean any redirect parameters from URL
        const url = new URL(window.location);
        if (url.searchParams.has('redirect')) {
            url.searchParams.delete('redirect');
            window.history.replaceState(null, '', url.pathname);
        }
    }

    /**
     * Register all routes
     */
    registerRoutes() {
        // Settings page (home)
        router.register('/', () => {
            this.renderPage('settings', SettingsPage);
        });

        // Compare page
        router.register('/compare/', () => {
            this.renderPage('compare', ComparePage);
        });

        // Rankings page
        router.register('/rankings/', () => {
            this.renderPage('rankings', RankingsPage);
        });

        // Teams page
        router.register('/teams/', () => {
            this.renderPage('teams', TeamsPage);
        });
    }

    /**
     * Render a page
     */
    renderPage(name, PageClass) {
        // Destroy current page
        if (this.currentPage) {
            this.currentPage.destroy();
            this.currentPage = null;
        }

        // Get or create page instance
        let page = this.pages.get(name);
        
        if (!page) {
            const container = document.getElementById('appMain');
            page = new PageClass(container);
            this.pages.set(name, page);
        }

        // Mount page
        page.mount();
        this.currentPage = page;

        // Update navigation
        this.updateNavigation();

        // Scroll to top
        window.scrollTo(0, 0);
    }

    /**
     * Update navigation active state
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
     */
    setupEventListeners() {
        // State events
        eventBus.on('state:loaded', () => {
            console.log('State loaded');
        });

        eventBus.on('state:saved', () => {
            console.log('State saved');
        });

        eventBus.on('state:migrated', (data) => {
            toast.success(`Data migrated to v${data.to}`, 3000);
        });

        // Player events
        eventBus.on('player:added', (player) => {
            toast.success(`Player "${player.name}" added!`, 2000);
        });

        eventBus.on('player:removed', (player) => {
            toast.info(`Player "${player.name}" removed`, 2000);
        });

        eventBus.on('player:updated', (player) => {
            toast.success(`Player "${player.name}" updated`, 2000);
        });

        // Comparison events
        eventBus.on('comparison:completed', (data) => {
            const posName = this.getPositionName(data.position);
            toast.success(
                `${data.winner.name} defeats ${data.loser.name} at ${posName}!`,
                2500
            );
        });

        // Route events
        eventBus.on('route:changed', (path) => {
            this.updateNavigation();
        });

        // Error events
        eventBus.on('state:save-error', (error) => {
            toast.error('Failed to save data', 3000);
        });

        eventBus.on('state:load-error', (error) => {
            toast.error('Failed to load saved data', 3000);
        });

        // Window events
        window.addEventListener('beforeunload', () => {
            // State saves automatically via debouncing
        });
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            toast.error('An unexpected error occurred', 3000);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            toast.error('An unexpected error occurred', 3000);
        });
    }

    /**
     * Show fatal error
     */
    showFatalError(error) {
        const container = document.getElementById('appMain');
        if (container) {
            container.innerHTML = `
                <div class="error-container">
                    <h2>⚠️ Application Error</h2>
                    <p>Failed to load VolleyRank</p>
                    <p class="error-message">${error.message}</p>
                    <button onclick="location.reload()">Reload Page</button>
                </div>
            `;
        }
    }

    /**
     * Get position name helper
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
     * Get app info for debugging
     */
    getInfo() {
        return {
            version: '4.0.0',
            currentRoute: router.currentRoute,
            currentPage: this.currentPage?.constructor.name,
            stats: stateManager.getStats(),
            registeredPages: Array.from(this.pages.keys())
        };
    }
}

// Create and initialize application
const app = new Application();
app.init();

// Export for debugging
window.app = app;
window.toast = toast;

export default app;
