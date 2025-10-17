// manipulator/task_element/date_button/date_manipulator.ts
import * as Logger from '@/core/logger';
import { OgtDateButton } from './task_element/date_button/date_button';
import { OgtTaskWrapper } from './task_element/task_element';
import { findDateSelectDialogElement, OgtDateSelectDialog } from './date_select_dialog';
import { parseNaturalDate } from './task_element/date_button/date_parser';
import { CoreEventUtils } from '@/core/event_utils';
import { CoreDOMUtils } from '@/core/dom_utils';
import { OgtFinder } from './finder';

Logger.fgtlog('📅 Date Manipulator loading...');

// ============================================================
// SNIPPET MODE SUPPORT
// ============================================================
/**
 * Options for DateManipulator.setDateTime()
 */
interface SetDateTimeOptions {
    /**
     * Enable snippet mode for detailed console logging
     * Used by DevTools snippet helpers for debugging
     */
    snippetMode?: boolean;
}

/**
 * Locale keywords interface (matches date_parser.ts)
 */
interface LocaleKeywords {
    locale: string;
    usesLatinNumbers: boolean;
    numberingDigits: string | null;
    dateFormats: string;
    months: {
        combined: string[];
    };
}

/**
 * Get locale keywords from global storage
 */
function getLocaleKeywords(): LocaleKeywords | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const windowAny = window as any;
    const locale = windowAny.FGT_LOCALE || document.documentElement.lang || 'en';

    if (!windowAny.FGT_GET_LOCALE_KEYWORDS) {
        return null;
    }

    const getterFunc = windowAny.FGT_GET_LOCALE_KEYWORDS as (locale: string) => LocaleKeywords | null;
    return getterFunc(locale);
}

/**
 * Normalize numbers from local digits to Latin digits
 * (Same logic as date_parser.ts)
 */
function normalizeNumbers(text: string, keywords: LocaleKeywords): string {
    if (keywords.usesLatinNumbers || !keywords.numberingDigits) {
        return text;
    }

    const digits = keywords.numberingDigits.split('|');

    let normalized = text;
    for (let i = 0; i < 10; i++) {
        if (digits[i]) {
            const localDigit = digits[i];
            const latinDigit = String(i);
            normalized = normalized.replace(new RegExp(localDigit, 'g'), latinDigit);
        }
    }

    return normalized;
}

/**
 * Parse month and year from label text
 * Uses locale keywords to support different formats and number systems
 *
 * @param labelText - Text from findMonthYearLabel().innerText
 * @returns { year, month } or null if parsing fails
 */
function parseMonthYearLabel(labelText: string): { year: number; month: number } | null {
    const keywords = getLocaleKeywords();
    if (!keywords) {
        Logger.fgtwarn('[DateManipulator] No locale keywords available');
        return null;
    }

    // Step 1: Normalize numbers (convert local digits to Arabic/Latin)
    let normalized = normalizeNumbers(labelText, keywords);
    normalized = normalized.trim();

    Logger.fgtlog(`[DateManipulator] Parsing label: "${labelText}" → normalized: "${normalized}"`);

    // Step 2: Extract 4-digit year
    const yearMatch = normalized.match(/[1-9][0-9]{3}/);
    if (!yearMatch) {
        Logger.fgtwarn('[DateManipulator] No 4-digit year found');
        return null;
    }

    const year = parseInt(yearMatch[0], 10);
    Logger.fgtlog(`[DateManipulator] Extracted year: ${year}`);

    // Remove year from text for month extraction
    let remaining = normalized.replace(yearMatch[0], ' ').trim();

    // Step 3: Extract month using months.combined
    // Iterate backwards (12 down to 1) to check longer month variants first
    // This prevents false matches: "12월" should match before "2월"
    // Otherwise "2월" might partially match the "2" in "12"
    let foundMonth: number | null = null;

    for (let monthIndex = keywords.months.combined.length - 1; monthIndex >= 0; monthIndex--) {
        const variants = keywords.months.combined[monthIndex].split('|');

        for (const variant of variants) {
            // Case-insensitive search
            if (remaining.toLowerCase().includes(variant.toLowerCase())) {
                foundMonth = monthIndex + 1; // 1-based month
                Logger.fgtlog(`[DateManipulator] Found month: ${foundMonth} (variant: "${variant}")`);
                break;
            }
        }

        if (foundMonth !== null) {
            break;
        }
    }

    if (foundMonth === null) {
        Logger.fgtwarn('[DateManipulator] No month found in remaining text');
        return null;
    }

    Logger.fgtlog(`[DateManipulator] Successfully parsed: ${year}-${foundMonth}`);
    return { year, month: foundMonth };
}

/**
 * Date manipulation utilities for interacting with OgtDateSelectDialog
 * Handles date/time changes through the original Google Tasks UI
 */
class DateManipulator {
    /**
     * Set date and time through the original UI dialog
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
        // ============================================================
        // SNIPPET MODE: Extract option
        // ============================================================
        const snippetMode = options?.snippetMode ?? false;

        try {
            Logger.fgtlog(`📅 Starting date manipulation: date=${targetDate}, time=${targetTime}`);

            // ============================================================
            // SNIPPET MODE: Additional logging
            // ============================================================
            if (snippetMode) {
                console.log('🔧 [SNIPPET MODE] DateManipulator.setDateTime() called');
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
            const dialog = await dateButton.waitForDateSelectDialog(5000);
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

                // Wait for dialog to close
                await this.waitForDialogClose(dialog);
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
            await this.navigateToMonthYear(dialog, targetYear, targetMonth, snippetMode);

            // Select target day
            await this.selectDay(dialog, targetDay, snippetMode);

            // Handle time based on targetTime value:
            // - undefined: Don't touch time (keep existing)
            // - null or '': Clear time completely
            // - 'HH:MM': Set specific time
            if (targetTime !== undefined) {
                if (targetTime === null || targetTime === '') {
                    await this.clearTime(dialog, snippetMode);
                } else {
                    await this.setTime(dialog, targetTime, snippetMode);
                }
            }

            // Store original values for verification
            const originalFullLabel = dateButton.fullLabel || '';
            const originalText = dateButton.text || '';

            Logger.fgtlog(`📅 Original date button state:`);
            Logger.fgtlog(`  - fullLabel: "${originalFullLabel}"`);
            Logger.fgtlog(`  - text: "${originalText}"`);

            // Click OK button
            Logger.fgtlog('🖱️ Clicking OK button...');
            const okButton = dialog.findOkButton();
            if (!okButton) {
                throw new Error('OK button not found');
            }
            okButton.click();

            // Wait for dialog to close
            await this.waitForDialogClose(dialog);

            // Blur currently focused element (titleEditor) to trigger Google Tasks DOM update
            Logger.fgtlog('👋 Blurring currently focused element...');
            if (document.activeElement && document.activeElement instanceof HTMLElement) {
                Logger.fgtlog(`  - Focused element: ${document.activeElement.tagName}`);
                document.activeElement.blur();
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Verify changes by polling for DOM update
            Logger.fgtlog('🔍 Verifying date/time changes...');
            const verified = await this.verifyDateTimeChange(
                dateButton,
                targetDate,
                targetTime,
                originalFullLabel,
                originalText,
                10000,
                taskElement
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
                const dialog = findDateSelectDialogElement();
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
     * Navigate to target month and year
     * @param dialog - The OgtDateSelectDialog
     * @param targetYear - Target year
     * @param targetMonth - Target month (1-12)
     * @param snippetMode - Enable detailed logging for snippet mode
     */
    private static async navigateToMonthYear(
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

            // ============================================================
            // SNIPPET MODE: Locale-aware parsing with detailed logging
            // ============================================================
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
    private static async selectDay(dialog: OgtDateSelectDialog, day: number, snippetMode: boolean = false): Promise<void> {
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
    private static async setTime(dialog: OgtDateSelectDialog, time: string, snippetMode: boolean = false): Promise<void> {
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
        await new Promise(resolve => setTimeout(resolve, 100));

        Logger.fgtlog(`✅ Time set to ${time}`);
        if (snippetMode) console.log(`✅ [SNIPPET MODE] Time set to ${time}`);
    }

    /**
     * Clear time from the time input
     * Uses the specific sequence required by Google Tasks to properly clear time:
     * 1. Focus input
     * 2. Set value to ''
     * 3. Type '0' with keyboard events
     * 4. Dispatch backspace key event
     * 5. Actually clear value
     * 6. Blur with proper sequence
     *
     * @param dialog - The OgtDateSelectDialog
     * @param snippetMode - Enable detailed logging for snippet mode
     */
    private static async clearTime(dialog: OgtDateSelectDialog, snippetMode: boolean = false): Promise<void> {
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
        await new Promise(resolve => setTimeout(resolve, 100));

        Logger.fgtlog('✅ Time cleared');
        if (snippetMode) console.log('✅ [SNIPPET MODE] Time cleared');
    }

    /**
     * Wait for dialog to close
     * @param dialog - The OgtDateSelectDialog
     * @param timeout - Maximum wait time in milliseconds
     */
    private static async waitForDialogClose(dialog: OgtDateSelectDialog, timeout: number = 3000): Promise<void> {
        Logger.fgtlog('⏳ Waiting for dialog to close...');

        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (!dialog.isConnected()) {
                Logger.fgtlog('✅ Dialog closed');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        Logger.fgtwarn('⚠️ Dialog did not close within timeout');
    }

    /**
     * Verify date/time change by polling date button for DOM updates
     * @param dateButton - The date button to check
     * @param targetDate - Expected date (YYYY-MM-DD)
     * @param targetTime - Expected time (HH:MM to verify time, null/'' to expect cleared time, undefined to skip time verification)
     * @param originalFullLabel - Original fullLabel before change
     * @param originalText - Original text before change
     * @param timeout - Maximum wait time (default 10000ms)
     * @param taskElement - Optional task element wrapper for refetching date button to avoid stale references
     * @returns Promise<boolean> - true if verified, false if timeout
     */
    private static async verifyDateTimeChange(
        dateButton: OgtDateButton,
        targetDate: string,
        targetTime: string | null | undefined,
        originalFullLabel: string,
        originalText: string,
        timeout: number = 10000,
        taskElement?: OgtTaskWrapper
    ): Promise<boolean> {
        const startTime = Date.now();

        return new Promise((resolve) => {
            let intervalId: number | null = null;
            let timeoutId: number | null = null;

            const checkChange = () => {
                const elapsed = Date.now() - startTime;

                try {
                    // Refetch BOTH taskElement and date button on each poll to avoid stale references
                    // This is critical because table re-renders completely replace DOM elements
                    let currentDateButton = dateButton;
                    if (taskElement) {
                        const taskId = taskElement.taskId;
                        Logger.fgtlog(`🔍 [DateManipulator ${elapsed}ms] Polling: taskId="${taskId}"`);

                        if (taskId) {
                            // Refetch taskElement by ID to get fresh DOM element after table re-render
                            const freshTaskElement = OgtFinder.findTaskWrapper(taskId);
                            if (freshTaskElement) {
                                const taskElementConnected = freshTaskElement.element.isConnected;
                                Logger.fgtlog(`  - freshTaskElement found, isConnected=${taskElementConnected}`);

                                const refetchedButton = freshTaskElement.findDateButton();
                                if (refetchedButton) {
                                    const dateButtonConnected = refetchedButton.element.isConnected;
                                    Logger.fgtlog(`  - refetchedButton found, isConnected=${dateButtonConnected}`);
                                    currentDateButton = refetchedButton;
                                } else {
                                    Logger.fgtwarn('⚠️ Date button not found in fresh task element during verification');
                                    return false;
                                }
                            } else {
                                Logger.fgtwarn(`⚠️ Task element not found for ID: ${taskId} during verification`);
                                return false;
                            }
                        } else {
                            Logger.fgtwarn('⚠️ Task ID not available for refetch during verification');
                            return false;
                        }
                    } else {
                        Logger.fgtlog(`🔍 [DateManipulator ${elapsed}ms] No taskElement provided, using original dateButton`);
                    }

                    const currentFullLabel = currentDateButton.fullLabel || '';
                    const currentText = currentDateButton.text || '';

                    Logger.fgtlog(`  - currentText: "${currentText}"`);
                    Logger.fgtlog(`  - currentFullLabel: "${currentFullLabel}"`);

                    // Check if date button changed
                    if (currentFullLabel === originalFullLabel && currentText === originalText) {
                        Logger.fgtlog(`  - No change detected (values match original)`);
                        return false;
                    }

                    Logger.fgtlog(`📅 Date button changed detected after ${elapsed}ms`);
                    Logger.fgtlog(`  - fullLabel: "${originalFullLabel}" → "${currentFullLabel}"`);
                    Logger.fgtlog(`  - text: "${originalText}" → "${currentText}"`);

                    // Parse the new date
                    const locale = document.documentElement.lang || 'en';
                    const dateInfo = parseNaturalDate(currentFullLabel, currentText, locale);

                    if (!dateInfo) {
                        Logger.fgtwarn('⚠️ Failed to parse new date');
                        return false;
                    }

                    // Parse expected date
                    const [expYear, expMonth, expDay] = targetDate.split('-').map(Number);

                    // Verify date first
                    if (dateInfo.year !== expYear || dateInfo.month !== expMonth || dateInfo.day !== expDay) {
                        Logger.fgtwarn(`⚠️ Date mismatch: expected ${expYear}-${expMonth}-${expDay}, got ${dateInfo.year}-${dateInfo.month}-${dateInfo.day}`);
                        return false;
                    }

                    Logger.fgtlog(`✅ Date verified: ${expYear}-${expMonth}-${expDay}`);

                    // Handle time verification based on targetTime value
                    if (targetTime === undefined) {
                        // Case 1: undefined - Don't verify time at all
                        Logger.fgtlog('ℹ️ Time verification skipped (targetTime is undefined)');
                        if (intervalId !== null) CoreEventUtils.intervals.clear(intervalId);
                        if (timeoutId !== null) CoreEventUtils.timeouts.clear(timeoutId);
                        resolve(true);
                        return true;

                    } else if (targetTime === null || targetTime === '') {
                        // Case 2: null or '' - Expect cleared time (99:99)
                        if (dateInfo.hours === 99 && dateInfo.minutes === 99) {
                            Logger.fgtlog('✅ Time cleared as expected (99:99)');
                            if (intervalId !== null) CoreEventUtils.intervals.clear(intervalId);
                            if (timeoutId !== null) CoreEventUtils.timeouts.clear(timeoutId);
                            resolve(true);
                            return true;
                        } else {
                            Logger.fgtwarn(`⚠️ Expected cleared time (99:99), but got ${dateInfo.hours}:${dateInfo.minutes}`);
                            return false;
                        }

                    } else {
                        // Case 3: 'HH:MM' - Verify specific time with display rules
                        const [expHours, expMinutes] = targetTime.split(':').map(Number);

                        // CRITICAL: Time display rules in Google Tasks
                        // - Time is ONLY displayed for TODAY (D-DAY) or FUTURE dates
                        // - Past dates (D+1 ~ D+6) do NOT display time
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const expectedDate = new Date(expYear, expMonth - 1, expDay);
                        expectedDate.setHours(0, 0, 0, 0);
                        const diffDays = Math.round((expectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        // diffDays > 0: future, diffDays = 0: today, diffDays < 0: past

                        const isPastDate = diffDays < 0;

                        if (isPastDate) {
                            // For past dates, Google Tasks hides time in display
                            // Parser returns 99:99 for hidden time
                            Logger.fgtlog(`ℹ️ Date is ${Math.abs(diffDays)} days in past - time hidden in display`);
                            if (dateInfo.hours === 99 && dateInfo.minutes === 99) {
                                Logger.fgtlog('✅ Time hidden as expected for past date');
                                if (intervalId !== null) CoreEventUtils.intervals.clear(intervalId);
                                if (timeoutId !== null) CoreEventUtils.timeouts.clear(timeoutId);
                                resolve(true);
                                return true;
                            } else {
                                Logger.fgtwarn(`⚠️ Expected hidden time (99:99) for past date, but got ${dateInfo.hours}:${dateInfo.minutes}`);
                                return false;
                            }
                        } else {
                            // For today or future dates, verify exact time
                            if (dateInfo.hours === expHours && dateInfo.minutes === expMinutes) {
                                Logger.fgtlog(`✅ Time verified: ${expHours}:${expMinutes}`);
                                if (intervalId !== null) CoreEventUtils.intervals.clear(intervalId);
                                if (timeoutId !== null) CoreEventUtils.timeouts.clear(timeoutId);
                                resolve(true);
                                return true;
                            } else {
                                Logger.fgtwarn(`⚠️ Time mismatch: expected ${expHours}:${expMinutes}, got ${dateInfo.hours}:${dateInfo.minutes}`);
                                return false;
                            }
                        }
                    }
                } catch (error: any) {
                    Logger.fgtwarn(`⚠️ Error checking date/time changes: ${error.message}`);
                }

                return false;
            };

            // Start polling (every 150ms to reduce load while waiting for slow DOM updates)
            intervalId = CoreEventUtils.intervals.create(() => {
                checkChange();
            }, 150);

            // Set timeout
            timeoutId = CoreEventUtils.timeouts.create(() => {
                if (intervalId !== null) CoreEventUtils.intervals.clear(intervalId);
                Logger.fgtwarn(`⏱️ Date/time change verification timeout after ${timeout}ms`);
                resolve(false);
            }, timeout);
        });
    }

    /**
     * Cancel any open date select dialog
     * Useful for cleaning up background dialogs before making changes
     */
    static async cancelOpenDialog(): Promise<void> {
        try {
            const dialogElement = findDateSelectDialogElement();
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

export { DateManipulator };

Logger.fgtlog('✅ Date Manipulator loaded');
