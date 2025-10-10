// manipulator/date_select_dialog.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('📅 OGT Date Select Dialog loading...');

/**
 * Wrapper class for the date selection dialog
 * This modal appears when user clicks the date button
 * Contains calendar grid, time picker, and action buttons
 * Selector: div[aria-modal="true"][role="dialog"]
 * 
 * @class OgtDateSelectDialog
 * @example
 * const dialog = await dateButton.waitForDateSelectDialog();
 * const dayCell = dialog.findDateCell(15); // Find 15th day
 * const okButton = dialog.findDateConfirmButton();
 */
class OgtDateSelectDialog {
    _element: Element;

    /**
     * Create a date select dialog wrapper
     * @param element - The dialog element
     */
    constructor(element: Element) {
        if (!element) throw new Error('OgtDateSelectDialog requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The wrapped dialog element
     */
    get element(): Element { 
        return this._element; 
    }
    
    /**
     * Find the month/year label in the calendar header
     * @returns The label element showing current month/year
     */
    findMonthYearLabel(): HTMLElement | null {
        return this._element.querySelector('[aria-live="assertive"]');
    }
    
    /**
     * Find the previous month navigation button
     * @returns The previous button or null if not found
     */
    findMonthPrevButton(): HTMLDivElement | null {
        const buttons = this._element.querySelectorAll('div[role="button"][data-response-delay-ms]');
        return buttons[0] as HTMLDivElement || null;
    }
    
    /**
     * Find the next month navigation button
     * @returns The next button or null if not found
     */
    findMonthNextButton(): HTMLDivElement | null {
        const buttons = this._element.querySelectorAll('div[role="button"][data-response-delay-ms]');
        return buttons[1] as HTMLDivElement || null;
    }
    
    /**
     * Find a specific day cell in the calendar grid
     * @param day - Day of month (1-31)
     * @returns The calendar cell for that day
     */
    findDateCell(day: number): HTMLElement | null {
        return this._element.querySelector(`div[role="gridcell"][data-day-of-month="${day}"]`);
    }
    
    /**
     * Find the OK/Confirm button
     * @returns The confirm button or null if not found
     */
    findDateConfirmButton(): HTMLButtonElement | null {
        return this._element.querySelector('button[data-mdc-dialog-action="ok"]');
    }
    
    /**
     * Find the Cancel button
     * @returns The cancel button or null if not found
     */
    findDateCancelButton(): HTMLButtonElement | null {
        return this._element.querySelector('button[data-mdc-dialog-action="cancel"]');
    }
    
    /**
     * Find the time input text field
     * @returns The time input or null if not found
     */
    findTimeInput(): HTMLInputElement | null {
        return this._element.querySelector('input[type="text"]');
    }
    
    /**
     * Find the time selection dropdown
     * @returns The time listbox or null if not found
     */
    findTimeSelectDropdown(): HTMLElement | null {
        return this._element.querySelector('div[role="listbox"]');
    }
    
    /**
     * Find a specific time option in the dropdown
     * @param timeString - Time string to find (e.g., "14:00")
     * @returns The time option element or null if not found
     */
    findTimeOption(timeString: string): HTMLElement | null {
        const options = this._element.querySelectorAll('div[data-time]');
        for (const option of options) {
            if (option.getAttribute('data-time') === timeString) {
                return option as HTMLElement;
            }
        }
        return null;
    }
    
    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean { 
        return this._element.isConnected; 
    }
}

export { OgtDateSelectDialog };

Logger.fgtlog('✅ OGT Date Select Dialog loaded');