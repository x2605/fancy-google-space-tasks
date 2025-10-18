// manipulator/date/date_verification.ts - Unified date/time change verification
import * as Logger from '@/core/logger';
import { CoreEventUtils } from '@/core/event_utils';
import { OgtFinder } from '@/dom_bringer/finder';
import { parseNaturalDate } from '@/dom_bringer/task_element/date_button/date_parser';
import { DATE_VERIFICATION_TIMEOUT, DATE_VERIFICATION_POLL_INTERVAL } from '@/dom_bringer/date/date_constants';
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
                    const locale = document.documentElement.lang || 'en';
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
}

Logger.fgtlog('✅ Date Verification loaded successfully');
