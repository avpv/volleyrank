// src/core/EventBus.js

/**
 * EventBus - Global event communication system
 * Enables loose coupling between components
 */
class EventBus {
    constructor() {
        this.listeners = new Map();
        this.wildcardListeners = [];
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     * @param {Object} context - Context for callback (optional)
     * @returns {Function} Unsubscribe function
     */
    on(event, callback, context = null) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const listener = {
            callback,
            context,
            id: Symbol('listener')
        };

        this.listeners.get(event).push(listener);

        // Return unsubscribe function
        return () => this.off(event, listener.id);
    }

    /**
     * Subscribe to event only once
     */
    once(event, callback, context = null) {
        const unsubscribe = this.on(event, (...args) => {
            unsubscribe();
            callback.apply(context, args);
        }, context);

        return unsubscribe;
    }

    /**
     * Subscribe to all events (wildcard)
     */
    onAny(callback, context = null) {
        const listener = { callback, context, id: Symbol('wildcard') };
        this.wildcardListeners.push(listener);

        return () => {
            const index = this.wildcardListeners.findIndex(l => l.id === listener.id);
            if (index > -1) {
                this.wildcardListeners.splice(index, 1);
            }
        };
    }

    /**
     * Unsubscribe from event
     */
    off(event, listenerId) {
        if (!this.listeners.has(event)) return;

        const listeners = this.listeners.get(event);
        const index = listeners.findIndex(l => l.id === listenerId);
        
        if (index > -1) {
            listeners.splice(index, 1);
        }

        if (listeners.length === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data = null) {
        // Call specific event listeners
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            listeners.forEach(listener => {
                try {
                    listener.callback.call(listener.context, data, event);
                } catch (error) {
                    console.error(`Error in event listener for "${event}":`, error);
                }
            });
        }

        // Call wildcard listeners
        this.wildcardListeners.forEach(listener => {
            try {
                listener.callback.call(listener.context, event, data);
            } catch (error) {
                console.error(`Error in wildcard listener for "${event}":`, error);
            }
        });
    }

    /**
     * Clear all listeners for an event
     */
    clear(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
            this.wildcardListeners = [];
        }
    }

    /**
     * Get listener count for debugging
     */
    getListenerCount(event) {
        if (event) {
            return this.listeners.has(event) ? this.listeners.get(event).length : 0;
        }
        
        let total = 0;
        this.listeners.forEach(listeners => {
            total += listeners.length;
        });
        return total + this.wildcardListeners.length;
    }
}

// Export singleton instance
const eventBus = new EventBus();
export default eventBus;

// For debugging
if (typeof window !== 'undefined') {
    window.eventBus = eventBus;
}
