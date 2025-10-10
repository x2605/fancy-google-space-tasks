// modal/modal_base.ts - Base modal class (Pure CSS-based)
import * as Logger from '@/core/logger';
import { CoreDOMUtils } from '@/core/dom_utils';
import { CoreEventUtils } from '@/core/event_utils';

Logger.fgtlog('🖼️ Modal Base loading...');

/**
 * Base modal class for all modal types
 */
class ModalBase {
    namespace: string;
    overlay: Element | null;
    modal: Element | null;
    isOpen: boolean;
    onClose: Function | null;
    cleanupFunctions: Function[];
    defaultOptions: any;
    previouslyFocused: any;

    constructor(namespace: string = 'fancy-gst') {
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
            size: 'default' // 'default', 'small', 'large', 'xlarge'
        };
    }

    /**
     * Create modal overlay and container
     * @param options - Modal options
     * @returns Modal element
     */
    createModal(options: any = {}): Element {
        const config = { ...this.defaultOptions, ...options };

        // Create overlay
        this.overlay = CoreDOMUtils.createElement('div', {
            class: `${this.namespace}-modal-overlay`
        }) as HTMLDivElement;

        // Create modal container with size modifier
        const modalClass = config.size !== 'default' 
            ? `${this.namespace}-modal ${this.namespace}-modal--${config.size}`
            : `${this.namespace}-modal`;

        this.modal = CoreDOMUtils.createElement('div', {
            class: modalClass,
            role: 'dialog',
            'aria-modal': 'true'
        }) as HTMLDivElement;

        this.overlay.appendChild(this.modal);

        // Setup event handlers
        this.setupEventHandlers(config);

        return this.modal;
    }

    /**
     * Setup event handlers for modal
     * @param config - Modal configuration
     */
    setupEventHandlers(config: any): void {
        // Close on backdrop click
        if (config.closeOnBackdrop) {
            const cleanup1 = CoreEventUtils.addListener(this.overlay as Element, 'click', (event: any) => {
                if (event.target === this.overlay) {
                    this.close();
                }
            });
            this.cleanupFunctions.push(cleanup1);
        }

        // Close on escape key
        if (config.closeOnEscape) {
            const cleanup2 = CoreEventUtils.addListener(document, 'keydown', (event: any) => {
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
     * @param title - Modal title
     * @param showCloseButton - Show close button
     * @returns Header HTML
     */
    createHeader(title: string, showCloseButton: boolean = true): string {
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
     * @param content - Body content HTML
     * @returns Body HTML
     */
    createBody(content: string): string {
        return `
            <div class="${this.namespace}-modal-body">
                ${content}
            </div>
        `;
    }

    /**
     * Create modal footer
     * @param buttons - Button configurations
     * @returns Footer HTML
     */
    createFooter(buttons: any[] = []): string {
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
     * @param onCloseCallback - Callback when modal closes
     */
    open(onCloseCallback: Function | null = null): void {
        if (this.isOpen) return;

        this.onClose = onCloseCallback;
        this.isOpen = true;

        // Add to DOM
        document.body.appendChild(this.overlay!);

        // Trigger animation
        requestAnimationFrame(() => {
            this.overlay!.classList.add('show');
            this.modal!.classList.add('show');
        });

        // Focus management
        this.setupFocusManagement();

        Logger.fgtlog('📖 Modal opened: ' + this.constructor.name);
    }

    /**
     * Close the modal
     */
    close(): void {
        if (!this.isOpen) return;

        this.isOpen = false;

        // Animate out
        this.overlay!.classList.remove('show');
        this.modal!.classList.remove('show');

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

        Logger.fgtlog('📕 Modal closed: ' + this.constructor.name);
    }

    /**
     * Setup focus management for accessibility
     */
    setupFocusManagement(): void {
        // Store currently focused element
        this.previouslyFocused = document.activeElement;

        // Focus first focusable element in modal
        setTimeout(() => {
            const focusable = this.modal!.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (focusable.length > 0) {
                (focusable[0] as HTMLElement).focus();
            }
        }, 100);
    }

    /**
     * Attach button handlers in modal
     * @param handlers - Handler map {action: handler}
     */
    attachButtonHandlers(handlers: any): void {
        if (!this.modal) return;

        Object.entries(handlers).forEach(([action, handler]) => {
            const button = this.modal!.querySelector(`[data-action="${action}"]`);

            if (button) {
                const cleanup = CoreEventUtils.addListener(button, 'click', handler as Function);
                this.cleanupFunctions.push(cleanup);
            }
        });

        // Close button handler
        const closeBtn = this.modal.querySelector(`.${this.namespace}-modal-close`);
        if (closeBtn) {
            const cleanup = CoreEventUtils.addListener(closeBtn, 'click', () => this.close());
            this.cleanupFunctions.push(cleanup);
        }
    }

    /**
     * Show loading state in modal
     * @param message - Loading message
     */
    showLoading(message: string = 'Loading...'): void {
        const loadingHTML = `
            <div class="${this.namespace}-modal-loading">
                <div class="${this.namespace}-loading-spinner"></div>
                <div class="${this.namespace}-loading-text">${CoreDOMUtils.escapeHtml(message)}</div>
            </div>
        `;

        this.updateContent(loadingHTML);
    }

    /**
     * Show error in modal
     * @param message - Error message
     */
    showError(message: string = 'An error occurred'): void {
        const errorHTML = `
            <div class="${this.namespace}-modal-error">
                <div class="${this.namespace}-error-icon">⚠️</div>
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
     * @param content - New content HTML
     */
    updateContent(content: string): void {
        if (this.modal) {
            this.modal.innerHTML = content;
        }
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
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
    destroy(): void {
        if (this.isOpen) {
            this.close();
        } else {
            this.cleanup();
        }
    }

    /**
     * Check if modal is currently open
     * @returns Is open status
     */
    getIsOpen(): boolean {
        return this.isOpen;
    }

    /**
     * Get modal element
     * @returns Modal element
     */
    getModal(): Element | null {
        return this.modal;
    }

    /**
     * Get overlay element
     * @returns Overlay element
     */
    getOverlay(): Element | null {
        return this.overlay;
    }
}

export { ModalBase };

Logger.fgtlog('✅ Modal Base loaded successfully');