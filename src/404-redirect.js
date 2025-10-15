/**
 * 404 Redirect Handler
 * 
 * Handles client-side routing for Single Page Applications deployed on GitHub Pages.
 * When a user directly accesses a deep route or refreshes the page, GitHub Pages
 * serves the 404.html page. This module captures the requested path and redirects
 * to index.html with the path preserved as a query parameter.
 * 
 * Flow:
 * 1. User requests /teams/ directly
 * 2. GitHub Pages serves 404.html
 * 3. This script extracts /teams/ from URL
 * 4. Redirects to /?redirect=/teams/
 * 5. app.js reads redirect param and routes correctly
 * 
 * @module redirect/404-handler
 * @author VolleyRank Team
 * @version 4.0.0
 * @license MIT
 */

(function() {
    'use strict';
    
    /**
     * Configuration constants
     * @constant {Object}
     */
    const CONFIG = {
        /** @property {string} Base URL for GitHub Pages deployment */
        BASE_URL: '/volleyrank',
        
        /** @property {string} Query parameter name for path preservation */
        REDIRECT_PARAM: 'redirect',
        
        /** @property {boolean} Enable debug logging */
        DEBUG: false
    };
    
    /**
     * Log debug information if debug mode is enabled
     * @private
     * @param {string} message - Debug message
     * @param {...*} args - Additional arguments to log
     */
    function debug(message, ...args) {
        if (CONFIG.DEBUG) {
            console.log(`[404-Redirect] ${message}`, ...args);
        }
    }
    
    /**
     * Extract application path from current URL
     * 
     * Removes the base URL prefix and normalizes the path.
     * Returns null if already on home page to avoid unnecessary redirects.
     * 
     * @private
     * @returns {string|null} Application path without base URL, or null if on home
     */
    function extractApplicationPath() {
        const pathname = window.location.pathname;
        
        debug('Current pathname:', pathname);
        
        // Check if already on home page
        const homePaths = [
            CONFIG.BASE_URL + '/',
            CONFIG.BASE_URL + '/index.html'
        ];
        
        if (homePaths.includes(pathname)) {
            debug('Already on home page, no redirect needed');
            return null;
        }
        
        // Remove base URL from pathname
        let appPath = pathname.startsWith(CONFIG.BASE_URL) 
            ? pathname.substring(CONFIG.BASE_URL.length)
            : pathname;
        
        // Ensure path starts with /
        if (!appPath.startsWith('/')) {
            appPath = '/' + appPath;
        }
        
        debug('Extracted application path:', appPath);
        
        return appPath;
    }
    
    /**
     * Build redirect URL with preserved path
     * 
     * Constructs the complete URL for redirecting to index.html
     * with the original path preserved as a query parameter.
     * 
     * @private
     * @param {string} path - Application path to preserve
     * @returns {string} Complete redirect URL
     */
    function buildRedirectUrl(path) {
        const encodedPath = encodeURIComponent(path);
        const url = `${CONFIG.BASE_URL}/?${CONFIG.REDIRECT_PARAM}=${encodedPath}`;
        
        debug('Built redirect URL:', url);
        
        return url;
    }
    
    /**
     * Perform redirect to index.html with path preservation
     * 
     * Main function that orchestrates the redirect process:
     * 1. Extract application path
     * 2. Build redirect URL
     * 3. Perform navigation using replace() to avoid history pollution
     * 
     * @private
     * @returns {void}
     */
    function performRedirect() {
        try {
            // Extract path from current URL
            const appPath = extractApplicationPath();
            
            // If no path or root path, redirect to home
            if (!appPath || appPath === '/') {
                debug('Redirecting to home page');
                window.location.replace(CONFIG.BASE_URL + '/');
                return;
            }
            
            // Build redirect URL with preserved path
            const redirectUrl = buildRedirectUrl(appPath);
            
            console.info('[404] Preserving path:', appPath);
            console.info('[404] Redirecting to:', redirectUrl);
            
            // Perform redirect using replace() to avoid adding to history
            window.location.replace(redirectUrl);
            
        } catch (error) {
            console.error('[404] Redirect error:', error);
            
            // Fallback: redirect to home page
            console.warn('[404] Falling back to home page');
            window.location.replace(CONFIG.BASE_URL + '/');
        }
    }
    
    /**
     * Initialize redirect handler
     * 
     * Entry point that executes immediately when script loads.
     * Wrapped in try-catch for safety.
     * 
     * @private
     * @returns {void}
     */
    function init() {
        debug('Initializing 404 redirect handler');
        performRedirect();
    }
    
    // Execute on load
    init();
    
})();
