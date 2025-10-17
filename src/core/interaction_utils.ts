// core/interaction_utils.ts - Original DOM interaction utilities (REFACTORED)
import * as Logger from '@/core/logger';
import { CoreEventUtils } from './event_utils';
import { OperationVerifier } from './operation_verifier';
import { OgtFinder } from '@/manipulator/finder';
import { CoreNotificationUtils } from './notification_utils';
import { CoreDOMUtils } from './dom_utils';

// Import complex interactions
import { editTaskInteraction } from './complex_interaction/edit_task_interaction';
import { deleteTaskInteraction } from './complex_interaction/delete_task_interaction';
import { setDateInteraction } from './complex_interaction/set_date_interaction';
import { setAssigneeInteraction } from './complex_interaction/set_assignee_interaction';

Logger.fgtlog('🔄 Core Interaction Utils loading (refactored)...');

/**
 * Core interaction utilities for manipulating original Google Tasks DOM
 * Simple interactions are handled directly, complex ones are delegated
 */
class CoreInteractionUtils {
    namespace: string;
    verifier: any;

    constructor(namespace: string = 'fancy-gst') {
        this.namespace = namespace;
        this.verifier = new OperationVerifier(namespace);
    }

    // ========== Simple Interactions (kept here) ==========

    /**
     * Toggle task completion state
     * Monitors DOM changes for faster response
     */
    async toggleTask(taskId: string, onComplete: Function): Promise<void> {
        try {
            Logger.fgtlog(`🔄 Toggling task: ${taskId}`);
            const checkbox = OgtFinder.findCompleteCheckbox(taskId);
            if (!checkbox) throw new Error(`Checkbox not found for task: ${taskId}`);

            const initialComplete = checkbox.complete;
            const expectedState = !initialComplete;
            const originalElement = checkbox.element;

            this.triggerClick(checkbox.element);

            // Monitor for checkbox element disappearance and state change
            this.verifier.verifyOperation(
                () => {
                    // Check if original element is disconnected from DOM
                    if (!originalElement.isConnected) {
                        Logger.fgtlog('✅ Original checkbox element disconnected, checking for new checkbox');

                        // Find new checkbox with same taskId
                        const newCheckbox = OgtFinder.findCompleteCheckbox(taskId);
                        if (newCheckbox && newCheckbox.complete === expectedState) {
                            Logger.fgtlog('✅ New checkbox found with expected state');
                            return true;
                        }
                    }

                    // Also check if state changed on same element (fast path)
                    const currentCheckbox = OgtFinder.findCompleteCheckbox(taskId);
                    if (currentCheckbox && currentCheckbox.complete === expectedState) {
                        return true;
                    }

                    return false;
                },
                5000, // Maximum timeout for safety
                () => {
                    if (onComplete) onComplete();
                    // No notification on success
                },
                () => {
                    CoreNotificationUtils.error('Failed to verify task status update', this.namespace);
                    if (onComplete) onComplete();
                },
                { pollInterval: 50 } // Check every 50ms for faster response
            );
        } catch (error: any) {
            Logger.fgterror('❌ Toggle task error:' + error);
            CoreNotificationUtils.error('Failed to update task status', this.namespace);
        }
    }

    /**
     * Show task in chat
     */
    async showInChat(taskId: string): Promise<void> {
        try {
            Logger.fgtlog(`💬 Showing task in chat: ${taskId}`);
            const taskElement = OgtFinder.findTaskWrapper(taskId);
            if (!taskElement) throw new Error(`Task element not found: ${taskId}`);

            await this.ensureTaskUIVisible(taskElement);

            const chatButton = taskElement.findGoToChatButton();
            if (!chatButton) throw new Error('Chat button not found');

            this.triggerClick(chatButton.element);
            CoreNotificationUtils.success('Showing task in chat', this.namespace);
        } catch (error: any) {
            Logger.fgterror('❌ Show in chat error:' + error);
            CoreNotificationUtils.error('Failed to show task in chat', this.namespace);
        }
    }

    // ========== Complex Interactions (delegated) ==========

    /**
     * Edit task (title and/or description)
     * @param taskId - Task ID
     * @param newTitle - New title (with categories)
     * @param newDescription - New description
     * @param originalTitle - Original title for comparison
     * @param originalDescription - Original description for comparison
     * @param onComplete - Callback when complete
     */
    async editTask(
        taskId: string,
        newTitle: string,
        newDescription: string,
        originalTitle: string = '',
        originalDescription: string = '',
        onComplete: Function | null = null
    ): Promise<void> {
        return editTaskInteraction.editTask(
            taskId,
            newTitle,
            newDescription,
            originalTitle,
            originalDescription,
            onComplete
        );
    }

    /**
     * Delete task with confirmation
     */
    async deleteTask(taskId: string, onComplete: Function): Promise<void> {
        return deleteTaskInteraction.deleteTask(taskId, onComplete);
    }

    /**
     * Set task date
     */
    async setTaskDate(taskId: string, dateString: string | null, onComplete: Function): Promise<void> {
        return setDateInteraction.setTaskDate(taskId, dateString, onComplete);
    }

    /**
     * Set task assignee
     */
    async setTaskAssignee(taskId: string, assigneeName: string | null, onComplete: Function): Promise<void> {
        return setAssigneeInteraction.setTaskAssignee(taskId, assigneeName, onComplete);
    }

    /**
     * Get available assignees from a task
     */
    async getAvailableAssignees(taskId: string): Promise<string[]> {
        return setAssigneeInteraction.getAvailableAssignees(taskId);
    }

    // ========== Helper Methods ==========

    /**
     * Ensure task UI is visible (for narrow screens)
     */
    async ensureTaskUIVisible(taskElement: any): Promise<void> {
        if (!taskElement) return;

        const firstDiv = taskElement.findFirstDiv();
        if (firstDiv) {
            this.simulateClick(firstDiv);
            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 300));
        }
    }

    /**
     * Trigger click event (for button elements)
     */
    triggerClick(element: Element): void {
        if (!element) return;
        const event = CoreDOMUtils.createMouseEvent('click');
        element.dispatchEvent(event);
    }

    /**
     * Simulate click on div elements with coordinate-based mouse events
     * Required for div elements that don't respond to simple click events
     */
    simulateClick(element: Element): void {
        CoreDOMUtils.simulateClick(element);
    }

    /**
     * Cleanup verifier resources
     */
    cleanup(): void {
        if (this.verifier) {
            this.verifier.cleanup();
        }
        // Cleanup complex interaction resources
        deleteTaskInteraction.cleanup();
    }
}

export { CoreInteractionUtils };

Logger.fgtlog('✅ Core Interaction Utils loaded successfully (refactored)');