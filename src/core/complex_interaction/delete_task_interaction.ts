// core/complex_interaction/delete_task_interaction.ts - Task deletion with confirmation
import * as Logger from '@/core/logger';
import { CoreNotificationUtils } from '@/core/notification_utils';
import { OgtFinder } from '@/manipulator/finder';
import { OgtDeleteConfirmDialog } from '@/manipulator/delete_confirm_dialog';
import { OperationVerifier } from '@/core/operation_verifier';
import { BaseInteraction } from './base_interaction';

Logger.fgtlog('🗑️ Delete Task Interaction loading...');

/**
 * Complex task deletion interaction with confirmation dialog
 */
class DeleteTaskInteraction extends BaseInteraction {
    verifier: OperationVerifier;

    constructor(namespace: string = 'fancy-gst') {
        super(namespace);
        this.verifier = new OperationVerifier(namespace);
    }

    /**
     * Delete task with confirmation dialog
     * @param taskId - Task ID to delete
     * @param onComplete - Callback when complete
     */
    async deleteTask(taskId: string, onComplete: Function | null = null): Promise<void> {
        try {
            Logger.fgtlog(`🗑️ Deleting task: ${taskId}`);

            const taskElement = OgtFinder.findTaskWrapper(taskId);
            if (!taskElement) throw new Error(`Task element not found: ${taskId}`);

            await this.ensureTaskUIVisible(taskElement);

            const deleteButton = taskElement.findDeleteButton();
            if (!deleteButton) throw new Error('Delete button not found');

            this.triggerClick(deleteButton.element);

            const dialog = await this.waitForElement('div[aria-modal="true"][role="dialog"]', 3000) as Element;
            const deleteConfirmDialog = new OgtDeleteConfirmDialog(dialog);

            const okButton = deleteConfirmDialog.findDeleteConfirmButton();
            if (!okButton) throw new Error('Confirmation OK button not found');

            this.triggerClick(okButton);

            this.verifier.verifyOperation(
                OperationVerifier.waitForTaskDelete(taskId),
                5000, // Maximum timeout for safety
                () => {
                    if (onComplete) onComplete();
                    // No notification on success - handled by container manager
                },
                (_error: any) => {
                    // No notification on error - handled by container manager
                    if (onComplete) onComplete();
                },
                { pollInterval: 50 } // Faster polling for quicker response
            );
        } catch (error: any) {
            Logger.fgterror('❌ Delete task error: ' + error.message);
            CoreNotificationUtils.error('Failed to delete task', this.namespace);
            throw error;
        }
    }

    /**
     * Cleanup verifier resources
     */
    cleanup(): void {
        if (this.verifier) {
            this.verifier.cleanup();
        }
    }
}

// Export singleton instance
const deleteTaskInteraction = new DeleteTaskInteraction();

export { DeleteTaskInteraction, deleteTaskInteraction };

Logger.fgtlog('✅ Delete Task Interaction loaded successfully');