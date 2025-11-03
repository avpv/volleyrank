// src/core/StorageAdapter.js

/**
 * StorageAdapter - localStorage abstraction with error handling
 * Provides consistent interface for data persistence
 */
class StorageAdapter {
    constructor(prefix = 'volleyrank') {
        this.prefix = prefix;
        this.cache = new Map();
        this.isAvailable = this.checkAvailability();
    }

    /**
     * Check if localStorage is available
     */
    checkAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage not available, using memory cache');
            return false;
        }
    }

    /**
     * Get full key with prefix
     */
    getKey(key) {
        return `${this.prefix}:${key}`;
    }

    /**
     * Get item from storage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Parsed value or default
     */
    get(key, defaultValue = null) {
        const fullKey = this.getKey(key);
        
        // Try cache first
        if (this.cache.has(fullKey)) {
            return this.cache.get(fullKey);
        }

        try {
            if (this.isAvailable) {
                const item = localStorage.getItem(fullKey);
                
                if (item === null) {
                    return defaultValue;
                }

                const parsed = JSON.parse(item);
                this.cache.set(fullKey, parsed);
                return parsed;
            } else {
                return defaultValue;
            }
        } catch (error) {
            console.error(`Error reading from storage (${key}):`, error);
            return defaultValue;
        }
    }

    /**
     * Set item in storage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {boolean} Success status
     */
    set(key, value) {
        const fullKey = this.getKey(key);

        try {
            const serialized = JSON.stringify(value);
            
            if (this.isAvailable) {
                localStorage.setItem(fullKey, serialized);
            }
            
            this.cache.set(fullKey, value);
            return true;
        } catch (error) {
            console.error(`Error writing to storage (${key}):`, error);
            
            // Check if quota exceeded
            if (error.name === 'QuotaExceededError') {
                console.warn('Storage quota exceeded, clearing old data');
                this.clearOldEntries();
                
                // Retry once
                try {
                    if (this.isAvailable) {
                        localStorage.setItem(fullKey, JSON.stringify(value));
                    }
                    this.cache.set(fullKey, value);
                    return true;
                } catch (retryError) {
                    console.error('Retry failed:', retryError);
                }
            }
            
            return false;
        }
    }

    /**
     * Remove item from storage
     */
    remove(key) {
        const fullKey = this.getKey(key);

        try {
            if (this.isAvailable) {
                localStorage.removeItem(fullKey);
            }
            this.cache.delete(fullKey);
            return true;
        } catch (error) {
            console.error(`Error removing from storage (${key}):`, error);
            return false;
        }
    }

    /**
     * Check if key exists
     */
    has(key) {
        const fullKey = this.getKey(key);
        
        if (this.cache.has(fullKey)) {
            return true;
        }

        if (this.isAvailable) {
            return localStorage.getItem(fullKey) !== null;
        }

        return false;
    }

    /**
     * Clear all storage entries with this prefix
     */
    clear() {
        try {
            if (this.isAvailable) {
                const keysToRemove = [];
                
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.prefix + ':')) {
                        keysToRemove.push(key);
                    }
                }
                
                keysToRemove.forEach(key => localStorage.removeItem(key));
            }
            
            this.cache.clear();
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }

    /**
     * Clear old entries (for quota management)
     */
    clearOldEntries() {
        if (!this.isAvailable) return;

        try {
            const entries = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix + ':')) {
                    try {
                        const value = JSON.parse(localStorage.getItem(key));
                        const timestamp = value?.savedAt || value?.createdAt || 0;
                        entries.push({ key, timestamp });
                    } catch (e) {
                        entries.push({ key, timestamp: 0 });
                    }
                }
            }
            
            // Sort by timestamp (oldest first)
            entries.sort((a, b) => a.timestamp - b.timestamp);
            
            // Remove oldest 30%
            const removeCount = Math.ceil(entries.length * 0.3);
            for (let i = 0; i < removeCount; i++) {
                localStorage.removeItem(entries[i].key);
            }
            
            console.log(`Cleared ${removeCount} old storage entries`);
        } catch (error) {
            console.error('Error clearing old entries:', error);
        }
    }

    /**
     * Get all keys with this prefix
     */
    keys() {
        const keys = [];

        if (this.isAvailable) {
            const prefixWithColon = this.prefix + ':';
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefixWithColon)) {
                    keys.push(key.substring(prefixWithColon.length));
                }
            }
        } else {
            // Return cache keys
            this.cache.forEach((value, key) => {
                if (key.startsWith(this.prefix + ':')) {
                    keys.push(key.substring(this.prefix.length + 1));
                }
            });
        }

        return keys;
    }

    /**
     * Get storage size estimation
     */
    getSize() {
        if (!this.isAvailable) return 0;

        let total = 0;
        const prefixWithColon = this.prefix + ':';

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefixWithColon)) {
                const value = localStorage.getItem(key);
                total += key.length + (value ? value.length : 0);
            }
        }

        return total;
    }

    /**
     * Get storage size in human-readable format
     */
    getSizeFormatted() {
        const bytes = this.getSize();

        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    /**
     * Export all localStorage data with this prefix
     * @returns {string} JSON string of all data
     */
    exportAll() {
        if (!this.isAvailable) {
            throw new Error('localStorage is not available');
        }

        const data = {};
        const prefixWithColon = this.prefix + ':';

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefixWithColon)) {
                const shortKey = key.substring(prefixWithColon.length);
                try {
                    const value = localStorage.getItem(key);
                    data[shortKey] = JSON.parse(value);
                } catch (e) {
                    // If parsing fails, store as string
                    data[shortKey] = localStorage.getItem(key);
                }
            }
        }

        return JSON.stringify({
            version: '1.0',
            prefix: this.prefix,
            exportedAt: new Date().toISOString(),
            data: data
        }, null, 2);
    }

    /**
     * Import localStorage data from exported JSON
     * @param {string} jsonData - JSON string from exportAll()
     * @param {Object} options - Import options
     * @param {boolean} options.merge - Merge with existing data (default: false)
     * @returns {Object} Import result with statistics
     */
    importAll(jsonData, options = {}) {
        if (!this.isAvailable) {
            throw new Error('localStorage is not available');
        }

        const { merge = false } = options;

        try {
            const imported = JSON.parse(jsonData);

            if (!imported.data) {
                throw new Error('Invalid import format: missing data property');
            }

            // Clear existing data if not merging
            if (!merge) {
                this.clear();
            }

            let imported_count = 0;
            let failed_count = 0;

            // Import each key
            for (const [key, value] of Object.entries(imported.data)) {
                try {
                    this.set(key, value);
                    imported_count++;
                } catch (error) {
                    console.error(`Failed to import key ${key}:`, error);
                    failed_count++;
                }
            }

            return {
                success: true,
                imported: imported_count,
                failed: failed_count,
                exportedAt: imported.exportedAt
            };
        } catch (error) {
            console.error('Import failed:', error);
            throw new Error('Failed to import data: ' + error.message);
        }
    }
}

// Export singleton
const storage = new StorageAdapter('volleyrank');
export default storage;

// For debugging
if (typeof window !== 'undefined') {
    window.storage = storage;
}
