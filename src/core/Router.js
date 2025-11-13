// src/core/Router.js

/**
 * Router - Clean URL routing without hashes
 * Supports GitHub Pages with proper 404 handling
 */
import eventBus from './EventBus.js';

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.basePath = this.detectBasePath();
        this.isNavigating = false;
    }

    /**
     * Detect base path for GitHub Pages support
     */
    detectBasePath() {
        const path = window.location.pathname;

        // Check if running on GitHub Pages
        if (path.includes('/team-balance')) {
            return '/team-balance';
        }

        return '';
    }

    /**
     * Register a route
     * @param {string} path - Route path (e.g., '/', '/compare/')
     * @param {Function} handler - Route handler function
     */
    register(path, handler) {
        // Normalize path
        const normalizedPath = this.normalizePath(path);
        this.routes.set(normalizedPath, handler);
    }

    /**
     * Normalize path for consistent matching
     */
    normalizePath(path) {
        if (!path || path === '/') return '/';
        
        // Handle relative paths like ./ or ./compare/
        if (path.startsWith('./')) {
            path = path.substring(1); // Remove the dot, keep the slash
        }
        
        // Remove base path if present
        if (path.startsWith(this.basePath)) {
            path = path.substring(this.basePath.length);
        }
        
        // Ensure starts with /
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        
        // Ensure ends with /
        if (!path.endsWith('/')) {
            path += '/';
        }
        
        return path;
    }

    /**
     * Get current path without base
     */
    getCurrentPath() {
        let path = window.location.pathname;
        
        // Remove base path
        if (this.basePath && path.startsWith(this.basePath)) {
            path = path.substring(this.basePath.length);
        }
        
        return this.normalizePath(path);
    }

    /**
     * Navigate to a route
     * @param {string} path - Target path
     * @param {boolean} pushState - Whether to push to history
     */
    navigate(path, pushState = true) {
        if (this.isNavigating) return;
        
        this.isNavigating = true;
        
        // Normalize path (removes basePath if present)
        const normalizedPath = this.normalizePath(path);
        
        // Build full URL with basePath
        const fullPath = this.basePath + normalizedPath;
        
        // Update browser URL if needed
        if (pushState && window.location.pathname !== fullPath) {
            window.history.pushState({ path: normalizedPath }, '', fullPath);
        }
        
        // Find and execute route handler
        const handler = this.routes.get(normalizedPath);
        
        if (handler) {
            this.currentRoute = normalizedPath;
            
            // Emit route change event
            eventBus.emit('route:before-change', { 
                from: this.currentRoute, 
                to: normalizedPath 
            });
            
            try {
                handler(normalizedPath);
                eventBus.emit('route:changed', normalizedPath);
            } catch (error) {
                console.error('Route handler error:', error);
                eventBus.emit('route:error', { path: normalizedPath, error });
            }
        } else {
            // 404 - redirect to home
            console.warn('Route not found:', normalizedPath);
            this.navigate('/', true);
        }
        
        this.isNavigating = false;
    }

    /**
     * Initialize router
     */
    init() {
        console.log('[ROUTER] Initializing router...');
        console.log('[ROUTER] Base path:', this.basePath || '(root)');
        
        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            console.log('[NAV] Popstate event');
            const path = event.state?.path || this.getCurrentPath();
            console.log('   Target path:', path);
            this.navigate(path, false);
        });

        // Intercept link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');

            if (!link) return;

            // Skip disabled links
            if (link.classList.contains('disabled') || link.getAttribute('aria-disabled') === 'true') {
                e.preventDefault();
                return;
            }

            let href = link.getAttribute('href');

            // Skip external links, downloads, and targets
            if (
                link.target ||
                link.download ||
                href.startsWith('http://') ||
                href.startsWith('https://') ||
                href.startsWith('//') ||
                href.startsWith('#') ||
                href.startsWith('mailto:') ||
                href.startsWith('tel:')
            ) {
                return;
            }
            
            // Handle absolute paths (starting with /)
            // Check if href starts with basePath or root
            if (href.startsWith('/')) {
                // If we have a basePath and href starts with it, or href doesn't start with basePath
                // Convert to relative to basePath
                if (this.basePath) {
                    // If href already includes basePath, remove it for navigation
                    if (href.startsWith(this.basePath)) {
                        href = href.substring(this.basePath.length);
                    }
                    // If href is just "/" or starts with "/" but not basePath
                    // Keep it as is for navigation (will be normalized)
                }
            }
            
            e.preventDefault();
            console.log('[NAV] Link clicked, navigating to:', href);
            this.navigate(href);
        });

        // todo
        const currentPath = this.getCurrentPath();
        console.log('[ROUTER] Initial current path:', currentPath);
        
        // todo
        const fullPath = this.basePath + currentPath;
        window.history.replaceState(
            { path: currentPath }, 
            '', 
            fullPath
        );
        
        // todo
        console.log('[ROUTER] Starting initial navigation...');
        this.navigate(currentPath, false);
    }

    /**
     * Get route by name helper
     */
    getRoute(name) {
        const routes = {
            'home': '/',
            'settings': '/',
            'compare': '/compare/',
            'rankings': '/rankings/',
            'teams': '/teams/'
        };
        
        return routes[name] || '/';
    }

    /**
     * Check if currently on route
     */
    isActive(path) {
        return this.normalizePath(path) === this.currentRoute;
    }

    /**
     * Build full URL with basePath
     */
    buildUrl(path) {
        const normalized = this.normalizePath(path);
        return this.basePath + normalized;
    }
}

// Export singleton
const router = new Router();
export default router;

// For debugging
if (typeof window !== 'undefined') {
    window.router = router;
}
