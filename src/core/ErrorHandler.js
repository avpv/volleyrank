/**
 * Error Handler
 * Centralized error handling system with boundaries and recovery strategies
 *
 * This module provides:
 * - Structured error types
 * - Error boundaries for components
 * - Centralized error logging
 * - Recovery strategies
 * - User-friendly error messages
 */

/**
 * Error severity levels
 * Determines how errors should be handled and displayed
 */
export const ErrorSeverity = {
    /** Informational - no action needed */
    INFO: 'info',

    /** Warning - degraded functionality but app continues */
    WARNING: 'warning',

    /** Error - feature failure but app continues */
    ERROR: 'error',

    /** Critical - app cannot continue */
    CRITICAL: 'critical'
};

/**
 * Error categories
 * Groups errors by type for better handling
 */
export const ErrorCategory = {
    /** Validation errors (user input) */
    VALIDATION: 'validation',

    /** Storage errors (localStorage, etc.) */
    STORAGE: 'storage',

    /** Network errors (API calls, fetch) */
    NETWORK: 'network',

    /** Calculation errors (ELO, team optimizer) */
    CALCULATION: 'calculation',

    /** State management errors */
    STATE: 'state',

    /** Rendering errors */
    RENDER: 'render',

    /** Unknown/unhandled errors */
    UNKNOWN: 'unknown'
};

/**
 * Base Application Error
 * Extended by all custom error types
 */
export class AppError extends Error {
    /**
     * @param {string} message - Error message
     * @param {string} category - Error category
     * @param {string} severity - Error severity
     * @param {Object} metadata - Additional error context
     */
    constructor(message, category = ErrorCategory.UNKNOWN, severity = ErrorSeverity.ERROR, metadata = {}) {
        super(message);
        this.name = 'AppError';
        this.category = category;
        this.severity = severity;
        this.metadata = metadata;
        this.timestamp = Date.now();
        this.recoverable = true;

        // Maintain stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Converts error to loggable object
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            category: this.category,
            severity: this.severity,
            metadata: this.metadata,
            timestamp: this.timestamp,
            recoverable: this.recoverable,
            stack: this.stack
        };
    }
}

/**
 * Validation Error
 * User input validation failures
 */
export class ValidationError extends AppError {
    constructor(message, field = null, metadata = {}) {
        super(message, ErrorCategory.VALIDATION, ErrorSeverity.WARNING, {
            field,
            ...metadata
        });
        this.name = 'ValidationError';
        this.field = field;
        this.recoverable = true;
    }
}

/**
 * Storage Error
 * localStorage or storage adapter failures
 */
export class StorageError extends AppError {
    constructor(message, operation = null, metadata = {}) {
        super(message, ErrorCategory.STORAGE, ErrorSeverity.ERROR, {
            operation,
            ...metadata
        });
        this.name = 'StorageError';
        this.operation = operation;
        this.recoverable = true;
    }
}

/**
 * State Error
 * State management failures
 */
export class StateError extends AppError {
    constructor(message, statePath = null, metadata = {}) {
        super(message, ErrorCategory.STATE, ErrorSeverity.ERROR, {
            statePath,
            ...metadata
        });
        this.name = 'StateError';
        this.statePath = statePath;
        this.recoverable = true;
    }
}

/**
 * Calculation Error
 * ELO or team optimization calculation failures
 */
export class CalculationError extends AppError {
    constructor(message, calculationType = null, metadata = {}) {
        super(message, ErrorCategory.CALCULATION, ErrorSeverity.ERROR, {
            calculationType,
            ...metadata
        });
        this.name = 'CalculationError';
        this.calculationType = calculationType;
        this.recoverable = true;
    }
}

/**
 * Error Handler Service
 * Centralized error handling with logging and recovery
 */
class ErrorHandlerService {
    constructor() {
        this.listeners = [];
        this.errorLog = [];
        this.maxLogSize = 100;
        this.debugMode = false;

        // Setup global error handlers
        this.setupGlobalHandlers();
    }

    /**
     * Setup global error handlers
     * Catches unhandled errors and promise rejections
     */
    setupGlobalHandlers() {
        // Handle unhandled errors
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.handle(new AppError(
                    event.message,
                    ErrorCategory.UNKNOWN,
                    ErrorSeverity.CRITICAL,
                    {
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno,
                        originalError: event.error
                    }
                ));
            });

            // Handle unhandled promise rejections
            window.addEventListener('unhandledrejection', (event) => {
                this.handle(new AppError(
                    `Unhandled Promise Rejection: ${event.reason}`,
                    ErrorCategory.UNKNOWN,
                    ErrorSeverity.ERROR,
                    {
                        reason: event.reason,
                        promise: event.promise
                    }
                ));
            });
        }
    }

    /**
     * Enable debug mode
     * Logs all errors to console
     */
    enableDebug() {
        this.debugMode = true;
    }

    /**
     * Disable debug mode
     */
    disableDebug() {
        this.debugMode = false;
    }

    /**
     * Handle an error
     *
     * @param {Error|AppError} error - Error to handle
     * @param {Object} context - Additional context
     * @returns {void}
     */
    handle(error, context = {}) {
        // Convert to AppError if needed
        const appError = error instanceof AppError
            ? error
            : new AppError(error.message, ErrorCategory.UNKNOWN, ErrorSeverity.ERROR, {
                originalError: error,
                ...context
            });

        // Add to log
        this.log(appError);

        // Log to console if debug mode
        if (this.debugMode) {
            this.logToConsole(appError);
        }

        // Notify listeners
        this.notify(appError);

        // Handle based on severity
        this.handleBySeverity(appError);
    }

    /**
     * Log error to internal log
     */
    log(error) {
        this.errorLog.unshift(error);

        // Trim log if too large
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(0, this.maxLogSize);
        }
    }

    /**
     * Log error to console
     */
    logToConsole(error) {
        const prefix = `[${error.category.toUpperCase()}:${error.severity.toUpperCase()}]`;
        const style = this.getConsoleStyle(error.severity);

        if (error.severity === ErrorSeverity.CRITICAL) {
            console.error(prefix, error.message, error);
        } else if (error.severity === ErrorSeverity.ERROR) {
            console.error(prefix, error.message, error);
        } else if (error.severity === ErrorSeverity.WARNING) {
            console.warn(prefix, error.message, error);
        }
    }

    /**
     * Get console styling for severity level
     */
    getConsoleStyle(severity) {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
                return 'color: white; background: red; font-weight: bold;';
            case ErrorSeverity.ERROR:
                return 'color: red; font-weight: bold;';
            case ErrorSeverity.WARNING:
                return 'color: orange;';
            default:
                return '';
        }
    }

    /**
     * Handle error based on severity
     */
    handleBySeverity(error) {
        switch (error.severity) {
            case ErrorSeverity.CRITICAL:
                // Critical errors might need to show modal or reload page
                this.handleCriticalError(error);
                break;

            case ErrorSeverity.ERROR:
                // Errors should be logged and possibly shown to user
                this.handleError(error);
                break;

            case ErrorSeverity.WARNING:
                // Warnings should be logged
                this.handleWarning(error);
                break;

            case ErrorSeverity.INFO:
                // Info is just logged
                break;
        }
    }

    /**
     * Handle critical errors
     * These may require app restart or significant user intervention
     */
    handleCriticalError(error) {
        console.error('[CRITICAL ERROR]', error);
        // In a real app, might show a modal or error page
    }

    /**
     * Handle regular errors
     * Should be reported to user
     */
    handleError(error) {
        console.error('[ERROR]', error);
        // Could show a toast notification
    }

    /**
     * Handle warnings
     * Logged but may not be shown to user
     */
    handleWarning(error) {
        console.warn('[WARNING]', error);
    }

    /**
     * Add error listener
     * Listeners are called when errors occur
     *
     * @param {Function} callback - Callback function (error) => void
     * @returns {Function} Unsubscribe function
     */
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Notify all listeners of error
     */
    notify(error) {
        this.listeners.forEach(callback => {
            try {
                callback(error);
            } catch (err) {
                console.error('Error in error listener:', err);
            }
        });
    }

    /**
     * Get recent errors
     * @param {number} count - Number of errors to retrieve
     * @returns {Array<AppError>} Recent errors
     */
    getRecentErrors(count = 10) {
        return this.errorLog.slice(0, count);
    }

    /**
     * Get errors by category
     * @param {string} category - Error category
     * @returns {Array<AppError>} Filtered errors
     */
    getErrorsByCategory(category) {
        return this.errorLog.filter(error => error.category === category);
    }

    /**
     * Clear error log
     */
    clearLog() {
        this.errorLog = [];
    }

    /**
     * Wrap a function with error handling
     * Returns a new function that catches and handles errors
     *
     * @param {Function} fn - Function to wrap
     * @param {Object} context - Error context
     * @returns {Function} Wrapped function
     */
    wrap(fn, context = {}) {
        return (...args) => {
            try {
                const result = fn(...args);

                // Handle promises
                if (result instanceof Promise) {
                    return result.catch(error => {
                        this.handle(error, context);
                        throw error; // Re-throw after handling
                    });
                }

                return result;
            } catch (error) {
                this.handle(error, context);
                throw error; // Re-throw after handling
            }
        };
    }

    /**
     * Wrap async function with error handling
     * @param {Function} fn - Async function to wrap
     * @param {Object} context - Error context
     * @returns {Function} Wrapped async function
     */
    wrapAsync(fn, context = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handle(error, context);
                throw error;
            }
        };
    }

    /**
     * Create error boundary for a component
     * Returns an object with methods to handle errors within a scope
     *
     * @param {string} boundaryName - Name of the boundary
     * @returns {Object} Error boundary interface
     */
    createBoundary(boundaryName) {
        return {
            name: boundaryName,

            /**
             * Execute function within boundary
             */
            execute: (fn, context = {}) => {
                try {
                    const result = fn();
                    if (result instanceof Promise) {
                        return result.catch(error => {
                            this.handle(error, { boundary: boundaryName, ...context });
                            throw error;
                        });
                    }
                    return result;
                } catch (error) {
                    this.handle(error, { boundary: boundaryName, ...context });
                    throw error;
                }
            },

            /**
             * Wrap function with boundary
             */
            wrap: (fn, context = {}) => {
                return this.wrap(fn, { boundary: boundaryName, ...context });
            }
        };
    }
}

// Create singleton instance
const errorHandler = new ErrorHandlerService();

// Export singleton and classes
export default errorHandler;
export {
    ErrorHandlerService,
    errorHandler
};
