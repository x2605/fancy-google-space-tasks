// modal/date_modal_utils.ts - Utility functions for date/time operations in task modal
import * as Logger from '@/core/logger';
import { formatDateForModal } from '@/dom_bringer/task_element/date_button/date_parser';
import { CoreNotificationUtils } from '@/core/notification_utils';

Logger.fgtlog('📅 Date Modal Utils loading...');

/**
 * Get formatted due date for display
 * @param originalTask - Original task data
 * @param parsedDateInfo - Cached parsed date information
 * @returns Formatted date string or 'No date'
 */
export function getFormattedDueDate(originalTask: any, parsedDateInfo: any): string {
    if (!originalTask || !originalTask.date || !originalTask.dateFull) {
        return 'No date';
    }

    // Use cached parsed date info
    return formatDateForModal(parsedDateInfo);
}

/**
 * Get date value in YYYY-MM-DD format for input[type="date"]
 * For "# weeks ago" pattern, uses pre-loaded exactDate from originalTask
 * @param originalTask - Original task data
 * @param parsedDateInfo - Cached parsed date information
 * @returns Date string in YYYY-MM-DD format or empty string
 */
export function getDateValue(originalTask: any, parsedDateInfo: any): string {
    if (!originalTask || !originalTask.dateFull) {
        return '';
    }

    // Check if exactDate was pre-loaded (for weeks ago pattern)
    if (originalTask.exactDate) {
        Logger.fgtlog(`📅 Using pre-loaded exact date: ${originalTask.exactDate}`);
        return originalTask.exactDate;
    }

    // Use cached parsed date info
    const dateInfo = parsedDateInfo;

    if (dateInfo && dateInfo.year && dateInfo.month && dateInfo.day) {
        const year = dateInfo.year;
        const month = String(dateInfo.month).padStart(2, '0');
        const day = String(dateInfo.day).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return '';
}

/**
 * Get time value in HH:MM format for input[type="time"]
 * Priority:
 * 1. Use exactTime if pre-loaded from calendar (for "N weeks ago" pattern)
 * 2. Otherwise parse from dateFull text (for normal dates)
 * @param originalTask - Original task data
 * @param parsedDateInfo - Cached parsed date information
 * @returns Time string in HH:MM format or empty string
 */
export function getTimeValue(originalTask: any, parsedDateInfo: any): string {
    if (!originalTask || !originalTask.dateFull) {
        return '';
    }

    // Priority 1: Use pre-loaded exactTime if available
    // This is crucial for "N weeks ago" pattern where time is hidden in UI
    if (originalTask.exactTime !== undefined && originalTask.exactTime !== null) {
        return originalTask.exactTime;
    }

    // Priority 2: Use cached parsed date info
    const dateInfo = parsedDateInfo;

    // Check if time exists (hours and minutes are not 99, which means "no time")
    if (dateInfo && dateInfo.hours !== 99 && dateInfo.minutes !== 99) {
        const hour = String(dateInfo.hours).padStart(2, '0');
        const minute = String(dateInfo.minutes).padStart(2, '0');
        return `${hour}:${minute}`;
    }

    return '';
}

/**
 * Handle Delete Date button - clears both date and time
 * @param modal - Modal element
 * @param namespace - Namespace for element IDs
 */
export function handleDeleteDate(modal: HTMLElement, namespace: string): void {
    const dateInput = modal.querySelector(`#${namespace}-date-input`) as HTMLInputElement;
    const timeInput = modal.querySelector(`#${namespace}-time-input`) as HTMLInputElement;

    if (dateInput) {
        dateInput.value = '';
        Logger.fgtlog('🗑️ Date cleared');
    }

    if (timeInput) {
        timeInput.value = '';
        Logger.fgtlog('🗑️ Time cleared');
    }

    CoreNotificationUtils.success('Date and time deleted', namespace);
}

/**
 * Handle Delete Time button - clears time only
 * @param modal - Modal element
 * @param namespace - Namespace for element IDs
 */
export function handleDeleteTime(modal: HTMLElement, namespace: string): void {
    const timeInput = modal.querySelector(`#${namespace}-time-input`) as HTMLInputElement;

    if (timeInput) {
        timeInput.value = '';
        Logger.fgtlog('🗑️ Time cleared');
        CoreNotificationUtils.success('Time deleted', namespace);
    }
}

/**
 * Handle Time input focus - auto-fill today's date if date is empty
 * @param modal - Modal element
 * @param namespace - Namespace for element IDs
 */
export function handleTimeFocus(modal: HTMLElement, namespace: string): void {
    const dateInput = modal.querySelector(`#${namespace}-date-input`) as HTMLInputElement;
    const timeInput = modal.querySelector(`#${namespace}-time-input`) as HTMLInputElement;

    // Only auto-fill if date is empty and user is trying to enter time
    if (dateInput && !dateInput.value && timeInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;

        dateInput.value = todayString;
        Logger.fgtlog(`📅 Auto-filled today's date: ${todayString}`);
        CoreNotificationUtils.info('Date auto-filled to today', namespace);
    }
}

Logger.fgtlog('✅ Date Modal Utils loaded successfully');
