// src/pages/BasePage.js

/**
 * BasePage - Base class for all pages
 * Extends Component with page-specific functionality
 */
import Component from '../components/base/Component.js';

class BasePage extends Component {
    constructor(container, props = {}) {
        super(container, props);
        this.title = 'TeamBalance';
        this.components = [];
    }

    /**
     * Set page title
     */
    setTitle(title) {
        this.title = title;
        document.title = `${title} - TeamBalance`;
    }

    /**
     * Add child component
     */
    addComponent(component) {
        this.components.push(component);
        return component;
    }

    /**
     * Destroy page and all child components
     */
    onDestroy() {
        this.components.forEach(component => {
            if (component && typeof component.destroy === 'function') {
                try {
                    component.destroy();
                } catch (error) {
                    console.error('Error destroying component:', error);
                }
            }
        });
        this.components = [];
    }

    /**
     * Render page wrapper
     */
    renderPage(content) {
        return `
            <div class="page">
                ${content}
            </div>
        `;
    }

    /**
     * Render loading state
     */
    renderLoading() {
        return `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }

    /**
     * Render empty state
     */
    renderEmpty(message, icon = '') {
        return `
            <div class="empty-state">
                ${icon ? `<div class="empty-icon">${icon}</div>` : ''}
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderError(message) {
        return `
            <div class="error-state">
                <div class="error-icon">!</div>
                <p>${this.escape(message)}</p>
            </div>
        `;
    }
}

export default BasePage;
