// dom_bringer/task_element/touch_button.ts
import * as Logger from '@/core/logger';
import type { OgtTaskWrapper } from '@/dom_bringer/task_element/task_element';

Logger.fgtlog('🗑️ OGT Touch Button loading...');

/**
 * Wrapper class for the button which confirms or cancels
 * to add new task. It is inside of OgtTaskWrapper.
 * Task is not present if OgtTaskWrapper.contains(this).
 * 
 * @class OgtTouchButton
 */
class OgtTouchButton {
    _element: HTMLDivElement;

    /**
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = 'div[data-is-touch-wrapper="true"]';

    /**
     * Can be called directly from class
     * @returns - Node list of HTML elements which can be used in constructor
     */
    static findAllElementsInObject(object: OgtTaskWrapper): NodeListOf<HTMLDivElement> {
        return object.element.querySelectorAll(this.selector);
    }

    /**
     * Create a touch button wrapper
     * @param element - The touch button element
     */
    constructor(element: HTMLDivElement) {
        if (!element) throw new Error('OgtTouchButton requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The wrapper element
     */
    get element(): HTMLDivElement { 
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

export { OgtTouchButton };

Logger.fgtlog('✅ OGT Touch Button loaded');
