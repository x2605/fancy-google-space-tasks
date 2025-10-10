// manipulator/task_element/complete_checkbox.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('✅ OGT Complete Checkbox loading...');

/**
 * Wrapper class for the task completion checkbox button
 * This button toggles task completion status
 * Selector: button[role="button"][jsname][aria-pressed]
 * 
 * @class OgtCompleteCheckbox
 * @example
 * const checkbox = taskElement.findCompleteCheckbox();
 * if (checkbox) {
 *   console.log('Is completed:', checkbox.complete);
 * }
 */
class OgtCompleteCheckbox {
    _element: Element;

    /**
     * Create a complete checkbox wrapper
     * @param element - The checkbox button element
     */
    constructor(element: Element) {
        if (!element) throw new Error('OgtCompleteCheckbox requires a valid DOM element');
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
     * Check if the task is completed
     * @returns True if task is marked as complete
     */
    get complete(): boolean {
        return this._element.getAttribute('aria-pressed') === 'true';
    }
    
    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean { 
        return this._element.isConnected; 
    }
}

export { OgtCompleteCheckbox };

Logger.fgtlog('✅ OGT Complete Checkbox loaded');