// src/pages/BasePage.js

/**
 * BasePage - Base class for all pages
 * Extends Component with page-specific functionality
 */
import Component from '../components/base/Component.js';
import { getLogo } from '../components/base/Icons.js';
import uiConfig from '../config/ui.js';

const { ELEMENT_IDS, UI_CLASSES, ANIMATION } = uiConfig;

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
        const toggleBtn = document.getElementById(ELEMENT_IDS.SIDEBAR_TOGGLE);
        const backdrop = document.getElementById(ELEMENT_IDS.SIDEBAR_BACKDROP);
        const sidebar = document.getElementById(ELEMENT_IDS.SIDEBAR_CONTAINER);

        if (!toggleBtn || !backdrop || !sidebar) {
            return;
        }

        const openSidebar = () => {
            sidebar.classList.add(UI_CLASSES.OPEN);
            backdrop.style.display = 'block';
            // Use setTimeout to ensure display change happens before opacity transition
            setTimeout(() => backdrop.classList.add(UI_CLASSES.VISIBLE), ANIMATION.IMMEDIATE);
            document.body.style.overflow = 'hidden';
        };

        const closeSidebar = () => {
            sidebar.classList.remove(UI_CLASSES.OPEN);
            backdrop.classList.remove(UI_CLASSES.VISIBLE);
            document.body.style.overflow = '';
            // Wait for transition to complete before hiding
            setTimeout(() => {
                if (!backdrop.classList.contains(UI_CLASSES.VISIBLE)) {
                    backdrop.style.display = 'none';
                }
            }, ANIMATION.STANDARD);
        };

        const toggleSidebar = () => {
            if (sidebar.classList.contains(UI_CLASSES.OPEN)) {
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
            <div class="page-layout">
                <div class="page-layout__sidebar" id="${ELEMENT_IDS.SIDEBAR_CONTAINER}"></div>
                <div class="page-layout__content">
                    ${content}
                </div>
            </div>
        `;
    }

    /**
     * Render loading state with enhanced accessibility
     */
    renderLoading(message = 'Loading...') {
        return `
            <div class="loading" role="status" aria-live="polite" aria-busy="true">
                <div class="loading-spinner" aria-hidden="true"></div>
                <p class="text-secondary">${this.escape(message)}</p>
            </div>
        `;
    }

    /**
     * Render empty state with enhanced UX and accessibility
     * @param {string} message - Main message or description
     * @param {string} icon - Optional icon/SVG content
     * @param {string} title - Optional title (if not provided, message is used as description)
     */
    renderEmpty(message, icon = '', title = '') {
        // If title is provided, treat message as description
        const hasTitle = title !== '';
        const titleText = hasTitle ? title : 'No items';
        const descriptionText = hasTitle ? message : message;

        return `
            <div class="empty-state" role="status" aria-live="polite" aria-label="${this.escape(hasTitle ? titleText : 'Empty state')}">
                ${icon ? `<div class="empty-state__icon" aria-hidden="true">${icon}</div>` : ''}
                ${hasTitle ? `<h3 class="empty-state__title">${this.escape(titleText)}</h3>` : ''}
                <p class="empty-state__description">${this.escape(descriptionText)}</p>
            </div>
        `;
    }

    /**
     * Render error state with improved accessibility
     */
    renderError(message, title = 'Error') {
        return `
            <div class="error-state d-flex items-center gap-2" role="alert" aria-live="assertive">
                <div class="error-icon d-flex items-center justify-center" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM7 4v5h2V4H7zm0 6v2h2v-2H7z"/>
                    </svg>
                </div>
                <div>
                    ${title ? `<strong class="error-title">${this.escape(title)}:</strong> ` : ''}
                    <span>${this.escape(message)}</span>
                </div>
            </div>
        `;
    }
}

export default BasePage;
