// src/components/base/Toast.js

import { getIcon } from './Icons.js';
import { escapeHtml } from '../../utils/stringUtils.js';
import uiConfig from '../../config/ui.js';

/**
 * Toast - Notification component
 * Displays temporary messages to the user
 */
class Toast {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.init();
    }

    init() {
        // Create container if it doesn't exist
        let container = document.getElementById('toast-container');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        this.container = container;
    }

    /**
     * Show a toast notification
     */
    show(message, type = 'info', duration = uiConfig.TOAST.DEFAULT_DURATION) {
        const toast = this.createToast(message, type);
        this.container.appendChild(toast);
        this.toasts.push(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Auto-remove
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toast);
            }, duration);
        }

        return toast;
    }

    /**
     * Create toast element
     */
    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${this.escape(message)}</div>
            <button class="toast-close" aria-label="Close">&times;</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.remove(toast));

        return toast;
    }

    /**
     * Get icon for toast type
     */
    getIcon(type) {
        const iconMap = {
            success: 'check',
            error: 'x',
            warning: 'alert',
            info: 'info'
        };

        const iconName = iconMap[type] || 'info';
        return getIcon(iconName, { size: 20, className: 'toast-svg-icon' });
    }

    /**
     * Remove toast
     */
    remove(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.remove('show');
        toast.classList.add('hide');

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }, 300);
    }

    /**
     * Clear all toasts
     */
    clear() {
        this.toasts.forEach(toast => this.remove(toast));
    }

    /**
     * Convenience methods
     */
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    /**
     * Escape HTML
     * Uses centralized escapeHtml from stringUtils
     *
     * @param {string} text - Text to escape
     * @returns {string} Escaped text safe for HTML
     */
    escape(text) {
        return escapeHtml(text);
    }
}

// Export singleton
const toast = new Toast();
export default toast;
