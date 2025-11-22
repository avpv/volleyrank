// src/components/base/PageHeader.js

/**
 * PageHeader - Reusable page header component
 * Provides consistent page title and subtitle structure across all pages
 *
 * Props:
 *  - title: string (required) - Main page title
 *  - subtitle: string (optional) - Page description/subtitle
 *  - actions: string (optional) - HTML for header actions (buttons, etc.)
 *  - withActions: boolean (optional) - Whether to use header with actions layout
 */
import Component from './Component.js';

class PageHeader extends Component {
    constructor(container, props = {}) {
        super(container, props);

        // Validate required props
        if (!props.title) {
            console.warn('PageHeader: title prop is required');
        }
    }

    render() {
        const { title, subtitle, actions, withActions } = this.props;

        // If we have actions, use the with-actions layout
        if (withActions && actions) {
            return `
                <header class="page-header page-header--with-actions">
                    <div class="page-header__content">
                        <h2 class="page-header__title">${this.escape(title)}</h2>
                        ${subtitle ? `<p class="page-subtitle">${this.escape(subtitle)}</p>` : ''}
                    </div>
                    <div class="page-header__actions">
                        ${actions}
                    </div>
                </header>
            `;
        }

        // Standard header layout
        return `
            <header class="page-header">
                <h2 class="page-header__title">${this.escape(title)}</h2>
                ${subtitle ? `<p class="page-subtitle">${this.escape(subtitle)}</p>` : ''}
            </header>
        `;
    }
}

export default PageHeader;
