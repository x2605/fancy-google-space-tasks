// manipulator/task_element/go_to_chat_button.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('💬 OGT Go To Chat Button loading...');

/**
 * Wrapper class for the "Go to chat" navigation button
 * This button opens the related chat conversation for the task
 * Selector: button[title]:not([aria-pressed],[data-tooltip-enabled])
 * 
 * @class OgtGoToChatButton
 * @example
 * const chatButton = taskElement.findGoToChatButton();
 * if (chatButton) {
 *   // Button exists, task has associated chat
 * }
 */
class OgtGoToChatButton {
    _element: Element;

    /**
     * Create a go to chat button wrapper
     * @param element - The button element
     */
    constructor(element: Element) {
        if (!element) throw new Error('OgtGoToChatButton requires a valid DOM element');
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

export { OgtGoToChatButton };

Logger.fgtlog('✅ OGT Go To Chat Button loaded');