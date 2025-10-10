// manipulator/task_element/touch_button.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('🗑️ OGT Touch Button loading...');

/**
 * Wrapper class for the button which confirms or cancels
 * to add new task. It is inside of OgtTaskElement.
 * Selector: div[data-is-touch-wrapper="true"]
 * Task is not present if OgtTaskElement.contains(this).
 * 
 * @class OgtTouchButton
 */
class OgtTouchButton {
    _element: HTMLDivElement;

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
