// modal/modal_base.js - Base modal class
console.log('🖼️ Modal Base loading...');

/**
 * Base modal class for all modal types
 */
class ModalBase {
    constructor(namespace = 'fancy-gst') {
        this.namespace = namespace;
        this.overlay = null;
        this.modal = null;
        this.isOpen = false;
        this.onClose = null;
        this.cleanupFunctions = [];
        
        // Default options
        this.defaultOptions = {
            closeOnBackdrop: true,
            closeOnEscape: true,
            showCloseButton: true,
            autoFocus: true,
            maxWidth: '500px',
            minWidth: '300px'
        };
    }

    /**
     * Create modal overlay and container
     * @param {Object} options - Modal options
     * @returns {Element} - Modal element
     */
    createModal(options = {}) {
        const config = { ...this.defaultOptions, ...options };
        
        // Create overlay
        this.overlay = CoreDOMUtils.createElement('div', {
            class: `${this.namespace}-modal-overlay`
        }, {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '999999',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

        // Create modal container
        this.modal = CoreDOMUtils.createElement('div', {
            class: `${this.namespace}-modal`,
            role: 'dialog',
            'aria-modal': 'true'
        }, {
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            maxWidth: config.maxWidth,
            minWidth: config.minWidth,
            width: '90%',
            maxHeight: '90%',
            overflow: 'hidden',
            transform: 'scale(0.9)',
            transition: 'transform 0.3s ease',
            fontFamily: 'inherit'
        });

        // Apply dark mode styles
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.modal.style.background = '#2d2d2d';
            this.modal.style.color = '#e0e0e0';
        }

        this.overlay.appendChild(this.modal);
        
        // Setup event handlers
        this.setupEventHandlers(config);
        
        return this.modal;
    }

    /**
     * Setup event handlers for modal
     * @param {Object} config - Modal configuration
     */
    setupEventHandlers(config) {
        // Close on backdrop click
        if (config.closeOnBackdrop) {
            const cleanup1 = CoreEventUtils.addListener(this.overlay, 'click', (event) => {
                if (event.target === this.overlay) {
                    this.close();
                }
            });
            this.cleanupFunctions.push(cleanup1);
        }

        // Close on escape key
        if (config.closeOnEscape) {
            const cleanup2 = CoreEventUtils.addListener(document, 'keydown', (event) => {
                if (event.key === 'Escape' && this.isOpen) {
                    event.preventDefault();
                    this.close();
                }
            });
            this.cleanupFunctions.push(cleanup2);
        }
    }

    /**
     * Create modal header
     * @param {string} title - Modal title
     * @param {boolean} showCloseButton - Show close button
     * @returns {string} - Header HTML
     */
    createHeader(title, showCloseButton = true) {
        return `
            <div class="${this.namespace}-modal-header">
                <h3 class="${this.namespace}-modal-title">${CoreDOMUtils.escapeHtml(title)}</h3>
                ${showCloseButton ? `
                    <button class="${this.namespace}-modal-close" aria-label="Close" type="button">
                        <span aria-hidden="true">&times;</span>
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Create modal body
     * @param {string} content - Body content HTML
     * @returns {string} - Body HTML
     */
    createBody(content) {
        return `
            <div class="${this.namespace}-modal-body">
                ${content}
            </div>
        `;
    }

    /**
     * Create modal footer
     * @param {Array} buttons - Button configurations
     * @returns {string} - Footer HTML
     */
    createFooter(buttons = []) {
        if (!buttons.length) return '';
        
        let footerHTML = `<div class="${this.namespace}-modal-footer">`;
        
        buttons.forEach(button => {
            const btnClass = `${this.namespace}-btn ${button.primary ? 'primary' : ''} ${button.danger ? 'danger' : ''}`;
            footerHTML += `
                <button class="${btnClass}" 
                        data-action="${button.action}" 
                        type="${button.type || 'button'}"
                        ${button.disabled ? 'disabled' : ''}>
                    ${CoreDOMUtils.escapeHtml(button.text)}
                </button>
            `;
        });
        
        footerHTML += '</div>';
        return footerHTML;
    }

    /**
     * Open the modal
     * @param {Function} onCloseCallback - Callback when modal closes
     */
    open(onCloseCallback = null) {
        if (this.isOpen) return;
        
        this.onClose = onCloseCallback;
        this.isOpen = true;
        
        // Add to DOM
        document.body.appendChild(this.overlay);
        
        // Trigger animation
        requestAnimationFrame(() => {
            this.overlay.style.opacity = '1';
            this.modal.style.transform = 'scale(1)';
        });
        
        // Focus management
        this.setupFocusManagement();
        
        console.log(`📝 Modal opened: ${this.constructor.name}`);
    }

    /**
     * Close the modal
     */
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        
        // Animate out
        this.overlay.style.opacity = '0';
        this.modal.style.transform = 'scale(0.9)';
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            this.cleanup();
        }, 300);
        
        // Call onClose callback
        if (this.onClose) {
            this.onClose();
        }
        
        console.log(`📝 Modal closed: ${this.constructor.name}`);
    }

    /**
     * Setup focus management for accessibility
     */
    setupFocusManagement() {
        // Store currently focused element
        this.previouslyFocused = document.activeElement;
        
        // Focus first focusable element in modal
        setTimeout(() => {
            const focusableElements = this.modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        }, 100);
        
        // Trap focus within modal
        const cleanup = CoreEventUtils.addListener(document, 'keydown', (event) => {
            if (event.key === 'Tab' && this.isOpen) {
                this.trapFocus(event);
            }
        });
        
        this.cleanupFunctions.push(cleanup);
    }

    /**
     * Trap focus within modal
     * @param {Event} event - Keyboard event
     */
    trapFocus(event) {
        const focusableElements = this.modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey) {
            if (document.activeElement === firstFocusable) {
                lastFocusable.focus();
                event.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                firstFocusable.focus();
                event.preventDefault();
            }
        }
    }

    /**
     * Attach button event handlers
     * @param {Object} handlers - Button action handlers
     */
    attachButtonHandlers(handlers = {}) {
        // Close button handler
        const closeButtons = this.modal.querySelectorAll(`.${this.namespace}-modal-close`);
        closeButtons.forEach(button => {
            const cleanup = CoreEventUtils.addListener(button, 'click', () => this.close());
            this.cleanupFunctions.push(cleanup);
        });
        
        // Action button handlers
        const actionButtons = this.modal.querySelectorAll(`[data-action]`);
        actionButtons.forEach(button => {
            const action = button.dataset.action;
            const handler = handlers[action];
            
            if (handler) {
                const cleanup = CoreEventUtils.addListener(button, 'click', (event) => {
                    event.preventDefault();
                    handler(event, this);
                });
                this.cleanupFunctions.push(cleanup);
            }
        });
    }

    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        const loadingHTML = `
            <div class="${this.namespace}-modal-loading">
                <div class="${this.namespace}-loading-spinner"></div>
                <div class="${this.namespace}-loading-message">${CoreDOMUtils.escapeHtml(message)}</div>
            </div>
        `;
        
        if (this.modal) {
            this.modal.innerHTML = loadingHTML;
        }
    }

    /**
     * Show error state
     * @param {string} message - Error message
     */
    showError(message) {
        const errorHTML = `
            <div class="${this.namespace}-modal-error">
                <div class="${this.namespace}-error-icon">❌</div>
                <div class="${this.namespace}-error-message">${CoreDOMUtils.escapeHtml(message)}</div>
                <button class="${this.namespace}-btn" data-action="close">Close</button>
            </div>
        `;
        
        if (this.modal) {
            this.modal.innerHTML = errorHTML;
            this.attachButtonHandlers({
                close: () => this.close()
            });
        }
    }

    /**
     * Update modal content
     * @param {string} content - New content HTML
     */
    updateContent(content) {
        if (this.modal) {
            this.modal.innerHTML = content;
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Cleanup event listeners
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions = [];
        
        // Restore focus
        if (this.previouslyFocused && this.previouslyFocused.focus) {
            this.previouslyFocused.focus();
        }
        
        // Reset references
        this.overlay = null;
        this.modal = null;
        this.onClose = null;
        this.previouslyFocused = null;
    }

    /**
     * Destroy modal instance
     */
    destroy() {
        if (this.isOpen) {
            this.close();
        } else {
            this.cleanup();
        }
    }

    /**
     * Check if modal is currently open
     * @returns {boolean} - Is open status
     */
    getIsOpen() {
        return this.isOpen;
    }

    /**
     * Get modal element
     * @returns {Element|null} - Modal element
     */
    getModal() {
        return this.modal;
    }

    /**
     * Get overlay element
     * @returns {Element|null} - Overlay element
     */
    getOverlay() {
        return this.overlay;
    }
}

// Export to global scope
window.ModalBase = ModalBase;

console.log('✅ Modal Base loaded successfully');