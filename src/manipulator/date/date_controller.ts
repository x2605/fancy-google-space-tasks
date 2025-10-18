// manipulator/date/date_controller.ts - Main controller for date/time manipulation
import * as Logger from '@/core/logger';
import { CoreDOMUtils } from '@/core/dom_utils';
import { DateVerification } from './date_verification';
import { DateDialogUtils } from './date_dialog_utils';
import { OgtDateSelectDialog } from '@/dom_bringer/date_select_dialog';
import { DIALOG_WAIT_TIMEOUT, AFTER_FOCUS_BLUR_WAIT } from '@/dom_bringer/date/date_constants';
import type { OgtDateButton } from '@/dom_bringer/task_element/date_button/date_button';
import type { OgtTaskWrapper } from '@/dom_bringer/task_element/task_element';

Logger.fgtlog('🎮 Date Controller loading...');

/**
 * Options for DateController.setDateTime()
 */
interface SetDateTimeOptions {
    /**
     * Enable snippet mode for detailed console logging
     * Used by DevTools snippet helpers for debugging
     */
    snippetMode?: boolean;
}

/**
 * Main controller for date/time manipulation
 * Coordinates dialog utilities and verification to change task dates/times
 *
 * This is the new control layer that sits above:
 * - dom_bringer (DOM tracking and parsing)
 * - manipulator/date utilities (verification, dialog manipulation)
 */
export class DateController {
    /**
     * Set date and time through the original UI dialog
     *
     * @param dateButton - The OgtDateButton element
     * @param targetDate - Target date in YYYY-MM-DD format (or null to delete)
     * @param targetTime - Target time in HH:MM format, null to clear time, or undefined to keep existing time
     * @param options - Optional configuration (snippetMode for detailed logging)
     * @param taskElement - Optional task element wrapper for refetching date button during verification
     * @returns Promise resolving to success status
     */
    static async setDateTime(
        dateButton: OgtDateButton,
        targetDate: string | null,
        targetTime?: string | null,
        options?: SetDateTimeOptions,
        taskElement?: OgtTaskWrapper
    ): Promise<boolean> {
        const snippetMode = options?.snippetMode ?? false;

        try {
            Logger.fgtlog(`📅 Starting date manipulation: date=${targetDate}, time=${targetTime}`);

            if (snippetMode) {
                console.log('🔧 [SNIPPET MODE] DateController.setDateTime() called');
                console.log(`  Target date: ${targetDate}`);
                console.log(`  Target time: ${targetTime || '(none)'}`);
            }

            // Click date button to open dialog
            Logger.fgtlog('🖱️ Clicking date button...');
            if (snippetMode) console.log('🖱️ [SNIPPET MODE] Clicking date button...');
            dateButton.element.click();

            // Wait for dialog to appear
            Logger.fgtlog('⏳ Waiting for date select dialog...');
            if (snippetMode) console.log('⏳ [SNIPPET MODE] Waiting for date select dialog...');
            const dialog = await dateButton.waitForDateSelectDialog(DIALOG_WAIT_TIMEOUT);
            Logger.fgtlog('✅ Date select dialog appeared');
            if (snippetMode) console.log('✅ [SNIPPET MODE] Date select dialog appeared');

            // If targetDate is null, click delete button
            if (targetDate === null) {
                Logger.fgtlog('🗑️ Deleting date...');
                if (snippetMode) console.log('🗑️ [SNIPPET MODE] Deleting date...');
                const deleteButton = dialog.findDeleteButton();
                if (!deleteButton) {
                    throw new Error('Delete button not found');
                }
                Logger.fgtlog('🖱️ Clicking delete button...');
                if (snippetMode) console.log('🖱️ [SNIPPET MODE] Clicking delete button...');
                deleteButton.click();

                // Wait a moment for delete action to be processed
                await new Promise(resolve => setTimeout(resolve, 100));

                // Click OK button to confirm deletion
                Logger.fgtlog('🖱️ Clicking OK button to confirm deletion...');
                if (snippetMode) console.log('🖱️ [SNIPPET MODE] Clicking OK button to confirm deletion...');
                await DateDialogUtils.clickOkButton(dialog, snippetMode);

                // Blur currently focused element to trigger Google Tasks DOM update
                await CoreDOMUtils.blurActiveElement(AFTER_FOCUS_BLUR_WAIT);

                Logger.fgtlog('✅ Date deleted successfully');
                if (snippetMode) console.log('✅ [SNIPPET MODE] Date deleted successfully');
                return true;
            }

            // Parse target date
            const [targetYear, targetMonth, targetDay] = targetDate.split('-').map(Number);
            Logger.fgtlog(`🎯 Target: ${targetYear}-${targetMonth}-${targetDay}`);
            if (snippetMode) {
                console.log('🎯 [SNIPPET MODE] Target date parsed:');
                console.log(`  Year: ${targetYear}`);
                console.log(`  Month: ${targetMonth}`);
                console.log(`  Day: ${targetDay}`);
            }

            // Navigate to target month/year
            await DateDialogUtils.navigateToMonthYear(dialog, targetYear, targetMonth, snippetMode);

            // Select target day
            await DateDialogUtils.selectDay(dialog, targetDay, snippetMode);

            // Handle time based on targetTime value:
            // - undefined: Don't touch time (keep existing)
            // - null or '': Clear time completely
            // - 'HH:MM': Set specific time
            if (targetTime !== undefined) {
                if (targetTime === null || targetTime === '') {
                    await DateDialogUtils.clearTime(dialog, snippetMode);
                } else {
                    await DateDialogUtils.setTime(dialog, targetTime, snippetMode);
                }
            }

            // Store original values for verification
            const originalFullLabel = dateButton.fullLabel || '';
            const originalText = dateButton.text || '';

            Logger.fgtlog(`📅 Original date button state:`);
            Logger.fgtlog(`  - fullLabel: "${originalFullLabel}"`);
            Logger.fgtlog(`  - text: "${originalText}"`);

            // Click OK button and wait for dialog to close
            await DateDialogUtils.clickOkButton(dialog, snippetMode);

            // Blur currently focused element (titleEditor) to trigger Google Tasks DOM update
            await CoreDOMUtils.blurActiveElement(AFTER_FOCUS_BLUR_WAIT);

            // Verify changes by polling for DOM update
            // IMPORTANT: Must pass taskElement to allow refetching
            if (!taskElement) {
                Logger.fgtwarn('⚠️ No taskElement provided - verification will use potentially stale dateButton reference');
                return false;
            }

            Logger.fgtlog('🔍 Verifying date/time changes...');
            const verified = await DateVerification.verifyDateTimeChange(
                taskElement,
                targetDate,
                targetTime,
                originalFullLabel,
                originalText
            );

            if (verified) {
                Logger.fgtlog('✅ Date/time change verified successfully');
                if (snippetMode) console.log('✅ [SNIPPET MODE] Date/time change verified successfully');
                return true;
            } else {
                Logger.fgtwarn('⏱️ Date/time change verification timeout (change may still have occurred)');
                if (snippetMode) console.warn('⏱️ [SNIPPET MODE] Verification timeout (change may still have occurred)');
                return false;
            }

        } catch (error: any) {
            Logger.fgterror(`❌ Date manipulation failed: ${error.message}`);
            if (snippetMode) console.error(`❌ [SNIPPET MODE] Date manipulation failed: ${error.message}`);

            // Try to close dialog if it's still open
            try {
                const dialog = OgtDateSelectDialog.findElement();
                if (dialog) {
                    const cancelButton = new OgtDateSelectDialog(dialog).findCancelButton();
                    if (cancelButton) {
                        Logger.fgtlog('🔄 Closing dialog with cancel button...');
                        cancelButton.click();
                    }
                }
            } catch (cleanupError) {
                Logger.fgtwarn('⚠️ Failed to cleanup dialog');
            }

            return false;
        }
    }

    /**
     * Cancel any open date select dialog
     * Useful for cleaning up background dialogs before making changes
     */
    static async cancelOpenDialog(): Promise<void> {
        try {
            const dialogElement = OgtDateSelectDialog.findElement();
            if (dialogElement) {
                Logger.fgtlog('🔄 Found open date select dialog, closing it...');
                const dialog = new OgtDateSelectDialog(dialogElement);
                const cancelButton = dialog.findCancelButton();
                if (cancelButton) {
                    cancelButton.click();
                    await new Promise(resolve => setTimeout(resolve, 300));
                    Logger.fgtlog('✅ Open dialog cancelled');
                }
            }
        } catch (error) {
            Logger.fgtwarn('⚠️ Failed to cancel open dialog');
        }
    }
}

Logger.fgtlog('✅ Date Controller loaded successfully');
