// manipulator/task_element/go_to_chat_button.ts
import * as Logger from '@/core/logger';
import type { OgtTaskWrapper } from '@/manipulator/task_element/task_element';

Logger.fgtlog('💬 OGT Go To Chat Button loading...');

const findGoToChatButtonElement = function(object: OgtTaskWrapper): HTMLButtonElement | null {
    return object.element.querySelector('button[title]:not([aria-pressed],[data-tooltip-enabled])');
}

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
    _element: HTMLButtonElement;

    /**
     * Create a go to chat button wrapper
     * @param element - The button element
     */
    constructor(element: HTMLButtonElement) {
        if (!element) throw new Error('OgtGoToChatButton requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The wrapped button element
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

export { findGoToChatButtonElement, OgtGoToChatButton };

Logger.fgtlog('✅ OGT Go To Chat Button loaded');