// dom_bringer/task_element/delete_button.ts
import * as Logger from '@/core/logger';
import type { OgtTaskWrapper } from '@/dom_bringer/task_element/task_element';

Logger.fgtlog('🗑️ OGT Delete Button loading...');

/**
 * Wrapper class for the task delete button
 * This button opens the delete confirmation dialog
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
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = 'button[data-tooltip-enabled]:not([aria-pressed],[title])';

    /**
     * Can be called directly from class
     * @returns - An HTML element which can be used in constructor
     */
    static findElementInObject(object: OgtTaskWrapper): HTMLButtonElement | null {
        return object.element.querySelector(this.selector);
    }

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