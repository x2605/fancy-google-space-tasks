// manipulator/date/date_constants.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('📅 Date Constants loading...');

/**
 * All date-related timeout and interval constants
 *
 * These constants control the behavior of date/time manipulation and verification
 */

/** Timeout for date/time change verification (ms) */
export const DATE_VERIFICATION_TIMEOUT = 3000;

/** Polling interval for date/time change verification (ms) */
export const DATE_VERIFICATION_POLL_INTERVAL = 500;

/** Timeout for waiting for date select dialog to appear (ms) */
export const DIALOG_WAIT_TIMEOUT = 3000;

/** Wait time after closing dialog (ms) */
export const DIALOG_CLOSE_WAIT = 300;

/** Wait time after blurring time input (ms) */
export const TIME_INPUT_BLUR_WAIT = 100;

/** Wait time after triggering focus/blur to update DOM (ms) */
export const AFTER_FOCUS_BLUR_WAIT = 100;

/** Wait time after clicking date cell (ms) */
export const DATE_CELL_CLICK_WAIT = 100;

/** Wait time after month navigation click (ms) */
export const MONTH_NAV_CLICK_WAIT = 100;

Logger.fgtlog('✅ Date Constants loaded');
