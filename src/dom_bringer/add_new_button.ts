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
     * Can be called directly from class
     * @returns - Selector string
     */
    static getSelector(step: number) {
        if (step === 0) {
            return '[role="list"]';
        }
        else if (step === 1) {
            return 'button[data-idom-class]';
        }
        else {return '';}
    }

    /**
     * Can be called directly from class
     * @returns - An HTML element which can be used in constructor
     */
    static findElement(): HTMLButtonElement | null {
        try {
            const anchor = document.querySelector(this.getSelector(0));
            return anchor?.parentElement?.parentElement?.parentElement?.querySelector(this.getSelector(1)) as HTMLButtonElement;
        } catch(e) {
            return null;
        }
}
    
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
