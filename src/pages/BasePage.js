// src/pages/BasePage.js

/**
 * BasePage - Base class for all pages
 * Extends Component with page-specific functionality
 */
import Component from '../components/base/Component.js';
import { getLogo } from '../components/base/Icons.js';

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
        document.title = `${title} | TeamBalance`;
    }

    /**
     * Add child component
     */
    addComponent(component) {
        this.components.push(component);
        return component;
    }

    /**
     * Setup mobile sidebar toggle
     * Call this after mounting sidebar on pages with sidebar layout
     */
    setupMobileSidebarToggle() {
        const toggleBtn = document.getElementById('sidebarToggle');
        const backdrop = document.getElementById('sidebarBackdrop');
        const sidebar = document.getElementById('pageSidebar');

        if (!toggleBtn || !backdrop || !sidebar) {
            return;
        }

        const openSidebar = () => {
            sidebar.classList.add('open');
            backdrop.style.display = 'block';
            // Use setTimeout to ensure display change happens before opacity transition
            setTimeout(() => backdrop.classList.add('visible'), 10);
            document.body.style.overflow = 'hidden';
        };

        const closeSidebar = () => {
            sidebar.classList.remove('open');
            backdrop.classList.remove('visible');
            document.body.style.overflow = '';
            // Wait for transition to complete before hiding
            setTimeout(() => {
                if (!backdrop.classList.contains('visible')) {
                    backdrop.style.display = 'none';
                }
            }, 300);
        };

        const toggleSidebar = () => {
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        };

        // Toggle button click
        toggleBtn.addEventListener('click', toggleSidebar);

        // Backdrop click
        backdrop.addEventListener('click', closeSidebar);

        // Store cleanup function
        this._cleanupSidebarToggle = () => {
            toggleBtn.removeEventListener('click', toggleSidebar);
            backdrop.removeEventListener('click', closeSidebar);
            document.body.style.overflow = '';
        };
    }

    /**
     * Destroy page and all child components
     */
    onDestroy() {
        // Clean up mobile sidebar toggle if it was set up
        if (this._cleanupSidebarToggle) {
            this._cleanupSidebarToggle();
            this._cleanupSidebarToggle = null;
        }

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
     * Render page with sidebar layout
     */
    renderPageWithSidebar(content) {
        return `
            <button class="sidebar-toggle" id="sidebarToggle" aria-label="Toggle sidebar">
                <span class="sidebar-toggle__icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
            </button>
            <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
            <div class="page-layout">
                <div class="page-layout__sidebar" id="pageSidebar"></div>
                <div class="page-layout__content">
                    ${content}
                </div>
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
                <div class="empty-icon">${getLogo({ size: 48 })}</div>
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
