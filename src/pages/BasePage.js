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
     * Render loading state
     */
    renderLoading() {
        return `
            <div class="loading d-flex flex-column items-center justify-center animate-fade-in">
                <div class="loading-spinner mb-4 animate-spin"></div>
                <p class="text-secondary animate-pulse">Loading...</p>
            </div>
        `;
    }

    /**
     * Render empty state with improved structure
     * @param {string} message - Main message or description
     * @param {string} icon - Optional icon/SVG content
     * @param {string} title - Optional title (if not provided, message is used as description)
     */
    renderEmpty(message, icon = '', title = '') {
        // If title is provided, treat message as description
        const hasTitle = title !== '';
        const titleText = hasTitle ? title : '';
        const descriptionText = hasTitle ? message : message;

        return `
            <div class="empty-state animate-fade-in">
                ${icon ? `<div class="empty-state__icon">${icon}</div>` : ''}
                ${hasTitle ? `<div class="empty-state__title">${this.escape(titleText)}</div>` : ''}
                <div class="empty-state__description">${hasTitle ? this.escape(descriptionText) : this.escape(message)}</div>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderError(message) {
        return `
            <div class="error-state d-flex items-center gap-2">
                <div class="error-icon d-flex items-center justify-center">!</div>
                <p class="m-0">${this.escape(message)}</p>
            </div>
        `;
    }
}

export default BasePage;
