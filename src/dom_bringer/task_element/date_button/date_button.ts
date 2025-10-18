// dom_bringer/task_element/date_button/date_button.ts
import * as Logger from '@/core/logger';
import { OgtDateSelectDialog } from '../../date_select_dialog';
import { parseNaturalDate, formatDateForButton } from './date_parser';
import type { OgtTaskWrapper } from '@/dom_bringer/task_element/task_element';
//import * as Test from './date_parser_test';
//Test

Logger.fgtlog('📅 OGT Date Button loading...');

/**
 * Wrapper class for the date selection button
 * This button displays the task's due date and opens the date picker when clicked
 * 
 * @class OgtDateButton
 * @example
 * const dateButton = taskElement.findDateButton();
 * if (dateButton) {
 *   console.log('Due date text:', dateButton.text);
 *   console.log('Full label:', dateButton.fullLabel);
 * }
 */
class OgtDateButton {
    _element: HTMLDivElement;

    /**
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = 'div[role="button"][data-first-date-el]';

    /**
     * Can be called directly from class
     * @returns - An HTML element which can be used in constructor
     */
    static findElementInObject(object: OgtTaskWrapper): HTMLDivElement | null {
        return object.element.querySelector(this.selector);
    }

    /**
     * Create a date button wrapper
     * @param element - The date button element
     */
    constructor(element: HTMLDivElement) {
        if (!element) throw new Error('OgtDateButton requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The wrapped button element
     */
    get element(): HTMLDivElement { 
        return this._element; 
    }
    
    /**
     * Get the full aria-label text
     * Contains complete date information including time
     * @returns The full aria-label attribute value
     */
    get fullLabel(): string {
        return this._element.getAttribute('aria-label') || '';
    }
    
    /**
     * Get the displayed date text
     * @returns The visible text content (e.g., "Today", "Tomorrow", "Jan 15")
     */
    get text(): string {
        return this._element.textContent?.trim() || '';
    }
    
    /**
     * Wait for date selection dialog to appear after clicking button
     * @param timeout - Maximum wait time in milliseconds
     * @returns Promise resolving to dialog wrapper
     */
    async waitForDateSelectDialog(timeout: number = 3000): Promise<OgtDateSelectDialog> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const dialog = OgtDateSelectDialog.findElement();
            if (dialog) {
                return new OgtDateSelectDialog(dialog);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error('Date select dialog did not appear within timeout');
    }
    
    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean { 
        return this._element.isConnected; 
    }

    /**
     * Get formatted date string for display
     * @param locale - Locale code for parsing
     * @returns Formatted date string
     */
    getFormattedDate(): string {
        const dateInfo = parseNaturalDate(this.fullLabel, this.text, (window as any).FGT_LOCALE);
        return formatDateForButton(dateInfo);
    }
}

export { OgtDateButton };

Logger.fgtlog('✅ OGT Date Button loaded');