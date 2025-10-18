// utils/snippet_helpers.ts
// ============================================================
// SNIPPET HELPERS - DevTools console testing utilities
// ============================================================
//
// These functions are exposed to window for manual testing in DevTools console.
// They act as thin wrappers around production code, enabling easy testing
// without code duplication.
//
// Usage in DevTools console (after extension loads):
//   fgtChangeDateTime('task-id', '2026-7-20', '14:30')
//   fgtTestClick(document.querySelector('.some-selector'))
//
// IMPORTANT: These wrappers call production code with snippetMode enabled,
// which activates detailed console logging for debugging.
// ============================================================

import * as Logger from '@/core/logger';
import { DateController } from '@/manipulator/date/date_controller';
import { CoreDOMUtils } from '@/core/dom_utils';
import { OgtFinder } from '@/dom_bringer/finder';

Logger.fgtlog('🔧 Snippet Helpers loading...');

/**
 * Test click simulation on any DOM element
 * Exposed to window as: fgtTestClick(element)
 *
 * This is a wrapper around CoreDOMUtils.simulateClick() with added logging
 * for easier debugging in DevTools console.
 *
 * @param element - DOM element to click
 *
 * @example
 * // In DevTools console:
 * fgtTestClick(document.querySelector('div[role="button"]'))
 */
export function fgtTestClick(element: Element): void {
    if (!element) {
        console.log('❌ [fgtTestClick] Element is null or undefined');
        return;
    }

    console.log('🖱️ [fgtTestClick] Simulating click on:', element);

    // ============================================================
    // SNIPPET WRAPPER: Call production code
    // ============================================================
    CoreDOMUtils.simulateClick(element);

    console.log('✅ [fgtTestClick] Click events dispatched');
}

/**
 * Change task date and time through original Google Tasks UI
 * Exposed to window as: fgtChangeDateTime(taskId, dateStr, timeStr?)
 *
 * This is a wrapper around DateController.setDateTime() with snippetMode enabled,
 * providing detailed console logging for each step of the process.
 *
 * @param taskId - Task ID (from data-id attribute)
 * @param dateStr - Date string in YYYY-M-D format (e.g., "2026-7-20"), or null to delete
 * @param timeStr - Optional time string in HH:MM format (24-hour, e.g., "14:30")
 *
 * @example
 * // In DevTools console:
 * await fgtChangeDateTime('task-123', '2026-7-20', '14:30')  // Set date and time
 * await fgtChangeDateTime('task-123', '2026-7-20')           // Set date only
 * await fgtChangeDateTime('task-123', null)                  // Delete date
 */
export async function fgtChangeDateTime(
    taskId: string,
    dateStr: string | null,
    timeStr?: string
): Promise<void> {
    console.log('📅 [fgtChangeDateTime] ========================================');
    console.log('📅 [fgtChangeDateTime] Starting date/time change');
    console.log('📅 [fgtChangeDateTime] ========================================');
    console.log(`  taskId: ${taskId}`);
    console.log(`  dateStr: ${dateStr}`);
    console.log(`  timeStr: ${timeStr || '(none)'}`);
    console.log('');

    try {
        // STEP 1: Find task element
        console.log('🔍 [fgtChangeDateTime] STEP 1: Finding task element...');
        const taskElement = OgtFinder.findTaskWrapper(taskId);
        if (!taskElement) {
            throw new Error(`Task not found: ${taskId}`);
        }
        console.log('✅ [fgtChangeDateTime] Task element found');
        console.log('');

        // STEP 2: Find date button
        console.log('🔍 [fgtChangeDateTime] STEP 2: Finding date button...');
        const dateButton = taskElement.findDateButton();
        if (!dateButton) {
            throw new Error('Date button not found');
        }
        console.log('✅ [fgtChangeDateTime] Date button found');
        console.log('');

        // STEP 3: Call production code with snippetMode
        console.log('🚀 [fgtChangeDateTime] STEP 3: Calling DateController.setDateTime()...');
        console.log('   (snippetMode enabled for detailed logging)');
        console.log('');

        // ============================================================
        // SNIPPET WRAPPER: Call production code with snippetMode
        // ============================================================
        const success = await DateController.setDateTime(
            dateButton,
            dateStr,
            timeStr,
            { snippetMode: true },  // Enable detailed logging
            taskElement  // Pass taskElement for verification
        );

        console.log('');
        if (success) {
            console.log('✅ [fgtChangeDateTime] ========================================');
            console.log('✅ [fgtChangeDateTime] Date/time change completed successfully');
            console.log('✅ [fgtChangeDateTime] ========================================');
        } else {
            console.warn('⚠️ [fgtChangeDateTime] ========================================');
            console.warn('⚠️ [fgtChangeDateTime] Date/time change completed with warnings');
            console.warn('⚠️ [fgtChangeDateTime] ========================================');
        }

    } catch (error: any) {
        console.log('');
        console.error('❌ [fgtChangeDateTime] ========================================');
        console.error('❌ [fgtChangeDateTime] Date/time change failed');
        console.error('❌ [fgtChangeDateTime] ========================================');
        console.error('Error:', error.message);
        console.error(error);
        throw error;
    }
}

export { };

Logger.fgtlog('✅ Snippet Helpers loaded');
