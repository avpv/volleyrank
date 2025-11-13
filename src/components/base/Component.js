// src/components/base/Component.js

/**
 * Component - Base class for all UI components
 * Provides lifecycle hooks and consistent API
 */
import eventBus from '../../core/EventBus.js';
import { escapeHtml } from '../../utils/stringUtils.js';

class Component {
    constructor(container, props = {}) {
        this.container = typeof container === 'string' 
            ? document.querySelector(container)
            : container;
        
        this.props = props;
        this.state = {};
        this.eventUnsubscribers = [];
        this.isMounted = false;
        this.isDestroyed = false;
    }

    /**
     * Lifecycle: Component is being created
     */
    onCreate() {
        // Override in subclasses
    }

    /**
     * Lifecycle: Component mounted to DOM
     */
    onMount() {
        // Override in subclasses
    }

    /**
     * Lifecycle: Component will be updated
     */
    onBeforeUpdate(prevProps, prevState) {
        // Override in subclasses
    }

    /**
     * Lifecycle: Component was updated
     */
    onUpdate(prevProps, prevState) {
        // Override in subclasses
    }

    /**
     * Lifecycle: Component will be destroyed
     */
    onDestroy() {
        // Override in subclasses
    }

    /**
     * Render method - must be implemented
     */
    render() {
        throw new Error('render() must be implemented');
    }

    /**
     * Mount component
     */
    mount() {
        if (this.isMounted || this.isDestroyed) return;

        if (!this.container) {
            console.error('Cannot mount: container not found');
            return;
        }

        this.onCreate();
        
        const html = this.render();
        if (typeof html === 'string') {
            this.container.innerHTML = html;
        }
        
        this.isMounted = true;
        this.onMount();
        
        return this;
    }

    /**
     * Update component
     */
    update(newProps = {}) {
        if (!this.isMounted || this.isDestroyed) return;

        const prevProps = { ...this.props };
        const prevState = { ...this.state };
        
        this.props = { ...this.props, ...newProps };
        
        this.onBeforeUpdate(prevProps, prevState);
        
        const html = this.render();
        if (typeof html === 'string') {
            this.container.innerHTML = html;
        }
        
        this.onUpdate(prevProps, prevState);
        
        return this;
    }

    /**
     * Set internal state and re-render
     */
    setState(updates) {
        if (this.isDestroyed) return;

        const prevState = { ...this.state };
        this.state = { ...this.state, ...updates };
        
        if (this.isMounted) {
            const prevProps = { ...this.props };
            this.onBeforeUpdate(prevProps, prevState);
            
            const html = this.render();
            if (typeof html === 'string') {
                this.container.innerHTML = html;
            }
            
            this.onUpdate(prevProps, prevState);
        }
        
        return this;
    }

    /**
     * Unmount component from DOM
     */
    unmount() {
        if (!this.isMounted || this.isDestroyed) return;
        
        this.isMounted = false;
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    /**
     * Destroy component
     */
    destroy() {
        if (this.isDestroyed) return;

        // First unmount from DOM to stop rendering
        this.unmount();

        // Call lifecycle hook to allow cleanup in subclasses
        this.onDestroy();

        // Unsubscribe from all events
        this.eventUnsubscribers.forEach(unsubscribe => unsubscribe());
        this.eventUnsubscribers = [];

        // Final cleanup: ensure container is empty
        if (this.container) {
            this.container.innerHTML = '';
        }

        this.isDestroyed = true;
    }

    /**
     * Subscribe to event with auto-cleanup
     */
    on(event, handler) {
        const unsubscribe = eventBus.on(event, handler, this);
        this.eventUnsubscribers.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * Emit event
     */
    emit(event, data) {
        eventBus.emit(event, data);
    }

    /**
     * Query element within component
     */
    $(selector) {
        if (!this.container) return null;
        return this.container.querySelector(selector);
    }

    /**
     * Query all elements within component
     */
    $$(selector) {
        if (!this.container) return [];
        return Array.from(this.container.querySelectorAll(selector));
    }

    /**
     * Add event listener with auto-cleanup
     */
    addEventListener(element, event, handler) {
        if (!element) return;
        
        const boundHandler = handler.bind(this);
        element.addEventListener(event, boundHandler);
        
        // Store for cleanup
        this.eventUnsubscribers.push(() => {
            element.removeEventListener(event, boundHandler);
        });
    }

    /**
     * Safely escape HTML
     * Uses centralized escapeHtml from stringUtils
     *
     * @param {string} text - Text to escape
     * @returns {string} Escaped text safe for HTML
     */
    escape(text) {
        return escapeHtml(text);
    }

    /**
     * Create element helper
     */
    createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'className') {
                el.className = value;
            } else if (key.startsWith('on')) {
                el.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                el.setAttribute(key, value);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                el.appendChild(child);
            }
        });
        
        return el;
    }
}

export default Component;
