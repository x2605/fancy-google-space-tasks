// core/interaction_utils.ts - Original DOM interaction utilities (FULLY REFACTORED)
import * as Logger from '@/core/logger';
import { CoreEventUtils } from './event_utils';
import { OperationVerifier } from './operation_verifier';
import { OgtFinder } from '@/manipulator/finder';
import { CoreNotificationUtils } from './notification_utils';
import { OgtDeleteConfirmDialog } from '@/manipulator/delete_confirm_dialog';
import { CoreDOMUtils } from './dom_utils';
import { OgtDateSelectDialog } from '@/manipulator/date_select_dialog';

Logger.fgtlog('🔄 Core Interaction Utils loading (fully refactored)...');

/**
 * Core interaction utilities for manipulating original Google Tasks DOM
 * Now uses manipulator classes for all DOM access
 */
class CoreInteractionUtils {
    namespace: string;
    verifier: any;

    constructor(namespace: string = 'fancy-gst') {
        this.namespace = namespace;
        this.verifier = new OperationVerifier(namespace);
    }

    /**
     * Toggle task completion state
     */
    async toggleTask(taskId: string, onComplete: Function) {
        try {
            Logger.fgtlog(`🔄 Toggling task: ${taskId}`);
            const checkbox = OgtFinder.findCompleteCheckbox(taskId);
            if (!checkbox) throw new Error(`Checkbox not found for task: ${taskId}`);

            const wasPressed = checkbox.complete;
            const expectedState = !wasPressed;

            this.triggerClick(checkbox.element);

            this.verifier.verifyOperation(
                () => OgtFinder.findCompleteCheckbox(taskId)?.complete === expectedState,
                2000,
                () => {
                    if (onComplete) onComplete();
                    CoreNotificationUtils.success('Task status updated', this.namespace);
                },
                () => {
                    CoreNotificationUtils.error('Failed to verify task status update', this.namespace);
                    if (onComplete) onComplete();
                }
            );
        } catch (error: any) {
            Logger.fgterror('❌ Toggle task error:' + error);
            CoreNotificationUtils.error('Failed to update task status', this.namespace);
        }
    }

    /**
     * Show task in chat
     */
    async showInChat(taskId: string) {
        try {
            Logger.fgtlog(`💬 Showing task in chat: ${taskId}`);
            const taskElement = OgtFinder.findTaskElement(taskId);
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

    /**
     * Delete task with confirmation
     */
    async deleteTask(taskId: string, onComplete: Function) {
        try {
            Logger.fgtlog(`🗑️ Deleting task: ${taskId}`);
            const taskElement = OgtFinder.findTaskElement(taskId);
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
                5000,
                () => {
                    if (onComplete) onComplete();
                    CoreNotificationUtils.success('Task deleted successfully', this.namespace);
                },
                (_error: any) => {
                    CoreNotificationUtils.error('Failed to verify task deletion', this.namespace);
                    if (onComplete) onComplete();
                },
                { pollInterval: 200 }
            );
        } catch (error: any) {
            Logger.fgterror('❌ Delete task error:' + error);
            CoreNotificationUtils.error('Failed to delete task', this.namespace);
        }
    }

    /**
     * Update task title
     */
    async updateTaskTitle(taskId: string, newTitle: string, onComplete: Function) {
        try {
            Logger.fgtlog(`📝 Updating title for task ${taskId}: "${newTitle}"`);
            const taskElement = OgtFinder.findTaskElement(taskId);
            if (!taskElement) throw new Error(`Task element not found: ${taskId}`);

            const firstDiv = taskElement.findFirstDiv();
            if (!firstDiv) throw new Error('First div not found');

            this.triggerClick(firstDiv);

            const titleWrapper = taskElement.findTitleWrapper();
            if (!titleWrapper) throw new Error('Title wrapper not found');

            const titleEditor = await titleWrapper.waitForTitleEditor(2000);

            titleEditor.element.value = newTitle;
            titleEditor.focus();

            const inputEvent = CoreDOMUtils.createInputEvent();
            titleEditor.element.dispatchEvent(inputEvent);

            titleEditor.blur();

            CoreEventUtils.timeouts.create(() => {
                if (onComplete) onComplete();
                CoreNotificationUtils.success('Task title updated', this.namespace);
            }, 1000);
        } catch (error: any) {
            Logger.fgterror('❌ Update task title error:' + error);
            CoreNotificationUtils.error('Failed to update task title', this.namespace);
        }
    }

    /**
     * Update task description
     */
    async updateTaskDescription(taskId: string, newDescription: string, onComplete: Function) {
        try {
            Logger.fgtlog(`📝 Updating description for task ${taskId}: "${newDescription}"`);
            const taskElement = OgtFinder.findTaskElement(taskId);
            if (!taskElement) throw new Error(`Task element not found: ${taskId}`);

            const firstDiv = taskElement.findFirstDiv();
            if (!firstDiv) throw new Error('First div not found');

            this.triggerClick(firstDiv);

            const titleWrapper = taskElement.findTitleWrapper();
            if (!titleWrapper) throw new Error('Title wrapper not found');
            await titleWrapper.waitForTitleEditor(2000);

            const descWrapper = taskElement.findDescWrapper();
            if (!descWrapper) throw new Error('Description wrapper not found');

            this.triggerClick(descWrapper.element);

            const descEditor = await descWrapper.waitForDescEditor(2000);

            descEditor.element.value = newDescription;
            descEditor.focus();

            const inputEvent = CoreDOMUtils.createInputEvent();
            descEditor.element.dispatchEvent(inputEvent);

            descEditor.blur();

            CoreEventUtils.timeouts.create(() => {
                if (onComplete) onComplete();
                CoreNotificationUtils.success('Task description updated', this.namespace);
            }, 1000);
        } catch (error: any) {
            Logger.fgterror('❌ Update task description error:' + error);
            CoreNotificationUtils.error('Failed to update task description', this.namespace);
        }
    }

    /**
     * Set task date
     */
    async setTaskDate(taskId: string, dateString: string | null, onComplete: Function) {
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

            const [datePart, timePart] = dateString.includes('T') ?
                dateString.split('T') : [dateString, null];
            const [year, month, day] = datePart.split('-').map(Number);

            await this.navigateToMonth(dateDialog, year, month);

            const dayButton = dateDialog.findDateCell(day);
            if (!dayButton) throw new Error(`Day ${day} not found in calendar`);

            this.triggerClick(dayButton);
            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 500));

            if (timePart) {
                await this.setTime(dateDialog, timePart);
            }

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
            Logger.fgterror('❌ Set task date error:' + error);
            CoreNotificationUtils.error('Failed to set task date', this.namespace);
        }
    }

    /**
     * Set task assignee
     */
    async setTaskAssignee(taskId: string, assigneeName: string | null, onComplete: Function) {
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
                targetOption = assigneeItems.find((item: any) => item.isUnassignOption());
            } else {
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
            Logger.fgterror('❌ Set task assignee error:' + error);
            CoreNotificationUtils.error('Failed to set task assignee', this.namespace);
        }
    }

    /**
     * Get available assignees from a task
     */
    async getAvailableAssignees(taskId: string) {
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

            this.triggerClick(document.body);

            return assignees;
        } catch (error: any) {
            Logger.fgterror('❌ Get available assignees error:' + error);
            return [];
        }
    }

    /**
     * Navigate to specific month in date picker
     */
    async navigateToMonth(dateDialog: any, targetYear: number, targetMonth: number) {
        let attempts = 0;
        const maxAttempts = 24;

        while (attempts < maxAttempts) {
            const monthYearLabel = dateDialog.findMonthYearLabel();
            if (!monthYearLabel) throw new Error('Month/year label not found');

            const [currentYear, currentMonth] = this.parseMonthYearText(monthYearLabel.textContent);

            if (currentYear === targetYear && currentMonth === targetMonth) {
                break;
            }

            if (currentYear < targetYear || (currentYear === targetYear && currentMonth < targetMonth)) {
                const nextButton = dateDialog.findMonthNextButton();
                if (nextButton) this.triggerClick(nextButton);
            } else {
                const prevButton = dateDialog.findMonthPrevButton();
                if (prevButton) this.triggerClick(prevButton);
            }

            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 300));
            attempts++;
        }

        if (attempts >= maxAttempts) {
            throw new Error('Failed to navigate to target month');
        }
    }

    /**
     * Parse month/year text from dialog
     */
    parseMonthYearText(text: string) {
        const yearMatch = text.match(/(\d{4})/);
        const monthMatch = text.match(/(\d{1,2})월/);

        const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
        const month = monthMatch ? parseInt(monthMatch[1]) : new Date().getMonth() + 1;

        return [year, month];
    }

    /**
     * Set time in date picker
     */
    async setTime(dateDialog: any, timeString: string) {
        const timeInput = dateDialog.findTimeInput();
        if (!timeInput) return;

        timeInput.focus();

        /*const timeDropdown = */await this.waitForElement('div[role="listbox"]', 2000, dateDialog.element);

        const [hour, minute] = timeString.split(':');
        const targetTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`;

        const timeOption = dateDialog.findTimeOption(targetTime);
        if (timeOption) {
            this.triggerClick(timeOption);
        }

        this.triggerClick(dateDialog.element);
        await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 300));
    }

    /**
     * Ensure task UI is visible
     */
    async ensureTaskUIVisible(taskElement: any) {
        if (!taskElement) return;

        const firstDiv = taskElement.findFirstDiv();
        if (firstDiv) {
            this.triggerClick(firstDiv);
            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 300));
        }
    }

    /**
     * Trigger click event
     */
    triggerClick(element: Element) {
        if (!element) return;
        const event = CoreDOMUtils.createMouseEvent('click');
        element.dispatchEvent(event);
    }

    /**
     * Trigger blur event
     */
    triggerBlur(element: Element) {
        if (!element) return;
        const event = new Event('blur', { bubbles: true });
        element.dispatchEvent(event);
    }

    /**
     * Wait for element to appear
     */
    waitForElement(selector: string, timeout: number = 3000, parent: Element | Document = document) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const checkElement = () => {
                const element = parent.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }

                if (Date.now() - startTime >= timeout) {
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                    return;
                }

                CoreEventUtils.timeouts.create(checkElement, 100);
            };

            checkElement();
        });
    }

    /**
     * Cleanup verifier resources
     */
    cleanup() {
        if (this.verifier) {
            this.verifier.cleanup();
        }
    }
}

export { CoreInteractionUtils };

Logger.fgtlog('✅ Core Interaction Utils loaded successfully (fully refactored)');