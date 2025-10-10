// manipulator/task_element/date_button.ts
import * as Logger from '@/core/logger';
import { OgtDateSelectDialog } from '../date_select_dialog';

Logger.fgtlog('📅 OGT Date Button loading...');

/**
 * Wrapper class for the date selection button
 * This button displays the task's due date and opens the date picker when clicked
 * Selector: button[role="button"][data-first-date-el][aria-label]
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
    _element: Element;

    /**
     * Create a date button wrapper
     * @param element - The date button element
     */
    constructor(element: Element) {
        if (!element) throw new Error('OgtDateButton requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The wrapped button element
     */
    get element(): Element { 
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
    async waitForDateSelectDialog(timeout: number = 3000): Promise<any> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const dialog = document.querySelector('div[aria-modal="true"][role="dialog"]') as HTMLDivElement;
            if (dialog && dialog.offsetParent !== null) {
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
}

export { OgtDateButton };

Logger.fgtlog('✅ OGT Date Button loaded');