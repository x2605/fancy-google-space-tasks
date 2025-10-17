// manipulator/task_element/date_button/date_manipulator.ts
import * as Logger from '@/core/logger';
import { OgtDateButton } from './task_element/date_button/date_button';
import { findDateSelectDialogElement, OgtDateSelectDialog } from './date_select_dialog';

Logger.fgtlog('📅 Date Manipulator loading...');

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
     * @param targetTime - Target time in HH:MM format (optional)
     * @returns Promise resolving to success status
     */
    static async setDateTime(
        dateButton: OgtDateButton,
        targetDate: string | null,
        targetTime?: string
    ): Promise<boolean> {
        try {
            Logger.fgtlog(`📅 Starting date manipulation: date=${targetDate}, time=${targetTime}`);

            // Click date button to open dialog
            Logger.fgtlog('🖱️ Clicking date button...');
            dateButton.element.click();

            // Wait for dialog to appear
            Logger.fgtlog('⏳ Waiting for date select dialog...');
            const dialog = await dateButton.waitForDateSelectDialog(5000);
            Logger.fgtlog('✅ Date select dialog appeared');

            // If targetDate is null, click delete button
            if (targetDate === null) {
                Logger.fgtlog('🗑️ Deleting date...');
                const deleteButton = dialog.findDeleteButton();
                if (!deleteButton) {
                    throw new Error('Delete button not found');
                }
                Logger.fgtlog('🖱️ Clicking delete button...');
                deleteButton.click();

                // Wait for dialog to close
                await this.waitForDialogClose(dialog);
                Logger.fgtlog('✅ Date deleted successfully');
                return true;
            }

            // Parse target date
            const [targetYear, targetMonth, targetDay] = targetDate.split('-').map(Number);
            Logger.fgtlog(`🎯 Target: ${targetYear}-${targetMonth}-${targetDay}`);

            // Navigate to target month/year
            await this.navigateToMonthYear(dialog, targetYear, targetMonth);

            // Select target day
            await this.selectDay(dialog, targetDay);

            // Set time if provided
            if (targetTime) {
                await this.setTime(dialog, targetTime);
            }

            // Click OK button
            Logger.fgtlog('🖱️ Clicking OK button...');
            const okButton = dialog.findOkButton();
            if (!okButton) {
                throw new Error('OK button not found');
            }
            okButton.click();

            // Wait for dialog to close
            await this.waitForDialogClose(dialog);

            // Verify changes
            const newFullLabel = dateButton.fullLabel;
            const newText = dateButton.text;
            Logger.fgtlog(`✅ Date changed - fullLabel: "${newFullLabel}", text: "${newText}"`);

            return true;

        } catch (error: any) {
            Logger.fgterror(`❌ Date manipulation failed: ${error.message}`);

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
     */
    private static async navigateToMonthYear(
        dialog: OgtDateSelectDialog,
        targetYear: number,
        targetMonth: number
    ): Promise<void> {
        Logger.fgtlog(`🧭 Navigating to ${targetYear}-${targetMonth}...`);

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

            // Parse current month/year using locale-aware parser
            const parsed = parseMonthYearLabel(labelText);
            if (!parsed) {
                throw new Error(`Failed to parse month/year label: "${labelText}"`);
            }

            const currentYear = parsed.year;
            const currentMonth = parsed.month;

            Logger.fgtlog(`📊 Parsed: ${currentYear}-${currentMonth}`);

            // Check if we've reached target
            if (currentYear === targetYear && currentMonth === targetMonth) {
                Logger.fgtlog('✅ Reached target month/year');
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
     */
    private static async selectDay(dialog: OgtDateSelectDialog, day: number): Promise<void> {
        Logger.fgtlog(`📅 Selecting day ${day}...`);

        const dateCell = dialog.findDateCell(day);
        if (!dateCell) {
            throw new Error(`Date cell for day ${day} not found`);
        }

        Logger.fgtlog('🖱️ Clicking date cell...');
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
    }

    /**
     * Set time in the time input
     * @param dialog - The OgtDateSelectDialog
     * @param time - Time in HH:MM format (24-hour)
     */
    private static async setTime(dialog: OgtDateSelectDialog, time: string): Promise<void> {
        Logger.fgtlog(`🕐 Setting time to ${time}...`);

        const timeInput = dialog.findTimeInput();
        if (!timeInput) {
            throw new Error('Time input not found');
        }

        // Focus input
        Logger.fgtlog('🔍 Focusing time input...');
        timeInput.focus();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Set value
        Logger.fgtlog(`✍️ Setting time value to "${time}"...`);
        timeInput.value = time;

        // Dispatch input event
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        timeInput.dispatchEvent(inputEvent);

        // Press Enter key
        Logger.fgtlog('⌨️ Pressing Enter key...');
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            bubbles: true,
            cancelable: true
        });
        timeInput.dispatchEvent(enterEvent);

        // Blur input
        Logger.fgtlog('👋 Blurring time input...');
        timeInput.blur();
        await new Promise(resolve => setTimeout(resolve, 100));

        Logger.fgtlog(`✅ Time set to ${time}`);
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
