/**
 * AppInitializer
 * 
 * Handles the initialization sequence of the application.
 * Extracts bootstrap logic from the main Application class to improve
 * separation of concerns and testability.
 */
import router from './Router.js';
import eventBus from './EventBus.js';
import stateManager from './StateManager.js';
import toast from '../components/base/Toast.js';
import uiConfig from '../config/ui.js';
import redirectModule from '../redirect.js';
import { initializeActivities, activities } from '../config/activities/index.js';
import { initializeServices } from '../config/services.js';
import storage from './StorageAdapter.js';
import { STORAGE_KEYS } from '../utils/constants.js';

const { APP_MAIN, TOAST } = uiConfig;

class AppInitializer {
    constructor(app) {
        this.app = app;
    }

    /**
     * Run the full initialization sequence
     * @returns {Promise<void>}
     */
    async run() {
        try {
            // Step 0: Initialize activities (load all activity configs)
            await initializeActivities();

            // Reload activity config after activities are initialized
            this.app.activityConfig = this.app.loadActivityConfig();

            // Step 1: Initialize services with activity config (or null if none selected)
            const configForServices = this.app.activityConfig ? this.app.activityConfig.config : null;
            this.app.services = initializeServices(configForServices);

            // Step 2: Handle GitHub Pages 404 redirect
            this.handleRedirect();

            // Step 3: Load persisted application state
            const loaded = stateManager.load();

            // Step 3.1: Ensure active session exists for current activity (only if activity selected)
            if (this.app.activityConfig) {
                const sessionService = this.app.services.resolve('sessionService');
                sessionService.ensureActiveSession(this.app.activityConfig.key);
            }

            // Step 4: Setup global event listeners
            this.app.setupEventListeners();

            // Step 3.5: Setup navigation click handlers
            this.app.setupNavigationHandlers();

            // Step 4: Register application routes
            this.app.registerRoutes();

            // Step 5: Update navigation UI
            this.app.updateNavigation();

            // Step 6: Initialize router with initial path if available
            if (this.app.initialPath) {
                router.initialPath = this.app.initialPath;
            }
            router.init();

            // Step 7: Setup global error handlers
            this.app.setupErrorHandling();

            // Step 8: Show welcome message for first-time users
            if (!loaded) {
                const appName = 'TeamBalance'; // Or get from config if available globally
                toast.info(
                    `Welcome to ${appName}! Add players to get started.`,
                    5000 // Default welcome duration
                );
            }

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.app.showFatalError(error);
        }
    }

    /**
     * Handle GitHub Pages redirect
     * @private
     */
    handleRedirect() {
        // Method 1: Try to restore from sessionStorage (cleanest approach)
        const storedPath = redirectModule.restore();

        if (storedPath) {
            // Update browser URL to correct path (no query params)
            const fullPath = router.basePath + storedPath;
            window.history.replaceState(
                { path: storedPath },
                '',
                fullPath
            );

            // Store for router initialization
            this.app.initialPath = storedPath;

            return;
        }

        // Method 2: Fallback to query parameter (compatibility)
        const url = new URL(window.location);

        if (url.searchParams.has('redirect')) {
            const redirectPath = url.searchParams.get('redirect');

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
            this.app.initialPath = redirectPath;
        }
    }
}

export default AppInitializer;
