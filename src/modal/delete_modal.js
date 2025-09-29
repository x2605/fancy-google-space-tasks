// modal/delete_modal.js - Simplified delete confirmation modal
console.log('🗑️ Delete Modal loading...');

/**
 * Simplified delete confirmation modal
 */
class DeleteModal extends ModalBase {
    constructor(namespace = 'fancy-gst') {
        super(namespace);
        this.taskId = null;
        this.taskTitle = null;
        this.onConfirm = null;
    }

    /**
     * Show simple delete confirmation
     * @param {string} taskId - Task ID to delete
     * @param {string} taskTitle - Task title for display
     * @param {Function} onConfirm - Callback when deletion is confirmed
     * @param {Function} onCancel - Callback when modal is closed/cancelled
     */
    show(taskId, taskTitle, onConfirm = null, onCancel = null) {
        this.taskId = taskId;
        this.taskTitle = taskTitle || 'this task';
        this.onConfirm = onConfirm;

        // Create modal
        this.createModal({
            maxWidth: '400px',
            minWidth: '300px',
            closeOnBackdrop: false,
            closeOnEscape: true
        });

        // Set modal content
        this.updateContent(this.generateSimpleDeleteModalHTML());

        // Attach event handlers
        this.attachDeleteModalHandlers();

        // Open modal with onCancel callback
        this.open(() => {
            // Modal closed without confirmation
            if (onCancel) {
                onCancel();
            }
        });

        console.log(`🗑️ Delete modal opened for task: ${taskId}`);
    }

    /**
     * Generate simple delete modal HTML
     * @returns {string} - Modal content HTML
     */
    generateSimpleDeleteModalHTML() {
        return `
            ${this.createHeader('Delete Task', true)}
            ${this.createBody(`
                <div class="${this.namespace}-delete-content simple">
                    <div class="${this.namespace}-delete-icon">⚠️</div>
                    <div class="${this.namespace}-delete-message">
                        <p>Delete "<strong>${CoreDOMUtils.escapeHtml(this.taskTitle)}</strong>"?</p>
                        <p class="${this.namespace}-warning-text">This action cannot be undone.</p>
                    </div>
                </div>
            `)}
            ${this.createFooter([
                { text: 'Cancel', action: 'cancel' },
                { text: 'Delete', action: 'delete', danger: true }
            ])}
        `;
    }

    /**
     * Attach delete modal event handlers
     */
    attachDeleteModalHandlers() {
        // Button handlers
        this.attachButtonHandlers({
            cancel: () => {
                this.close();
                console.log('🗑️ Delete cancelled by user');
            },
            delete: () => this.handleConfirmDelete()
        });
    }

    /**
     * Handle confirm delete
     */
    handleConfirmDelete() {
        console.log(`🗑️ Delete confirmed for task: ${this.taskId}`);
        
        // Close modal
        this.close();
        
        // Call confirm callback
        if (this.onConfirm) {
            this.onConfirm(this.taskId);
        }
    }

    /**
     * Show delete modal (static method for quick use)
     * @param {string} taskId - Task ID to delete
     * @param {string} taskTitle - Task title for display
     * @param {string} namespace - CSS namespace
     * @param {Function} onConfirm - Callback when deletion is confirmed
     * @param {Function} onCancel - Callback when modal is closed/cancelled
     * @returns {DeleteModal} - Modal instance
     */
    static show(taskId, taskTitle, namespace = 'fancy-gst', onConfirm = null, onCancel = null) {
        const modal = new DeleteModal(namespace);
        modal.show(taskId, taskTitle, onConfirm, onCancel);
        return modal;
    }
}

// Export to global scope
window.DeleteModal = DeleteModal;

console.log('✅ Delete Modal loaded successfully');