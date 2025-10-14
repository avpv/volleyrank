
/**
 * Modal - Reusable modal dialog component
 */
import Component from './Component.js';

class Modal extends Component {
    constructor(props = {}) {
        // Modal creates its own container
        const container = document.createElement('div');
        container.className = 'modal';
        document.body.appendChild(container);
        
        super(container, props);
        
        this.isOpen = false;
        this.onClose = props.onClose || null;
        this.onConfirm = props.onConfirm || null;
    }

    render() {
        const {
            title = 'Modal',
            content = '',
            showCancel = true,
            showConfirm = true,
            cancelText = 'Cancel',
            confirmText = 'Confirm',
            size = 'medium'
        } = this.props;

        return `
            <div class="modal-overlay" data-action="close"></div>
            <div class="modal-dialog modal-${size}">
                <div class="modal-header">
                    <h3>${this.escape(title)}</h3>
                    <button class="modal-close-btn" data-action="close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${showCancel ? `
                        <button class="btn btn-secondary" data-action="cancel">
                            ${this.escape(cancelText)}
                        </button>
                    ` : ''}
                    ${showConfirm ? `
                        <button class="btn btn-primary" data-action="confirm">
                            ${this.escape(confirmText)}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    onMount() {
        this.attachModalListeners();
    }

    onUpdate() {
        this.attachModalListeners();
    }

    attachModalListeners() {
        // Close buttons
        this.$$('[data-action="close"], [data-action="cancel"]').forEach(btn => {
            this.addEventListener(btn, 'click', () => this.close());
        });

        // Confirm button
        const confirmBtn = this.$('[data-action="confirm"]');
        if (confirmBtn) {
            this.addEventListener(confirmBtn, 'click', () => this.confirm());
        }

        // ESC key
        this.addEventListener(document, 'keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    /**
     * Open modal - uses CSS classes only
     */
    open() {
        if (this.isOpen) return;
        
        // Add classes instead of inline styles
        this.container.classList.add('modal-visible');
        document.body.classList.add('modal-open');
        
        this.isOpen = true;
        
        // Focus first input if exists
        setTimeout(() => {
            const firstInput = this.$('input, textarea, select');
            if (firstInput) firstInput.focus();
        }, 100);
        
        this.emit('modal:opened');
    }

    /**
     * Close modal - uses CSS classes only
     */
    close() {
        if (!this.isOpen) return;
        
        // Remove classes instead of inline styles
        this.container.classList.remove('modal-visible');
        document.body.classList.remove('modal-open');
        
        this.isOpen = false;
        
        if (this.onClose) {
            this.onClose();
        }
        
        this.emit('modal:closed');
    }

    /**
     * Confirm action
     */
    confirm() {
        if (this.onConfirm) {
            const result = this.onConfirm();
            
            // Close if callback returns true or doesn't return anything
            if (result !== false) {
                this.close();
            }
        } else {
            this.close();
        }
        
        this.emit('modal:confirmed');
    }

    /**
     * Update modal content
     */
    setContent(content) {
        this.props.content = content;
        this.update();
    }

    /**
     * Update modal title
     */
    setTitle(title) {
        this.props.title = title;
        this.update();
    }

    /**
     * Destroy modal
     */
    onDestroy() {
        if (this.isOpen) {
            document.body.classList.remove('modal-open');
        }
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

export default Modal;
