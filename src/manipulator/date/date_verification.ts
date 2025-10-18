// manipulator/date/date_verification.ts - Unified date/time change verification
import * as Logger from '@/core/logger';
import { CoreEventUtils } from '@/core/event_utils';
import { OgtFinder } from '@/dom_bringer/finder';
import { parseNaturalDate } from '@/dom_bringer/task_element/date_button/date_parser';
import { DATE_VERIFICATION_TIMEOUT, DATE_VERIFICATION_POLL_INTERVAL, DIALOG_WAIT_TIMEOUT } from '@/dom_bringer/date/date_constants';
import { DateDialogUtils } from './date_dialog_utils';
import type { OgtTaskWrapper } from '@/dom_bringer/task_element/task_element';

Logger.fgtlog('✅ Date Verification loading...');

/**
 * Unified date/time change verification
 *
 * This function polls the DOM to verify that date/time changes have been applied.
 * It handles:
 * - Element staleness (refetching after table re-renders)
 * - Date parsing and validation
 * - Time verification with display rules (past dates hide time)
 * - "weeks ago" pattern for past dates
 */
export class DateVerification {
    /**
     * Verify date/time change by polling date button for DOM updates
     *
     * @param taskElement - Task element wrapper for refetching to avoid stale references
     * @param expectedDate - Expected date (YYYY-MM-DD)
     * @param expectedTime - Expected time (HH:MM to verify time, null/'' to expect cleared time, undefined to skip time verification)
     * @param originalFullLabel - Original fullLabel before change
     * @param originalText - Original text before change
     * @param timeout - Maximum wait time (default DATE_VERIFICATION_TIMEOUT)
     * @returns Promise<boolean> - true if verified, false if timeout
     */
    static async verifyDateTimeChange(
        taskElement: OgtTaskWrapper,
        expectedDate: string,
        expectedTime: string | null | undefined,
        originalFullLabel: string,
        originalText: string,
        timeout: number = DATE_VERIFICATION_TIMEOUT
    ): Promise<boolean> {
        const startTime = Date.now();

        // Check if this is a past date + time-only change scenario
        // For past dates, Google Tasks doesn't display time in the date button,
        // so we need to verify by opening the calendar dialog and checking time input directly
        const isPastDateTimeChange = this.isPastDateWithTimeChange(expectedDate, expectedTime);

        if (isPastDateTimeChange) {
            Logger.fgtlog('🔍 Detected past date + time change scenario, will verify via calendar dialog');
            return this.verifyTimeViaCalendarDialog(taskElement, expectedDate, expectedTime);
        }

        return new Promise((resolve) => {
            let intervalId: number | null = null;
            let timeoutId: number | null = null;

            const checkChange = () => {
                const elapsed = Date.now() - startTime;

                try {
                    // Refetch BOTH taskElement and date button on each poll to avoid stale references
                    // This is critical because table re-renders completely replace DOM elements
                    const taskId = taskElement.taskId;
                    Logger.fgtlog(`🔍 [DateVerification ${elapsed}ms] Polling: taskId="${taskId}"`);

                    if (!taskId) {
                        Logger.fgtwarn('⚠️ Task ID not available for refetch during verification');
                        return false;
                    }

                    // Refetch taskElement by ID to get fresh DOM element after table re-render
                    const freshTaskElement = OgtFinder.findTaskWrapper(taskId);
                    if (!freshTaskElement) {
                        Logger.fgtwarn(`⚠️ Task element not found for ID: ${taskId} during verification`);
                        return false;
                    }

                    const taskElementConnected = freshTaskElement.element.isConnected;
                    Logger.fgtlog(`  - freshTaskElement found, isConnected=${taskElementConnected}`);

                    const dateButton = freshTaskElement.findDateButton();
                    if (!dateButton) {
                        Logger.fgtwarn('⚠️ Date button not found in fresh task element during verification');
                        return false;
                    }

                    const dateButtonConnected = dateButton.element.isConnected;
                    Logger.fgtlog(`  - dateButton found, isConnected=${dateButtonConnected}`);

                    const currentFullLabel = dateButton.fullLabel || '';
                    const currentText = dateButton.text || '';

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
                    const locale = document.documentElement.lang || '';
                    const dateInfo = parseNaturalDate(currentFullLabel, currentText, locale);

                    if (!dateInfo) {
                        Logger.fgtwarn('⚠️ Failed to parse new date');
                        return false;
                    }

                    // Parse expected date
                    const [expYear, expMonth, expDay] = expectedDate.split('-').map(Number);

                    // Check if "# week(s) ago" pattern (flexible date range)
                    // This pattern appears for past dates that are 7+ days ago
                    const weeksAgoMatch = currentText.match(/^(\d+)\s+weeks?\s+ago$/i);
                    if (weeksAgoMatch) {
                        const weeksAgo = parseInt(weeksAgoMatch[1]);

                        // Calculate flexible date range: n*7 to n*7+6 days ago from today
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const minDaysAgo = weeksAgo * 7;
                        const maxDaysAgo = weeksAgo * 7 + 6;

                        const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - maxDaysAgo);
                        const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - minDaysAgo);
                        const actualDate = new Date(dateInfo.year, dateInfo.month - 1, dateInfo.day);

                        if (actualDate >= minDate && actualDate <= maxDate) {
                            Logger.fgtlog(`✅ Date verified (weeks ago pattern): ${weeksAgo} week(s) ago is within range`);

                            // Handle time verification based on expectedTime
                            return this.verifyTimeForWeeksAgo(
                                expectedTime,
                                dateInfo,
                                intervalId,
                                timeoutId,
                                resolve
                            );
                        } else {
                            Logger.fgtwarn(`⚠️ Date out of range for ${weeksAgo} week(s) ago pattern`);
                            return false;
                        }
                    }

                    // Normal date verification
                    if (dateInfo.year !== expYear || dateInfo.month !== expMonth || dateInfo.day !== expDay) {
                        Logger.fgtwarn(`⚠️ Date mismatch: expected ${expYear}-${expMonth}-${expDay}, got ${dateInfo.year}-${dateInfo.month}-${dateInfo.day}`);
                        return false;
                    }

                    Logger.fgtlog(`✅ Date verified: ${expYear}-${expMonth}-${expDay}`);

                    // Handle time verification
                    return this.verifyTime(
                        expectedTime,
                        dateInfo,
                        expYear,
                        expMonth,
                        expDay,
                        intervalId,
                        timeoutId,
                        resolve
                    );

                } catch (error: any) {
                    Logger.fgtwarn(`⚠️ Error checking date/time changes: ${error.message}`);
                }

                return false;
            };

            // Start polling
            intervalId = CoreEventUtils.intervals.create(() => {
                checkChange();
            }, DATE_VERIFICATION_POLL_INTERVAL);

            // Set timeout
            timeoutId = CoreEventUtils.timeouts.create(() => {
                if (intervalId !== null) CoreEventUtils.intervals.clear(intervalId);
                Logger.fgtwarn(`⏱️ Date/time change verification timeout after ${timeout}ms`);
                resolve(false);
            }, timeout);
        });
    }

    /**
     * Verify time for "weeks ago" pattern dates
     * @param expectedTime - Expected time value
     * @param dateInfo - Parsed date info
     * @param intervalId - Polling interval ID
     * @param timeoutId - Timeout ID
     * @param resolve - Promise resolve function
     * @returns true if verification succeeded
     */
    private static verifyTimeForWeeksAgo(
        expectedTime: string | null | undefined,
        dateInfo: any,
        intervalId: number | null,
        timeoutId: number | null,
        resolve: (value: boolean) => void
    ): boolean {
        if (expectedTime === undefined) {
            // Case 1: undefined - Don't verify time at all
            Logger.fgtlog('ℹ️ Time verification skipped (expectedTime is undefined)');
            if (intervalId !== null) CoreEventUtils.intervals.clear(intervalId);
            if (timeoutId !== null) CoreEventUtils.timeouts.clear(timeoutId);
            resolve(true);
            return true;

        } else if (expectedTime === null || expectedTime === '') {
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
            // Case 3: 'HH:MM' - Verify specific time (weeks ago dates don't display time, so expect 99:99)
            // Past dates always hide time in display
            if (dateInfo.hours === 99 && dateInfo.minutes === 99) {
                Logger.fgtlog('✅ Time hidden as expected for past date (weeks ago pattern)');
                if (intervalId !== null) CoreEventUtils.intervals.clear(intervalId);
                if (timeoutId !== null) CoreEventUtils.timeouts.clear(timeoutId);
                resolve(true);
                return true;
            } else {
                Logger.fgtwarn(`⚠️ Expected hidden time (99:99) for weeks ago pattern, but got ${dateInfo.hours}:${dateInfo.minutes}`);
                return false;
            }
        }
    }

    /**
     * Verify time for normal date patterns
     * @param expectedTime - Expected time value
     * @param dateInfo - Parsed date info
     * @param expYear - Expected year
     * @param expMonth - Expected month
     * @param expDay - Expected day
     * @param intervalId - Polling interval ID
     * @param timeoutId - Timeout ID
     * @param resolve - Promise resolve function
     * @returns true if verification succeeded
     */
    private static verifyTime(
        expectedTime: string | null | undefined,
        dateInfo: any,
        expYear: number,
        expMonth: number,
        expDay: number,
        intervalId: number | null,
        timeoutId: number | null,
        resolve: (value: boolean) => void
    ): boolean {
        if (expectedTime === undefined) {
            // Case 1: undefined - Don't verify time at all
            Logger.fgtlog('ℹ️ Time verification skipped (expectedTime is undefined)');
            if (intervalId !== null) CoreEventUtils.intervals.clear(intervalId);
            if (timeoutId !== null) CoreEventUtils.timeouts.clear(timeoutId);
            resolve(true);
            return true;

        } else if (expectedTime === null || expectedTime === '') {
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
            const [expHours, expMinutes] = expectedTime.split(':').map(Number);

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
    }

    /**
     * Check if this is a past date with time change scenario
     *
     * Past dates in Google Tasks don't display time in the date button UI,
     * so normal verification (checking date button text changes) won't work.
     *
     * @param expectedDate - Expected date in YYYY-MM-DD format
     * @param expectedTime - Expected time (undefined means no time change)
     * @returns true if this is a past date AND time is being changed
     */
    private static isPastDateWithTimeChange(
        expectedDate: string,
        expectedTime: string | null | undefined
    ): boolean {
        // If expectedTime is undefined, no time change is happening
        if (expectedTime === undefined) {
            return false;
        }

        // Parse expected date
        const [expYear, expMonth, expDay] = expectedDate.split('-').map(Number);

        // Calculate if date is in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const targetDate = new Date(expYear, expMonth - 1, expDay);
        targetDate.setHours(0, 0, 0, 0);

        const diffMs = targetDate.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        // diffDays < 0 means past date
        const isPastDate = diffDays < 0;

        if (isPastDate) {
            Logger.fgtlog(`📅 Date ${expectedDate} is ${Math.abs(diffDays)} day(s) in the past`);
        }

        return isPastDate;
    }

    /**
     * Verify time by opening calendar dialog and reading time input directly
     *
     * This is used for past dates where Google Tasks hides time in the date button UI.
     * We open the calendar dialog, read the time input value, and compare with expected time.
     *
     * @param taskElement - Task element wrapper
     * @param expectedDate - Expected date (not used, but kept for consistency)
     * @param expectedTime - Expected time (HH:MM, null, or undefined)
     * @returns Promise<boolean> - true if time matches, false otherwise
     */
    private static async verifyTimeViaCalendarDialog(
        taskElement: OgtTaskWrapper,
        expectedDate: string,
        expectedTime: string | null | undefined
    ): Promise<boolean> {
        try {
            Logger.fgtlog('🔍 Verifying time via calendar dialog...');

            // Wait a bit for any pending DOM updates to complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get fresh task element and date button
            const taskId = taskElement.taskId;
            if (!taskId) {
                Logger.fgtwarn('⚠️ Task ID not available');
                return false;
            }

            const freshTaskElement = OgtFinder.findTaskWrapper(taskId);
            if (!freshTaskElement) {
                Logger.fgtwarn('⚠️ Task element not found');
                return false;
            }

            const dateButton = freshTaskElement.findDateButton();
            if (!dateButton) {
                Logger.fgtwarn('⚠️ Date button not found');
                return false;
            }

            // Click date button to open calendar dialog
            Logger.fgtlog('🖱️ Clicking date button to open calendar dialog...');
            dateButton.element.click();

            // Wait for dialog to appear
            const dialog = await dateButton.waitForDateSelectDialog(DIALOG_WAIT_TIMEOUT);
            Logger.fgtlog('✅ Calendar dialog opened');

            // Read time from dialog
            const actualTime = DateDialogUtils.readTime(dialog);
            Logger.fgtlog(`⏰ Read time from dialog: "${actualTime}"`);

            // Close dialog with Cancel button
            const cancelButton = dialog.findCancelButton();
            if (cancelButton) {
                Logger.fgtlog('🔄 Closing dialog with Cancel button...');
                cancelButton.click();
                await new Promise(resolve => setTimeout(resolve, 300));
                Logger.fgtlog('✅ Dialog closed');
            }

            // Compare times
            if (expectedTime === null || expectedTime === '') {
                // Expect cleared time (empty string)
                if (actualTime === '') {
                    Logger.fgtlog('✅ Time cleared as expected');
                    return true;
                } else {
                    Logger.fgtwarn(`⚠️ Expected cleared time, but got "${actualTime}"`);
                    return false;
                }
            } else if (expectedTime === undefined) {
                // This shouldn't happen (we filter this case earlier), but handle it anyway
                Logger.fgtlog('ℹ️ Time verification skipped (expectedTime is undefined)');
                return true;
            } else {
                // Expect specific time
                if (actualTime === expectedTime) {
                    Logger.fgtlog(`✅ Time verified: ${expectedTime}`);
                    return true;
                } else {
                    Logger.fgtwarn(`⚠️ Time mismatch: expected "${expectedTime}", got "${actualTime}"`);
                    return false;
                }
            }

        } catch (error: any) {
            Logger.fgterror(`❌ Calendar dialog verification failed: ${error.message}`);
            return false;
        }
    }
}

Logger.fgtlog('✅ Date Verification loaded successfully');
