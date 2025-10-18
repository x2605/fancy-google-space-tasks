// manipulator/date/date_dialog_utils.ts - Date dialog manipulation utilities
import * as Logger from '@/core/logger';
import { CoreDOMUtils } from '@/core/dom_utils';
import { parseMonthYearLabel } from '@/dom_bringer/task_element/date_button/date_parser';
import { DIALOG_WAIT_TIMEOUT, TIME_INPUT_BLUR_WAIT } from '@/dom_bringer/date/date_constants';
import type { OgtDateSelectDialog } from '@/dom_bringer/date_select_dialog';

Logger.fgtlog('📅 Date Dialog Utils loading...');

/**
 * Utilities for manipulating the date selection dialog
 */
export class DateDialogUtils {
    /**
     * Navigate to target month and year
     * @param dialog - The OgtDateSelectDialog
     * @param targetYear - Target year
     * @param targetMonth - Target month (1-12)
     * @param snippetMode - Enable detailed logging for snippet mode
     */
    static async navigateToMonthYear(
        dialog: OgtDateSelectDialog,
        targetYear: number,
        targetMonth: number,
        snippetMode: boolean = false
    ): Promise<void> {
        Logger.fgtlog(`🧭 Navigating to ${targetYear}-${targetMonth}...`);
        if (snippetMode) {
            console.log('🧭 [SNIPPET MODE] Navigating to target month/year...');
            console.log(`  Target: ${targetYear}-${targetMonth}`);
        }

        let attempts = 0;
        const maxAttempts = 100; // Safety limit

        while (attempts < maxAttempts) {
            attempts++;

            // Get current month/year from label
            const label = dialog.findMonthYearLabel();
            if (!label) {
                throw new Error('Month/year label not found');
            }

            // Wait for label text to be populated (DOM may render element before text)
            let labelText = label.innerText.trim();
            let pollAttempts = 0;
            const maxPollAttempts = 20; // Up to 2 seconds

            while (!labelText && pollAttempts < maxPollAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                labelText = label.innerText.trim();
                pollAttempts++;
            }

            if (!labelText) {
                throw new Error('Month/year label text is empty after polling');
            }

            Logger.fgtlog(`📍 Current position: "${labelText}"`);
            if (snippetMode) console.log(`📍 [SNIPPET MODE] Current calendar label: "${labelText}"`);

            // Parse current month/year using locale-aware parser
            const parsed = parseMonthYearLabel(labelText);
            if (!parsed) {
                throw new Error(`Failed to parse month/year label: "${labelText}"`);
            }

            const currentYear = parsed.year;
            const currentMonth = parsed.month;

            Logger.fgtlog(`📊 Parsed: ${currentYear}-${currentMonth}`);
            if (snippetMode) {
                console.log(`📊 [SNIPPET MODE] Parsed current position:`);
                console.log(`  Year: ${currentYear}`);
                console.log(`  Month: ${currentMonth}`);
            }

            // Check if we've reached target
            if (currentYear === targetYear && currentMonth === targetMonth) {
                Logger.fgtlog('✅ Reached target month/year');
                if (snippetMode) console.log('✅ [SNIPPET MODE] Reached target month/year');
                return;
            }

            // Determine direction
            const currentDate = new Date(currentYear, currentMonth - 1);
            const targetDate = new Date(targetYear, targetMonth - 1);
            const needNext = targetDate > currentDate;

            // Click appropriate button
            const button = needNext ? dialog.findMonthNextButton() : dialog.findMonthPrevButton();
            if (!button) {
                throw new Error(`Navigation button not found (${needNext ? 'next' : 'prev'})`);
            }

            Logger.fgtlog(`🖱️ Clicking ${needNext ? 'next' : 'prev'} month button...`);
            if (snippetMode) console.log(`🖱️ [SNIPPET MODE] Clicking ${needNext ? 'next' : 'prev'} month button...`);
            button.click();

            // Wait for UI update
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error(`Failed to navigate to ${targetYear}-${targetMonth} after ${maxAttempts} attempts`);
    }

    /**
     * Select a specific day in the calendar
     * @param dialog - The OgtDateSelectDialog
     * @param day - Day of month (1-31)
     * @param snippetMode - Enable detailed logging for snippet mode
     */
    static async selectDay(dialog: OgtDateSelectDialog, day: number, snippetMode: boolean = false): Promise<void> {
        Logger.fgtlog(`📅 Selecting day ${day}...`);
        if (snippetMode) console.log(`📅 [SNIPPET MODE] Selecting day ${day}...`);

        const dateCell = dialog.findDateCell(day);
        if (!dateCell) {
            throw new Error(`Date cell for day ${day} not found`);
        }

        Logger.fgtlog('🖱️ Clicking date cell...');
        if (snippetMode) console.log('🖱️ [SNIPPET MODE] Clicking date cell...');
        dateCell.click();

        // Wait for selection and potential DOM re-render
        await new Promise(resolve => setTimeout(resolve, 100));

        // Re-query the date cell after click (DOM may have been re-rendered)
        const updatedDateCell = dialog.findDateCell(day);
        if (!updatedDateCell) {
            throw new Error(`Date cell for day ${day} not found after click`);
        }

        // Verify selection on the updated element
        const isSelected = updatedDateCell.getAttribute('aria-selected') === 'true';
        if (!isSelected) {
            throw new Error(`Failed to select day ${day} (aria-selected is not true)`);
        }

        Logger.fgtlog(`✅ Day ${day} selected successfully`);
        if (snippetMode) console.log(`✅ [SNIPPET MODE] Day ${day} selected successfully`);
    }

    /**
     * Set time in the time input
     * @param dialog - The OgtDateSelectDialog
     * @param time - Time in HH:MM format (24-hour)
     * @param snippetMode - Enable detailed logging for snippet mode
     */
    static async setTime(dialog: OgtDateSelectDialog, time: string, snippetMode: boolean = false): Promise<void> {
        Logger.fgtlog(`🕐 Setting time to ${time}...`);
        if (snippetMode) console.log(`🕐 [SNIPPET MODE] Setting time to ${time}...`);

        const timeInputWrapper = dialog.findTimeInputWrapper();
        const timeInput = dialog.findTimeInput();
        if (!timeInput || !timeInputWrapper) {
            throw new Error('Time input not found');
        }

        // Focus input
        Logger.fgtlog('🔍 Focusing time input...');
        if (snippetMode) console.log('🔍 [SNIPPET MODE] Focusing time input...');
        CoreDOMUtils.simulateClick(timeInputWrapper);
        timeInput.focus();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Clear existing value
        Logger.fgtlog('🗑️ Clearing existing value...');
        if (snippetMode) console.log('🗑️ [SNIPPET MODE] Clearing existing value...');
        timeInput.value = '';
        await new Promise(resolve => setTimeout(resolve, 50));

        // Type each character using keyboard events
        Logger.fgtlog(`⌨️ Typing time "${time}" character by character...`);
        if (snippetMode) console.log(`⌨️ [SNIPPET MODE] Typing time "${time}" character by character...`);
        for (const char of time) {
            // Get key code and code for this character
            let keyCode: number;
            let code: string;

            if (char >= '0' && char <= '9') {
                keyCode = char.charCodeAt(0);
                code = `Digit${char}`;
            } else if (char === ':') {
                keyCode = 186; // Semicolon key code (Shift+: on most keyboards)
                code = 'Semicolon';
            } else {
                keyCode = char.charCodeAt(0);
                code = `Key${char.toUpperCase()}`;
            }

            // Dispatch keydown event
            const keydownEvent = new KeyboardEvent('keydown', {
                key: char,
                code: code,
                keyCode: keyCode,
                bubbles: true,
                cancelable: true
            });
            timeInput.dispatchEvent(keydownEvent);

            // Dispatch keypress event
            const keypressEvent = new KeyboardEvent('keypress', {
                key: char,
                code: code,
                keyCode: keyCode,
                bubbles: true,
                cancelable: true
            });
            timeInput.dispatchEvent(keypressEvent);

            // Update value manually
            timeInput.value += char;

            // Dispatch input event
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            timeInput.dispatchEvent(inputEvent);

            // Dispatch keyup event
            const keyupEvent = new KeyboardEvent('keyup', {
                key: char,
                code: code,
                keyCode: keyCode,
                bubbles: true,
                cancelable: true
            });
            timeInput.dispatchEvent(keyupEvent);

            // Small delay between characters
            await new Promise(resolve => setTimeout(resolve, 30));
        }

        Logger.fgtlog(`✍️ Final value: "${timeInput.value}"`);
        if (snippetMode) console.log(`✍️ [SNIPPET MODE] Final value: "${timeInput.value}"`);

        // Blur input
        Logger.fgtlog('👋 Blurring time input...');
        if (snippetMode) console.log('👋 [SNIPPET MODE] Blurring time input...');
        timeInput.blur();
        // Ensures original UI performing
        CoreDOMUtils.simulateClick(timeInputWrapper);
        await new Promise(resolve => setTimeout(resolve, 30));
        const timeIcon = dialog.findTimeIcon();
        if (timeIcon) {
            CoreDOMUtils.simulateClick(timeIcon);
        }
        await new Promise(resolve => setTimeout(resolve, TIME_INPUT_BLUR_WAIT));

        Logger.fgtlog(`✅ Time set to ${time}`);
        if (snippetMode) console.log(`✅ [SNIPPET MODE] Time set to ${time}`);
    }

    /**
     * Clear time from the time input
     * Uses the specific sequence required by Google Tasks to properly clear time
     *
     * @param dialog - The OgtDateSelectDialog
     * @param snippetMode - Enable detailed logging for snippet mode
     */
    static async clearTime(dialog: OgtDateSelectDialog, snippetMode: boolean = false): Promise<void> {
        Logger.fgtlog('🗑️ Clearing time...');
        if (snippetMode) console.log('🗑️ [SNIPPET MODE] Clearing time...');

        const timeInputWrapper = dialog.findTimeInputWrapper();
        const timeInput = dialog.findTimeInput();
        if (!timeInput || !timeInputWrapper) {
            throw new Error('Time input not found');
        }

        // Focus input
        Logger.fgtlog('🔍 Focusing time input...');
        if (snippetMode) console.log('🔍 [SNIPPET MODE] Focusing time input...');
        CoreDOMUtils.simulateClick(timeInputWrapper);
        timeInput.focus();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Set value to empty
        Logger.fgtlog('🗑️ Setting value to empty...');
        if (snippetMode) console.log('🗑️ [SNIPPET MODE] Setting value to empty...');
        timeInput.value = '';
        await new Promise(resolve => setTimeout(resolve, 50));

        // Type '0' with keyboard events
        Logger.fgtlog('⌨️ Typing "0"...');
        if (snippetMode) console.log('⌨️ [SNIPPET MODE] Typing "0"...');

        const keyCode = '0'.charCodeAt(0);
        const code = 'Digit0';

        // Dispatch keydown for '0'
        const keydownEvent = new KeyboardEvent('keydown', {
            key: '0',
            code: code,
            keyCode: keyCode,
            bubbles: true,
            cancelable: true
        });
        timeInput.dispatchEvent(keydownEvent);

        // Dispatch keypress for '0'
        const keypressEvent = new KeyboardEvent('keypress', {
            key: '0',
            code: code,
            keyCode: keyCode,
            bubbles: true,
            cancelable: true
        });
        timeInput.dispatchEvent(keypressEvent);

        // Update value to '0'
        timeInput.value = '0';

        // Dispatch input event
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        timeInput.dispatchEvent(inputEvent);

        // Dispatch keyup for '0'
        const keyupEvent = new KeyboardEvent('keyup', {
            key: '0',
            code: code,
            keyCode: keyCode,
            bubbles: true,
            cancelable: true
        });
        timeInput.dispatchEvent(keyupEvent);

        await new Promise(resolve => setTimeout(resolve, 30));

        // Dispatch backspace key event
        Logger.fgtlog('⌨️ Dispatching backspace...');
        if (snippetMode) console.log('⌨️ [SNIPPET MODE] Dispatching backspace...');

        const backspaceKeydownEvent = new KeyboardEvent('keydown', {
            key: 'Backspace',
            code: 'Backspace',
            keyCode: 8,
            bubbles: true,
            cancelable: true
        });
        timeInput.dispatchEvent(backspaceKeydownEvent);

        const backspaceKeypressEvent = new KeyboardEvent('keypress', {
            key: 'Backspace',
            code: 'Backspace',
            keyCode: 8,
            bubbles: true,
            cancelable: true
        });
        timeInput.dispatchEvent(backspaceKeypressEvent);

        // Clear value
        timeInput.value = '';

        // Dispatch input event after backspace
        const inputEventAfterBackspace = new Event('input', { bubbles: true, cancelable: true });
        timeInput.dispatchEvent(inputEventAfterBackspace);

        const backspaceKeyupEvent = new KeyboardEvent('keyup', {
            key: 'Backspace',
            code: 'Backspace',
            keyCode: 8,
            bubbles: true,
            cancelable: true
        });
        timeInput.dispatchEvent(backspaceKeyupEvent);

        await new Promise(resolve => setTimeout(resolve, 30));

        Logger.fgtlog(`✍️ Final value: "${timeInput.value}"`);
        if (snippetMode) console.log(`✍️ [SNIPPET MODE] Final value: "${timeInput.value}"`);

        // Blur input with proper sequence
        Logger.fgtlog('👋 Blurring time input...');
        if (snippetMode) console.log('👋 [SNIPPET MODE] Blurring time input...');
        timeInput.blur();
        // Ensures original UI performing
        CoreDOMUtils.simulateClick(timeInputWrapper);
        await new Promise(resolve => setTimeout(resolve, 30));
        const timeIcon = dialog.findTimeIcon();
        if (timeIcon) {
            CoreDOMUtils.simulateClick(timeIcon);
        }
        await new Promise(resolve => setTimeout(resolve, TIME_INPUT_BLUR_WAIT));

        Logger.fgtlog('✅ Time cleared');
        if (snippetMode) console.log('✅ [SNIPPET MODE] Time cleared');
    }

    /**
     * Wait for dialog to close
     * @param dialog - The OgtDateSelectDialog
     * @param timeout - Maximum wait time
     */
    static async waitForDialogClose(dialog: OgtDateSelectDialog, timeout: number = DIALOG_WAIT_TIMEOUT): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            if (!dialog.element.isConnected) {
                Logger.fgtlog('✅ Dialog closed');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        Logger.fgtwarn('⚠️ Dialog did not close within timeout');
    }

    /**
     * Click OK button and wait for dialog to close
     * @param dialog - The OgtDateSelectDialog
     * @param snippetMode - Enable detailed logging for snippet mode
     */
    static async clickOkButton(dialog: OgtDateSelectDialog, snippetMode: boolean = false): Promise<void> {
        Logger.fgtlog('🖱️ Clicking OK button...');
        if (snippetMode) console.log('🖱️ [SNIPPET MODE] Clicking OK button...');

        const okButton = dialog.findDateConfirmButton();
        if (!okButton) {
            throw new Error('OK button not found');
        }

        okButton.click();
        Logger.fgtlog('✅ OK button clicked');
        if (snippetMode) console.log('✅ [SNIPPET MODE] OK button clicked');

        await this.waitForDialogClose(dialog);
    }
}

Logger.fgtlog('✅ Date Dialog Utils loaded successfully');
