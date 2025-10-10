// modal/delete_modal.ts - Simplified delete confirmation modal
import * as Logger from '@/core/logger';
import { ModalBase } from '@/modal/modal_base';
import { CoreDOMUtils } from '@/core/dom_utils';

Logger.fgtlog('🗑️ Delete Modal loading...');

/**
 * Simplified delete confirmation modal
 */
class DeleteModal extends ModalBase {
    taskId: string | null;
    taskTitle: string;
    onConfirm: Function | null;

    constructor(namespace: string = 'fancy-gst') {
        super(namespace);
        this.taskId = null;
        this.taskTitle = '';
        this.onConfirm = null;
    }

    /**
     * Show simple delete confirmation
     * @param taskId - Task ID to delete
     * @param taskTitle - Task title for display
     * @param onConfirm - Callback when deletion is confirmed
     * @param onCancel - Callback when modal is closed/cancelled
     */
    show(taskId: string, taskTitle: string, onConfirm: Function | null = null, onCancel: Function | null = null): void {
        this.taskId = taskId;
        this.taskTitle = taskTitle || 'this task';
        this.onConfirm = onConfirm;

        // Create modal - Use 'small' size instead of maxWidth
        this.createModal({
            size: 'small',
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

        Logger.fgtlog('🗑️ Delete modal opened for task: ' + taskId);
    }

    /**
     * Generate simple delete modal HTML
     * @returns Modal content HTML
     */
    generateSimpleDeleteModalHTML(): string {
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
    attachDeleteModalHandlers(): void {
        // Button handlers
        this.attachButtonHandlers({
            cancel: () => {
                this.close();
                Logger.fgtlog('🗑️ Delete cancelled by user');
            },
            delete: () => this.handleConfirmDelete()
        });
    }

    /**
     * Handle confirm delete
     */
    handleConfirmDelete(): void {
        Logger.fgtlog('🗑️ Delete confirmed for task: ' + this.taskId);

        // Close modal
        this.close();

        // Call confirm callback
        if (this.onConfirm) {
            this.onConfirm(this.taskId);
        }
    }

    /**
     * Show delete modal (static method for quick use)
     * @param taskId - Task ID to delete
     * @param taskTitle - Task title for display
     * @param namespace - CSS namespace
     * @param onConfirm - Callback when deletion is confirmed
     * @param onCancel - Callback when modal is closed/cancelled
     * @returns Modal instance
     */
    static show(taskId: string, taskTitle: string, namespace: string = 'fancy-gst', onConfirm: Function | null = null, onCancel: Function | null = null): DeleteModal {
        const modal = new DeleteModal(namespace);
        modal.show(taskId, taskTitle, onConfirm, onCancel);
        return modal;
    }
}

export { DeleteModal };

Logger.fgtlog('✅ Delete Modal loaded successfully');