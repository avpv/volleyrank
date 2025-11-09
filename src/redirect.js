// src/redirect.js

/**
 * 404 Redirect Handler
 *
 * Handles seamless client-side routing for Single Page Applications
 * deployed on GitHub Pages. Uses sessionStorage for invisible redirects
 * with query parameter fallback for maximum compatibility.
 * 
 * Architecture Flow:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ 1. User requests deep route (e.g., /teams/)                     │
 * │ 2. GitHub Pages serves 404.html (route doesn't exist)           │
 * │ 3. This module captures path and stores in sessionStorage       │
 * │ 4. Redirects to clean home URL                                  │
 * │ 5. Main app reads sessionStorage and routes correctly           │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * Benefits:
 * - Clean URLs (no query parameters visible to user)
 * - Invisible redirect (no flash/flicker)
 * - Professional UX (seamless navigation)
 * - SEO-friendly (proper URL structure)
 * - Fallback support (query params for compatibility)
 * 
 * Usage:
 * ```javascript
 * // In 404.html (automatic execution)
 * <script type="module" src="/team-balance/src/redirect.js"></script>
 *
 * // In app.js (restore path)
 * import redirectModule from './redirect.js';
 * const storedPath = redirectModule.restore();
 * ```
 *
 * @module redirect
 * @version 4.0.0
 * @license MIT
 */

/* =============================================================================
   Configuration
   ============================================================================= */

/**
 * Redirect configuration constants
 * 
 * Centralized configuration for all redirect behavior.
 * Modify these values to customize for different deployments.
 * 
 * @constant {Object}
 * @property {string} BASE_URL - Base URL for GitHub Pages deployment
 * @property {string} STORAGE_KEY - SessionStorage key for path preservation
 * @property {string} QUERY_PARAM - Query parameter name for fallback method
 * @property {boolean} DEBUG - Enable detailed debug logging
 */
const REDIRECT_CONFIG = {
    BASE_URL: '/team-balance',
    STORAGE_KEY: 'team-balance_redirect_path',
    QUERY_PARAM: 'redirect',
    DEBUG: false
};

/* =============================================================================
   Logger Utility
   ============================================================================= */

/**
 * Logger utility for structured logging
 * 
 * Provides consistent logging format with prefixes.
 * Respects DEBUG flag for verbose logging.
 * 
 * @namespace
 * @private
 */
const logger = {
    /**
     * Log informational message
     * Always visible, used for important flow information
     * 
     * @param {string} message - Log message
     * @param {...*} args - Additional arguments to log
     * @returns {void}
     */
    info(message, ...args) {
        console.info(`[Redirect] ${message}`, ...args);
    },
    
    /**
     * Log warning message
     * Used for non-critical issues or fallback scenarios
     * 
     * @param {string} message - Warning message
     * @param {...*} args - Additional arguments to log
     * @returns {void}
     */
    warn(message, ...args) {
        console.warn(`[Redirect] ${message}`, ...args);
    },
    
    /**
     * Log error message
     * Used for errors and exceptions
     * 
     * @param {string} message - Error message
     * @param {...*} args - Additional arguments to log
     * @returns {void}
     */
    error(message, ...args) {
        console.error(`[Redirect] ${message}`, ...args);
    },
    
    /**
     * Log debug message
     * Only visible when DEBUG flag is enabled
     * Used for detailed flow information during development
     * 
     * @param {string} message - Debug message
     * @param {...*} args - Additional arguments to log
     * @returns {void}
     */
    debug(message, ...args) {
        if (REDIRECT_CONFIG.DEBUG) {
            console.log(`[Redirect:Debug] ${message}`, ...args);
        }
    }
};

/* =============================================================================
   Path Utilities
   ============================================================================= */

/**
 * Path utilities for URL manipulation
 * 
 * Provides safe and consistent path manipulation functions.
 * Handles edge cases and normalization.
 * 
 * @namespace
 * @private
 */
const PathUtils = {
    /**
     * Check if current path is home page
     * 
     * Determines if we're already on the home page to avoid
     * unnecessary redirects.
     * 
     * @returns {boolean} True if on home page
     */
    isHomePage() {
        const pathname = window.location.pathname;
        const homePaths = [
            REDIRECT_CONFIG.BASE_URL + '/',
            REDIRECT_CONFIG.BASE_URL + '/index.html'
        ];
        return homePaths.includes(pathname);
    },
    
    /**
     * Extract application path from current URL
     * 
     * Removes base URL prefix and normalizes the path.
     * Ensures path always starts with forward slash.
     * 
     * Process:
     * 1. Get current pathname
     * 2. Remove base URL if present
     * 3. Ensure path starts with /
     * 4. Return normalized path
     * 
     * Examples:
     * - /team-balance/teams/ → /teams/
     * - /team-balance/compare/ → /compare/
     * - /teams/ → /teams/
     * 
     * @returns {string} Application path without base URL
     */
    extractAppPath() {
        const pathname = window.location.pathname;
        
        logger.debug('Current pathname:', pathname);
        
        // Remove base URL from pathname
        let appPath = pathname.startsWith(REDIRECT_CONFIG.BASE_URL)
            ? pathname.substring(REDIRECT_CONFIG.BASE_URL.length)
            : pathname;
        
        // Ensure path starts with /
        if (!appPath.startsWith('/')) {
            appPath = '/' + appPath;
        }
        
        logger.debug('Extracted app path:', appPath);
        
        return appPath;
    },
    
    /**
     * Normalize path for consistency
     * 
     * Ensures path is in standard format:
     * - Always starts with /
     * - Root path is exactly /
     * 
     * @param {string} path - Path to normalize
     * @returns {string} Normalized path
     */
    normalize(path) {
        if (!path || path === '/') return '/';
        
        // Ensure starts with /
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        
        return path;
    }
};

/* =============================================================================
   Storage Utilities
   ============================================================================= */

/**
 * Storage utilities for sessionStorage operations
 * 
 * Provides safe wrapper around sessionStorage API with error handling.
 * Gracefully handles browsers with storage disabled or in private mode.
 * 
 * @namespace
 * @private
 */
const StorageUtils = {
    /**
     * Check if sessionStorage is available
     * 
     * Tests actual functionality rather than just presence.
     * Some browsers block storage in private mode.
     * 
     * Process:
     * 1. Try to write test value
     * 2. Read it back
     * 3. Remove test value
     * 4. Return true if successful
     * 
     * @returns {boolean} True if sessionStorage is available and working
     */
    isAvailable() {
        try {
            const test = '__storage_test__';
            sessionStorage.setItem(test, test);
            sessionStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    /**
     * Store path in sessionStorage
     * 
     * Saves the path for later retrieval by main application.
     * 
     * @param {string} path - Path to store
     * @returns {boolean} True if successful, false otherwise
     */
    storePath(path) {
        try {
            sessionStorage.setItem(REDIRECT_CONFIG.STORAGE_KEY, path);
            logger.info('Path stored in sessionStorage:', path);
            return true;
        } catch (error) {
            logger.error('Failed to store path:', error);
            return false;
        }
    },
    
    /**
     * Retrieve path from sessionStorage
     * 
     * Reads the stored path without removing it.
     * Removal is done separately via clearPath().
     * 
     * @returns {string|null} Stored path or null if not found
     */
    retrievePath() {
        try {
            const path = sessionStorage.getItem(REDIRECT_CONFIG.STORAGE_KEY);
            if (path) {
                logger.info('Path retrieved from sessionStorage:', path);
            }
            return path;
        } catch (error) {
            logger.error('Failed to retrieve path:', error);
            return null;
        }
    },
    
    /**
     * Clear stored path from sessionStorage
     * 
     * Removes the path after successful retrieval.
     * Ensures path is only used once.
     * 
     * @returns {boolean} True if successful, false otherwise
     */
    clearPath() {
        try {
            sessionStorage.removeItem(REDIRECT_CONFIG.STORAGE_KEY);
            logger.debug('Stored path cleared');
            return true;
        } catch (error) {
            logger.error('Failed to clear path:', error);
            return false;
        }
    }
};

/* =============================================================================
   Redirect Manager
   ============================================================================= */

/**
 * Redirect Manager
 * 
 * Main class that orchestrates the redirect logic.
 * Handles both execution (from 404.html) and restoration (from app.js).
 * 
 * Responsibilities:
 * - Capture current path from 404 page
 * - Store path in sessionStorage (or query param fallback)
 * - Redirect to clean home URL
 * - Restore path for main application
 * - Provide configuration access
 * 
 * @class
 */
class RedirectManager {
    /**
     * Initialize redirect manager
     * 
     * @constructor
     */
    constructor() {
        /** @private {Object} Configuration reference */
        this.config = REDIRECT_CONFIG;
    }
    
    /**
     * Execute redirect from 404 page
     * 
     * Main entry point when loaded from 404.html.
     * Captures the requested path and redirects to home.
     * 
     * Flow:
     * 1. Check if on home page → skip redirect
     * 2. Extract application path from URL
     * 3. Validate path is not root
     * 4. Try to store in sessionStorage
     * 5. If successful → redirect to clean home URL
     * 6. If failed → use query parameter fallback
     * 
     * Examples:
     * - User visits /teams/ → stores "/teams/", redirects to /
     * - User visits / → no action needed
     * - Storage blocked → redirects to /?redirect=/teams/
     * 
     * @public
     * @returns {void}
     */
    execute() {
        try {
            logger.debug('Executing redirect handler');
            
            // Step 1: Skip if already on home page
            if (PathUtils.isHomePage()) {
                logger.debug('Already on home page, no redirect needed');
                return;
            }
            
            // Step 2: Extract application path
            const appPath = PathUtils.extractAppPath();
            
            // Step 3: Validate path
            if (!appPath || appPath === '/') {
                logger.debug('Root path detected, redirecting to home');
                this.redirectToHome();
                return;
            }
            
            // Step 4: Try sessionStorage method (preferred)
            if (StorageUtils.isAvailable() && StorageUtils.storePath(appPath)) {
                // Success: redirect to clean URL
                logger.info('Using sessionStorage method');
                this.redirectToHome();
            } else {
                // Fallback: use query parameter
                logger.warn('SessionStorage unavailable, using query parameter fallback');
                this.redirectWithQueryParam(appPath);
            }
            
        } catch (error) {
            logger.error('Redirect execution failed:', error);
            // Safe fallback: go to home
            this.redirectToHome();
        }
    }
    
    /**
     * Redirect to home page with clean URL
     * 
     * Redirects to the base home URL without any parameters.
     * Uses window.location.replace() to avoid adding to history.
     * 
     * @private
     * @returns {void}
     */
    redirectToHome() {
        const homeUrl = this.config.BASE_URL + '/';
        logger.debug('Redirecting to:', homeUrl);
        window.location.replace(homeUrl);
    }
    
    /**
     * Redirect with query parameter (fallback method)
     * 
     * Used when sessionStorage is unavailable (private mode, disabled).
     * Adds path as query parameter for app.js to read.
     * 
     * @private
     * @param {string} path - Path to preserve in query parameter
     * @returns {void}
     */
    redirectWithQueryParam(path) {
        const encodedPath = encodeURIComponent(path);
        const redirectUrl = `${this.config.BASE_URL}/?${this.config.QUERY_PARAM}=${encodedPath}`;
        logger.debug('Redirecting to:', redirectUrl);
        window.location.replace(redirectUrl);
    }
    
    /**
     * Restore path from storage (used by main app)
     * 
     * Returns the stored path and clears it from storage.
     * This should be called by the main application during initialization.
     * 
     * Process:
     * 1. Try to retrieve path from sessionStorage
     * 2. If found, clear it immediately (single-use)
     * 3. Return the path
     * 
     * Usage in app.js:
     * ```javascript
     * const storedPath = redirectModule.restore();
     * if (storedPath) {
     *     // Route to stored path
     *     router.navigateTo(storedPath);
     * }
     * ```
     * 
     * @public
     * @returns {string|null} Stored path or null if not found
     */
    restore() {
        const path = StorageUtils.retrievePath();
        
        if (path) {
            // Clear immediately after retrieval (single-use token pattern)
            StorageUtils.clearPath();
            logger.info('Path restored and cleared:', path);
        }
        
        return path;
    }
    
    /**
     * Get current configuration
     * 
     * Returns a copy of the configuration object.
     * Useful for debugging and diagnostics.
     * 
     * @public
     * @returns {Object} Configuration object (copy)
     */
    getConfig() {
        return { ...this.config };
    }
}

/* =============================================================================
   Module Initialization
   ============================================================================= */

/**
 * Module initialization function
 * 
 * Automatically executes when module loads.
 * Determines context (404.html vs app.js) and acts accordingly.
 * 
 * Context Detection:
 * - If window.app exists → Main app loaded, provide restore function only
 * - If window.app undefined → 404.html context, execute redirect
 * 
 * This smart initialization allows the same module to be used
 * in both contexts without configuration.
 * 
 * @private
 * @returns {void}
 */
function init() {
    // Detect if main application is already loaded
    const isMainAppLoaded = window.app !== undefined;
    
    if (!isMainAppLoaded) {
        // We're on 404.html, execute redirect immediately
        logger.debug('Initializing from 404.html context');
        const manager = new RedirectManager();
        manager.execute();
    } else {
        // Main app is loaded, just provide restore capability
        logger.debug('Module loaded in main app context');
    }
}

// Execute initialization immediately
init();

/* =============================================================================
   Module Exports
   ============================================================================= */

/**
 * Public API for redirect module
 * 
 * Provides clean interface for main application to restore paths
 * and access configuration.
 * 
 * @exports
 */
export default {
    /**
     * Restore path from sessionStorage
     * 
     * Primary method for main application to retrieve stored path.
     * Path is automatically cleared after retrieval.
     * 
     * @returns {string|null} Stored path or null
     * @example
     * ```javascript
     * import redirectModule from './redirect.js';
     * const path = redirectModule.restore();
     * if (path) {
     *     console.log('Restoring path:', path);
     * }
     * ```
     */
    restore() {
        const manager = new RedirectManager();
        return manager.restore();
    },
    
    /**
     * Get configuration (read-only)
     * 
     * Returns copy of configuration for debugging.
     * Modifications to returned object don't affect actual config.
     * 
     * @returns {Object} Configuration object copy
     * @example
     * ```javascript
     * const config = redirectModule.getConfig();
     * console.log('Base URL:', config.BASE_URL);
     * ```
     */
    getConfig() {
        const manager = new RedirectManager();
        return manager.getConfig();
    }
};

/* =============================================================================
   Type Definitions (JSDoc for TypeScript compatibility)
   ============================================================================= */

/**
 * Redirect configuration type
 * @typedef {Object} RedirectConfig
 * @property {string} BASE_URL - Base URL for deployment
 * @property {string} STORAGE_KEY - SessionStorage key
 * @property {string} QUERY_PARAM - Query parameter name
 * @property {boolean} DEBUG - Debug mode flag
 */

/**
 * Logger interface
 * @typedef {Object} Logger
 * @property {Function} info - Log info message
 * @property {Function} warn - Log warning message
 * @property {Function} error - Log error message
 * @property {Function} debug - Log debug message
 */

/**
 * Path utilities interface
 * @typedef {Object} PathUtils
 * @property {Function} isHomePage - Check if on home page
 * @property {Function} extractAppPath - Extract app path from URL
 * @property {Function} normalize - Normalize path format
 */

/**
 * Storage utilities interface
 * @typedef {Object} StorageUtils
 * @property {Function} isAvailable - Check storage availability
 * @property {Function} storePath - Store path in storage
 * @property {Function} retrievePath - Retrieve stored path
 * @property {Function} clearPath - Clear stored path
 */
