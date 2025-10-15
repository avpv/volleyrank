/**
 * 404 Redirect Handler
 * 
 * Handles seamless client-side routing for Single Page Applications
 * deployed on GitHub Pages. Uses sessionStorage for invisible redirects
 * with query parameter fallback for compatibility.
 * 
 * Architecture:
 * 1. User requests deep route (e.g., /teams/)
 * 2. GitHub Pages serves 404.html
 * 3. This module captures path and stores in sessionStorage
 * 4. Redirects to clean home URL
 * 5. Main app reads sessionStorage and routes correctly
 * 
 * Benefits:
 * - Clean URLs (no query parameters visible)
 * - Invisible to user (no flash/flicker)
 * - Professional UX
 * - SEO-friendly
 * 
 * @module redirect
 * @author VolleyRank Team
 * @version 4.0.0
 * @license MIT
 */

/**
 * Configuration constants
 * @constant {Object}
 */
const REDIRECT_CONFIG = {
    /** @property {string} Base URL for GitHub Pages deployment */
    BASE_URL: '/volleyrank',
    
    /** @property {string} SessionStorage key for path preservation */
    STORAGE_KEY: 'volleyrank_redirect_path',
    
    /** @property {string} Query parameter fallback name */
    QUERY_PARAM: 'redirect',
    
    /** @property {boolean} Enable debug logging */
    DEBUG: false
};

/**
 * Logger utility
 * @private
 */
const logger = {
    /**
     * Log info message
     * @param {string} message - Log message
     * @param {...*} args - Additional arguments
     */
    info(message, ...args) {
        console.info(`[Redirect] ${message}`, ...args);
    },
    
    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {...*} args - Additional arguments
     */
    warn(message, ...args) {
        console.warn(`[Redirect] ${message}`, ...args);
    },
    
    /**
     * Log error message
     * @param {string} message - Error message
     * @param {...*} args - Additional arguments
     */
    error(message, ...args) {
        console.error(`[Redirect] ${message}`, ...args);
    },
    
    /**
     * Log debug message (only if DEBUG enabled)
     * @param {string} message - Debug message
     * @param {...*} args - Additional arguments
     */
    debug(message, ...args) {
        if (REDIRECT_CONFIG.DEBUG) {
            console.log(`[Redirect:Debug] ${message}`, ...args);
        }
    }
};

/**
 * Path utilities
 * @private
 */
const PathUtils = {
    /**
     * Check if current path is home page
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
     * Removes base URL and normalizes the path
     * @returns {string} Application path
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

/**
 * Storage utilities
 * @private
 */
const StorageUtils = {
    /**
     * Check if sessionStorage is available
     * @returns {boolean} True if available
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
     * @param {string} path - Path to store
     * @returns {boolean} True if successful
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
     * @returns {string|null} Stored path or null
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
     * Clear stored path
     * @returns {boolean} True if successful
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

/**
 * Redirect Manager
 * Main class that handles the redirect logic
 * @class
 */
class RedirectManager {
    /**
     * Initialize redirect manager
     * @constructor
     */
    constructor() {
        this.config = REDIRECT_CONFIG;
    }
    
    /**
     * Execute redirect from 404 page
     * 
     * Flow:
     * 1. Check if on home page (skip redirect)
     * 2. Extract application path
     * 3. Store in sessionStorage (or use query param fallback)
     * 4. Redirect to clean home URL
     * 
     * @public
     * @returns {void}
     */
    execute() {
        try {
            logger.debug('Executing redirect handler');
            
            // Skip if already on home page
            if (PathUtils.isHomePage()) {
                logger.debug('Already on home page, no redirect needed');
                return;
            }
            
            // Extract path
            const appPath = PathUtils.extractAppPath();
            
            // Validate path
            if (!appPath || appPath === '/') {
                logger.debug('Root path detected, redirecting to home');
                this.redirectToHome();
                return;
            }
            
            // Attempt to store in sessionStorage
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
            // Safe fallback
            this.redirectToHome();
        }
    }
    
    /**
     * Redirect to home page (clean URL)
     * @private
     * @returns {void}
     */
    redirectToHome() {
        const homeUrl = this.config.BASE_URL + '/';
        logger.debug('Redirecting to:', homeUrl);
        window.location.replace(homeUrl);
    }
    
    /**
     * Redirect with query parameter (fallback)
     * @private
     * @param {string} path - Path to preserve
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
     * @public
     * @returns {string|null} Stored path or null
     */
    restore() {
        const path = StorageUtils.retrievePath();
        
        if (path) {
            // Clear after retrieval
            StorageUtils.clearPath();
            logger.info('Path restored and cleared:', path);
        }
        
        return path;
    }
}

/**
 * Module initialization
 * 
 * Automatically executes redirect when loaded from 404.html.
 * Can also be imported by main app for path restoration.
 * 
 * @private
 */
function init() {
    // Check if we're on a 404 page (no main app loaded yet)
    const isMainAppLoaded = window.app !== undefined;
    
    if (!isMainAppLoaded) {
        // We're on 404.html, execute redirect
        logger.debug('Initializing from 404.html');
        const manager = new RedirectManager();
        manager.execute();
    } else {
        // Main app is loaded, just provide restore function
        logger.debug('Module loaded in main app context');
    }
}

// Auto-initialize
init();

// Export for use by main application
export default {
    /**
     * Restore path from sessionStorage
     * @returns {string|null} Stored path or null
     */
    restore() {
        const manager = new RedirectManager();
        return manager.restore();
    },
    
    /**
     * Configuration (read-only)
     * @returns {Object} Configuration object
     */
    getConfig() {
        return { ...REDIRECT_CONFIG };
    }
};
