// core/complex_interaction/set_date_interaction.ts - Task date setting
import * as Logger from '@/core/logger';
import { CoreNotificationUtils } from '@/core/notification_utils';
import { CoreEventUtils } from '@/core/event_utils';
import { OgtFinder } from '@/manipulator/finder';
import { OgtDateSelectDialog } from '@/manipulator/date_select_dialog';
import { BaseInteraction } from './base_interaction';

Logger.fgtlog('📅 Set Date Interaction loading...');

/**
 * Complex date setting interaction with calendar dialog
 */
class SetDateInteraction extends BaseInteraction {
    /**
     * Set task date through date picker dialog
     * @param taskId - Task ID
     * @param dateString - Date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm) or null to clear
     * @param onComplete - Callback when complete
     */
    async setTaskDate(taskId: string, dateString: string | null, onComplete: Function | null = null): Promise<void> {
        try {
            Logger.fgtlog(`📅 Setting date for task ${taskId}: "${dateString}"`);
            
            const taskElement = OgtFinder.findTaskElement(taskId);
            if (!taskElement) throw new Error(`Task element not found: ${taskId}`);

            const checkbox = taskElement.findCompleteCheckbox();
            if (checkbox && checkbox.complete) {
                throw new Error('Cannot change date for completed tasks');
            }

            await this.ensureTaskUIVisible(taskElement);

            const dateButton = taskElement.findDateButton();
            if (!dateButton) throw new Error('Date button not found');

            this.triggerClick(dateButton.element);

            const dateDialog = await dateButton.waitForDateSelectDialog(3000);

            if (!dateString) {
                // Clear date
                const deleteButton = dateDialog.element.querySelector('button:not([data-mdc-dialog-action])');
                if (deleteButton) {
                    this.triggerClick(deleteButton);
                } else {
                    const cancelButton = dateDialog.findDateCancelButton();
                    if (cancelButton) this.triggerClick(cancelButton);
                }
                if (onComplete) onComplete();
                return;
            }

            // Parse date string
            const [datePart, timePart] = dateString.includes('T') ?
                dateString.split('T') : [dateString, null];
            const [year, month, day] = datePart.split('-').map(Number);

            // Navigate to target month
            await this.navigateToMonth(dateDialog, year, month);

            // Click day
            const dayButton = dateDialog.findDateCell(day);
            if (!dayButton) throw new Error(`Day ${day} not found in calendar`);

            this.triggerClick(dayButton);
            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 500));

            // Set time if provided
            if (timePart) {
                await this.setTime(dateDialog, timePart);
            }

            // Confirm
            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 300));
            const newDialog = new OgtDateSelectDialog(document.querySelector('div[aria-modal="true"][role="dialog"]') as HTMLDivElement);
            const okButton = newDialog.findDateConfirmButton();
            if (!okButton) throw new Error('OK button not found');

            this.triggerClick(okButton);

            CoreEventUtils.timeouts.create(() => {
                if (onComplete) onComplete();
                CoreNotificationUtils.success('Task date updated', this.namespace);
            }, 1000);

        } catch (error: any) {
            Logger.fgterror('❌ Set task date error: ' + error.message);
            CoreNotificationUtils.error('Failed to set task date', this.namespace);
            throw error;
        }
    }
}

// Export singleton instance
const setDateInteraction = new SetDateInteraction();

export { SetDateInteraction, setDateInteraction };

Logger.fgtlog('✅ Set Date Interaction loaded successfully');