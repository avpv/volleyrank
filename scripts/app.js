/**
 * Main application file - initialization and module integration
 */

// Global module instances
let stateManager, playerManager, eloCalculator, teamOptimizer, uiController;

/**
 * Initialize the application
 */
function initializeApp() {
    try {
        // Check availability of all required modules
        if (typeof StateManager === 'undefined') {
            throw new Error('StateManager module not loaded');
        }
        if (typeof PlayerManager === 'undefined') {
            throw new Error('PlayerManager module not loaded');
        }
        if (typeof EloCalculator === 'undefined') {
            throw new Error('EloCalculator module not loaded');
        }
        if (typeof TeamOptimizer === 'undefined') {
            throw new Error('TeamOptimizer module not loaded');
        }
        if (typeof UIController === 'undefined') {
            throw new Error('UIController module not loaded');
        }

        // Create module instances
        stateManager = window.stateManager; // Singleton from StateManager.js
        eloCalculator = new EloCalculator();
        playerManager = new PlayerManager(stateManager);
        teamOptimizer = new TeamOptimizer(eloCalculator);
        uiController = new UIController(stateManager, playerManager, eloCalculator, teamOptimizer);

        // Create global references for HTML access
        window.uiController = uiController;
        window.playerManager = playerManager;
        window.eloCalculator = eloCalculator;
        window.teamOptimizer = teamOptimizer;

        // Initialize interface
        uiController.initialize();

        console.log('VolleyRank application initialized successfully');
        
        // Add debug handlers for development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.debugVolleyRank = {
                stateManager,
                playerManager,
                eloCalculator,
                teamOptimizer,
                uiController,
                exportData: () => stateManager.exportData(),
                importData: (data) => stateManager.importData(data)
            };
            console.log('Debug tools available at window.debugVolleyRank');
        }

    } catch (error) {
        console.error('Failed to initialize VolleyRank application:', error);
        
        // Show user error message
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #dc2626;
            color: white;
            padding: 2rem;
            border-radius: 8px;
            text-align: center;
            z-index: 9999;
            max-width: 400px;
        `;
        errorMessage.innerHTML = `
            <h3>Application Error</h3>
            <p>Failed to load VolleyRank: ${error.message}</p>
            <p>Please refresh the page or check the console for details.</p>
        `;
        document.body.appendChild(errorMessage);
    }
}

/**
 * Function to export data (can be called from console)
 */
function exportData() {
    if (stateManager) {
        const data = stateManager.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `volleyrank-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('Data exported successfully');
    } else {
        console.error('StateManager not initialized');
    }
}

/**
 * Function to import data (can be called from console)
 */
function importData() {
    if (!stateManager) {
        console.error('StateManager not initialized');
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = e.target.result;
                stateManager.importData(data);
                console.log('Data imported successfully');
                
                if (uiController) {
                    uiController.showNotification('Data imported successfully!', 'success');
                }
            } catch (error) {
                console.error('Import failed:', error);
                if (uiController) {
                    uiController.showNotification(`Import failed: ${error.message}`, 'error');
                }
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

/**
 * Add functions to global object for convenience
 */
window.exportData = exportData;
window.importData = importData;

/**
 * Error handler for catching unhandled exceptions
 */
window.addEventListener('error', function(event) {
    console.error('Unhandled error in VolleyRank:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});

/**
 * Handler for unhandled promise rejections
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection in VolleyRank:', event.reason);
    event.preventDefault(); // Prevent error from appearing in browser console
});

/**
 * Start application after DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all scripts are loaded
    setTimeout(initializeApp, 100);
});

/**
 * Handler for beforeunload event - warn about unsaved data
 */
window.addEventListener('beforeunload', function(event) {
    // In our case, data is automatically saved to localStorage,
    // but we could add a check for unsaved changes here
    // if (hasUnsavedChanges) {
    //     event.preventDefault();
    //     event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    // }
});

/**
 * Utility function to get application information
 */
function getAppInfo() {
    return {
        version: '2.0.0',
        buildDate: new Date().toISOString(),
        modules: {
            stateManager: typeof StateManager !== 'undefined',
            playerManager: typeof PlayerManager !== 'undefined',
            eloCalculator: typeof EloCalculator !== 'undefined',
            teamOptimizer: typeof TeamOptimizer !== 'undefined',
            uiController: typeof UIController !== 'undefined'
        },
        initialized: !!(stateManager && playerManager && eloCalculator && teamOptimizer && uiController)
    };
}

window.getAppInfo = getAppInfo;
