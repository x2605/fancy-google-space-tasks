// core/complex_interaction/edit_task_interaction.ts - Task editing with category support
import * as Logger from '@/core/logger';
import { CoreNotificationUtils } from '@/core/notification_utils';
import { CoreEventUtils } from '@/core/event_utils';
import { CoreDOMUtils } from '@/core/dom_utils';
import { OgtFinder } from '@/manipulator/finder';
import { OgtTaskElement } from '@/manipulator/task_element/task_element';
import { BaseInteraction } from './base_interaction';

Logger.fgtlog('📝 Edit Task Interaction loading...');

/**
 * Complex task editing interaction
 * Handles editing task title and description with proper sequencing
 */
class EditTaskInteraction extends BaseInteraction {
    /**
     * Edit task with proper sequencing
     * @param taskId - Task ID to edit
     * @param newTitle - New title (with categories reconstructed)
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
        try {
            Logger.fgtlog(`📝 Starting task edit: ${taskId}`);
            Logger.fgtlog(`  Title: "${originalTitle}" → "${newTitle}"`);
            Logger.fgtlog(`  Description: "${originalDescription}" → "${newDescription}"`);

            // Check if any changes needed
            const titleChanged = newTitle !== originalTitle;
            const descriptionChanged = newDescription !== originalDescription;

            if (!titleChanged && !descriptionChanged) {
                Logger.fgtlog('ℹ️ No changes detected');
                if (onComplete) onComplete();
                return;
            }

            // Validate: title must not be empty
            if (!newTitle || newTitle.trim() === '') {
                throw new Error('Title cannot be empty');
            }

            // Find task element
            let taskElement = OgtFinder.findTaskElement(taskId);
            if (!taskElement) {
                throw new Error(`Task element not found: ${taskId}`);
            }

            // Ensure UI is visible (for narrow screens)
            await this.ensureTaskUIVisible(taskElement);

            // Step 1: Always click title wrapper to enter edit mode
            Logger.fgtlog('🎯 Step 1: Click title wrapper');
            const titleWrapper = taskElement.findTitleWrapper();
            if (!titleWrapper) throw new Error('Title wrapper not found');

            // Use simulateClick for div elements
            this.simulateClick(titleWrapper.element);
            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 300));

            // Step 2: Update description first (if needed)
            if (descriptionChanged) {
                Logger.fgtlog('📄 Step 2: Updating description');
                await this.updateDescription(taskElement, newDescription);
                
                // Re-target task element after description change
                taskElement = OgtFinder.findTaskElement(taskId);
                if (!taskElement) throw new Error('Task element lost after description update');
            }

            // Step 3: Update title (if needed)
            if (titleChanged) {
                Logger.fgtlog('📝 Step 3: Updating title');
                await this.updateTitle(taskElement, newTitle);
                
                // Re-target task element after title change
                taskElement = OgtFinder.findTaskElement(taskId);
                if (!taskElement) throw new Error('Task element lost after title update');
            }

            // Step 4: Verify changes applied
            Logger.fgtlog('✅ Step 4: Verifying changes');
            await this.verifyChanges(taskElement, newTitle, newDescription);

            // Step 5: Finalize
            Logger.fgtlog('🏁 Step 5: Finalizing');
            document.activeElement && (document.activeElement as HTMLElement).blur();
            
            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 500));

            if (onComplete) onComplete();
            CoreNotificationUtils.success('Task updated successfully', this.namespace);
            Logger.fgtlog('✅ Task edit completed successfully');

        } catch (error: any) {
            Logger.fgterror('❌ Edit task error: ' + error.message);
            CoreNotificationUtils.error('Failed to edit task: ' + error.message, this.namespace);
            throw error;
        }
    }

    /**
     * Update task description
     * @param taskElement - Task element wrapper
     * @param newDescription - New description text
     */
    private async updateDescription(taskElement: OgtTaskElement, newDescription: string): Promise<void> {
        try {
            // Find description wrapper
            const descWrapper = taskElement.findDescWrapper();
            if (!descWrapper) throw new Error('Description wrapper not found');

            // Click to enter edit mode - use simulateClick for div
            this.simulateClick(descWrapper.element);
            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 200));

            // Wait for editor to appear
            const descEditor = await descWrapper.waitForDescEditor(2000);
            if (!descEditor) throw new Error('Description editor not found');

            // Focus and set value
            descEditor.focus();
            descEditor.element.value = newDescription;

            // Trigger input event
            const inputEvent = CoreDOMUtils.createInputEvent();
            descEditor.element.dispatchEvent(inputEvent);

            // Blur to save
            descEditor.blur();

            // Wait for changes to apply
            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 800));

            // Verify description changed
            const updatedViewer = descWrapper.findDescViewer();
            if (!updatedViewer) throw new Error('Cannot verify description change');

            const currentDesc = updatedViewer.text;
            const placeholder = descWrapper.placeholder;

            // Handle empty description case
            const actualDesc = currentDesc === placeholder ? '' : currentDesc;

            if (actualDesc !== newDescription) {
                Logger.fgtwarn(`⚠️ Description mismatch: expected "${newDescription}", got "${actualDesc}"`);
                // Allow small differences (whitespace, etc.)
                if (actualDesc.trim() !== newDescription.trim()) {
                    throw new Error('Description update verification failed');
                }
            }

            Logger.fgtlog('✅ Description updated and verified');

        } catch (error: any) {
            Logger.fgterror('❌ Update description error: ' + error.message);
            throw new Error('Failed to update description: ' + error.message);
        }
    }

    /**
     * Update task title
     * @param taskElement - Task element wrapper
     * @param newTitle - New title text
     */
    private async updateTitle(taskElement: OgtTaskElement, newTitle: string): Promise<void> {
        try {
            // Find title wrapper
            const titleWrapper = taskElement.findTitleWrapper();
            if (!titleWrapper) throw new Error('Title wrapper not found');

            // Click to enter edit mode - use simulateClick for div
            this.simulateClick(titleWrapper.element);
            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 200));

            // Wait for editor to appear
            const titleEditor = await titleWrapper.waitForTitleEditor(2000);
            if (!titleEditor) throw new Error('Title editor not found');

            // Focus and set value
            titleEditor.focus();
            titleEditor.element.value = newTitle;

            // Trigger input event
            const inputEvent = CoreDOMUtils.createInputEvent();
            titleEditor.element.dispatchEvent(inputEvent);

            // Blur to save
            titleEditor.blur();

            // Wait for changes to apply
            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 800));

            Logger.fgtlog('✅ Title updated');

        } catch (error: any) {
            Logger.fgterror('❌ Update title error: ' + error.message);
            throw new Error('Failed to update title: ' + error.message);
        }
    }

    /**
     * Verify changes were applied correctly
     * @param taskElement - Task element wrapper
     * @param expectedTitle - Expected title
     * @param expectedDescription - Expected description
     */
    private async verifyChanges(
        taskElement: OgtTaskElement,
        expectedTitle: string,
        expectedDescription: string
    ): Promise<void> {
        try {
            // Verify title with flexible whitespace handling
            // Original UI sometimes trims, sometimes doesn't - we handle both cases
            const titleWrapper = taskElement.findTitleWrapper();
            const titleViewer = titleWrapper?.findTitleViewer();
            const currentTitle = titleViewer?.text || '';

            const titleMatches = CoreDOMUtils.compareWithFlexibleWhitespace(
                currentTitle,
                expectedTitle
            );

            if (!titleMatches) {
                Logger.fgtwarn(`⚠️ Title mismatch: expected "${expectedTitle}", got "${currentTitle}"`);
                throw new Error('Title verification failed');
            }

            // Verify description with flexible whitespace handling
            // Original UI sometimes trims, sometimes doesn't - we handle both cases
            const descWrapper = taskElement.findDescWrapper();
            const descViewer = descWrapper?.findDescViewer();
            const currentDesc = descViewer?.text || '';
            const placeholder = descWrapper?.placeholder || '';
            const actualDesc = currentDesc === placeholder ? '' : currentDesc;

            const descMatches = CoreDOMUtils.compareWithFlexibleWhitespace(
                actualDesc,
                expectedDescription
            );

            if (!descMatches) {
                Logger.fgtwarn(`⚠️ Description mismatch: expected "${expectedDescription}", got "${actualDesc}"`);
                throw new Error('Description verification failed');
            }

            Logger.fgtlog('✅ All changes verified successfully');

        } catch (error: any) {
            Logger.fgterror('❌ Verification error: ' + error.message);
            throw error;
        }
    }
}

// Export singleton instance
const editTaskInteraction = new EditTaskInteraction();

export { EditTaskInteraction, editTaskInteraction };

Logger.fgtlog('✅ Edit Task Interaction loaded successfully');