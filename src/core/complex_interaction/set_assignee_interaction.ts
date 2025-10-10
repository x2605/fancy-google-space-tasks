// core/complex_interaction/set_assignee_interaction.ts - Task assignee setting
import * as Logger from '@/core/logger';
import { CoreNotificationUtils } from '@/core/notification_utils';
import { CoreEventUtils } from '@/core/event_utils';
import { OgtFinder } from '@/manipulator/finder';
import { BaseInteraction } from './base_interaction';

Logger.fgtlog('👤 Set Assignee Interaction loading...');

/**
 * Complex assignee setting interaction with selector dialog
 */
class SetAssigneeInteraction extends BaseInteraction {
    /**
     * Set task assignee through selector dialog
     * @param taskId - Task ID
     * @param assigneeName - Assignee name or null to unassign
     * @param onComplete - Callback when complete
     */
    async setTaskAssignee(taskId: string, assigneeName: string | null, onComplete: Function | null = null): Promise<void> {
        try {
            Logger.fgtlog(`👤 Setting assignee for task ${taskId}: "${assigneeName}"`);
            
            const taskElement = OgtFinder.findTaskElement(taskId);
            if (!taskElement) throw new Error(`Task element not found: ${taskId}`);

            const checkbox = taskElement.findCompleteCheckbox();
            if (checkbox && checkbox.complete) {
                throw new Error('Cannot change assignee for completed tasks');
            }

            await this.ensureTaskUIVisible(taskElement);

            const assigneeButton = taskElement.findAssigneeButton();
            if (!assigneeButton) throw new Error('Assignee button not found');

            this.triggerClick(assigneeButton.element);

            const listbox = await assigneeButton.waitForAssigneeListbox(2000);
            assigneeButton.element.focus();

            const assigneeItems = listbox.findAllAssigneeItems();
            let targetOption = null;

            if (!assigneeName) {
                // Find unassign option
                targetOption = assigneeItems.find((item: any) => item.isUnassignOption());
            } else {
                // Find matching assignee
                targetOption = assigneeItems.find((item: any) => {
                    const text = item.text.toLowerCase();
                    return text.includes(assigneeName.toLowerCase());
                });
            }

            if (!targetOption) throw new Error(`Assignee option not found: ${assigneeName || 'unassign'}`);

            this.triggerClick(targetOption.element);

            CoreEventUtils.timeouts.create(() => {
                if (onComplete) onComplete();
                const message = assigneeName ?
                    `Task assigned to ${assigneeName}` : 'Task unassigned';
                CoreNotificationUtils.success(message, this.namespace);
            }, 1000);

        } catch (error: any) {
            Logger.fgterror('❌ Set task assignee error: ' + error.message);
            CoreNotificationUtils.error('Failed to set task assignee', this.namespace);
            throw error;
        }
    }

    /**
     * Get available assignees from task's assignee selector
     * @param taskId - Task ID
     * @returns Array of available assignee names
     */
    async getAvailableAssignees(taskId: string): Promise<string[]> {
        try {
            const taskElement = OgtFinder.findTaskElement(taskId);
            if (!taskElement) return [];

            await this.ensureTaskUIVisible(taskElement);

            const assigneeButton = taskElement.findAssigneeButton();
            if (!assigneeButton) return [];

            this.triggerClick(assigneeButton.element);

            const listbox = await assigneeButton.waitForAssigneeListbox(2000);
            assigneeButton.element.focus();

            const assigneeItems = listbox.findAllAssigneeItems();
            const assignees = assigneeItems
                .filter((item: any) => item.hasImage())
                .map((item: any) => item.text.trim())
                .filter((name: string) => name);

            // Close dropdown
            this.triggerClick(document.body);

            return assignees;

        } catch (error: any) {
            Logger.fgterror('❌ Get available assignees error: ' + error.message);
            return [];
        }
    }
}

// Export singleton instance
const setAssigneeInteraction = new SetAssigneeInteraction();

export { SetAssigneeInteraction, setAssigneeInteraction };

Logger.fgtlog('✅ Set Assignee Interaction loaded successfully');