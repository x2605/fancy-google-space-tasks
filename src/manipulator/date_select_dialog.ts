// manipulator/date_select_dialog.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('📅 OGT Date Select Dialog loading...');

const findDateSelectDialogElement = function() {
    return document.querySelector('div[data-inject-content-controller]') as HTMLDivElement;
}

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
    _element: HTMLDivElement;

    /**
     * Create a date select dialog wrapper
     * @param element - The dialog element
     */
    constructor(element: HTMLDivElement) {
        if (!element) throw new Error('OgtDateSelectDialog requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The wrapped dialog element
     */
    get element(): HTMLDivElement { 
        return this._element; 
    }
    
    /**
     * Find the month/year label in the calendar header
     * @returns The label element showing current month/year
     */
    findMonthYearLabel(): HTMLDivElement | null {
        return this._element.querySelector('div[aria-live="assertive"]') as HTMLDivElement;
    }
    
    /**
     * Find the previous month navigation button
     * @returns The previous button or null if not found
     */
    findMonthChangeButtons(): NodeListOf<HTMLDivElement> {
        return this._element.querySelectorAll('div[role="button"][data-response-delay-ms]');
    }

    /**
     * Find the previous month navigation button
     * @returns The previous button or null if not found
     */
    findMonthPrevButton(): HTMLDivElement | null {
        const buttons = this.findMonthChangeButtons();
        return buttons[0] as HTMLDivElement || null;
    }
    
    /**
     * Find the next month navigation button
     * @returns The next button or null if not found
     */
    findMonthNextButton(): HTMLDivElement | null {
        const buttons = this.findMonthChangeButtons();
        return buttons[1] as HTMLDivElement || null;
    }
    
    /**
     * Find a specific day cell in the calendar grid
     * @param day - Day of month (1-31)
     * @returns The calendar cell for that day
     */
    findDateCell(day: number): HTMLDivElement | null {
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
     * Find the time input text field wrapper
     * @returns The time input wrapper or null if not found
     */
    findTimeInputWrapper(): HTMLDivElement | null {
        return this._element.querySelector('div[data-use-native-validation]');
    }

    /**
     * Find the time input text field
     * @returns The time input or null if not found
     */
    findTimeInput(): HTMLInputElement | null {
        return this.findTimeInputWrapper()?.querySelector('input[type="text"]') as HTMLInputElement;
    }
    
    /**
     * Find the time icon next to time input text field
     * @returns The time icon div or null if not found
     */
    findTimeIcon(): HTMLDivElement | null {
        return this._element.querySelector('i[aria-hidden]')?.parentElement as HTMLDivElement;
    }
    
    /**
     * Find the time selection dropdown
     * @returns The time listbox or null if not found
     */
    findTimeSelectDropdown(): HTMLDivElement | null {
        return this._element.querySelector('div[role="listbox"]');
    }
    
    /**
     * Find a specific time option in the dropdown
     * @param timeString - Time string to find (e.g., "14:00")
     * @returns The time option element or null if not found
     */
    findTimeOption(timeString: string): HTMLDivElement | null {
        const options = this._element.querySelectorAll('div[data-time]');
        for (const option of options) {
            if (option.getAttribute('data-time') === timeString) {
                return option as HTMLDivElement;
            }
        }
        return null;
    }
    
    /**
     * Find delete button
     * It does not appear when no date is set to the task
     * @returns Delete button element
     */
    findDeleteButton(): HTMLButtonElement | null {
        return this._element.querySelector('button:not([data-mdc-dialog-action])');
    }
    
    /**
     * Find cancel button
     * It always exist if no error
     * @returns Cancel button element
     */
    findCancelButton(): HTMLButtonElement | null {
        return this._element.querySelector('button[data-mdc-dialog-action="cancel"]');
    }
    
    /**
     * Find ok button
     * It always exist if no error
     * @returns Cancel button element
     */
    findOkButton(): HTMLButtonElement | null {
        return this._element.querySelector('button[data-mdc-dialog-action="ok"]');
    }
    
    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean { 
        return this._element.isConnected; 
    }
}

export { findDateSelectDialogElement, OgtDateSelectDialog };

Logger.fgtlog('✅ OGT Date Select Dialog loaded');