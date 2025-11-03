// src/components/base/Button.js

/**
 * Button - Reusable button component
 */
import Component from './Component.js';

class Button extends Component {
    constructor(container, props = {}) {
        super(container, props);
        this.onClick = props.onClick || null;
    }

    render() {
        const {
            text = 'Button',
            type = 'primary',
            size = 'medium',
            disabled = false,
            loading = false,
            icon = null,
            fullWidth = false
        } = this.props;

        const classes = [
            'btn',
            `btn-${type}`,
            size !== 'medium' ? `btn-${size}` : '',
            fullWidth ? 'btn-full-width' : '',
            loading ? 'btn-loading' : ''
        ].filter(Boolean).join(' ');

        return `
            <button class="${classes}" ${disabled || loading ? 'disabled' : ''}>
                ${loading ? '<span class="btn-spinner"></span>' : ''}
                ${icon && !loading ? `<span class="btn-icon">${icon}</span>` : ''}
                <span class="btn-text">${this.escape(text)}</span>
            </button>
        `;
    }

    onMount() {
        const button = this.$('button');
        if (button && this.onClick) {
            this.addEventListener(button, 'click', (e) => {
                if (!this.props.disabled && !this.props.loading) {
                    this.onClick(e);
                }
            });
        }
    }

    onUpdate() {
        this.onMount();
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.props.loading = loading;
        this.update();
    }

    /**
     * Set disabled state
     */
    setDisabled(disabled) {
        this.props.disabled = disabled;
        this.update();
    }

    /**
     * Set button text
     */
    setText(text) {
        this.props.text = text;
        this.update();
    }
}

export default Button;
