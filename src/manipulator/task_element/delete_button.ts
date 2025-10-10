// manipulator/task_element/delete_button.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('🗑️ OGT Delete Button loading...');

/**
 * Wrapper class for the task delete button
 * This button opens the delete confirmation dialog
 * Selector: button[role="button"][aria-label*="Delete"]
 * 
 * @class OgtDeleteButton
 * @example
 * const deleteButton = taskElement.findDeleteButton();
 * if (deleteButton) {
 *   // Button exists, can be clicked to delete task
 * }
 */
class OgtDeleteButton {
    _element: Element;

    /**
     * Create a delete button wrapper
     * @param element - The delete button element
     */
    constructor(element: Element) {
        if (!element) throw new Error('OgtDeleteButton requires a valid DOM element');
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
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean { 
        return this._element.isConnected; 
    }
}

export { OgtDeleteButton };

Logger.fgtlog('✅ OGT Delete Button loaded');