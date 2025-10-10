// manipulator/add_new_button.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('🗑️ OGT AddNew Button loading...');

/**
 * 
 * @class OgtAddNewButton
 */
class OgtAddNewButton {
    _element: HTMLButtonElement;

    /**
     * Create an addnew button wrapper
     * @param element - The addnew button element
     */
    constructor(element: HTMLButtonElement) {
        if (!element) throw new Error('OgtAddNewButton requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The button element
     */
    get element(): HTMLButtonElement { 
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

export { OgtAddNewButton };

Logger.fgtlog('✅ OGT AddNew Button loaded');
