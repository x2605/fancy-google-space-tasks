// dom_bringer/task_element/assignee_input_wrapper/assignee_input_wrapper.ts
import * as Logger from '@/core/logger';
import { OgtAssigneeListbox } from './assignee_listbox';
import type { OgtTaskWrapper } from '@/dom_bringer/task_element/task_element';

Logger.fgtlog('👤 OGT Assignee Input Container loading...');

/**
 * Wrapper class for the assignee input container element
 * This is added by clicking on OgtAssigneeButton.element
 * 
 * @class OgtAssigneeButton
 */
class OgtAssigneeInputContainer {
    _element: HTMLDivElement;

    /**
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = 'div[data-enable-task-assignment]';

    /**
     * Can be called directly from class
     * @returns - An HTML element which can be used in constructor
     */
    static findElementInObject(object: OgtTaskWrapper): HTMLDivElement | null {
        return object.element.querySelector(this.selector);
    }

    /**
     * Create an object
     * @param element - The button element
     */
    constructor(element: HTMLDivElement) {
        if (!element) {
            throw new Error('OgtAssigneeInputWrapper requires a valid DOM element');
        }
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped button element
     */
    get element(): HTMLDivElement {
        return this._element;
    }

    /**
     * Wait for assignee listbox to appear after clicking button
     * @param timeout - Maximum wait time
     * @returns Promise resolving to OgtAssigneeListbox
     */
    async waitForAssigneeListbox(timeout: number = 3000): Promise<any> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const listbox = OgtAssigneeListbox.findElementInObject(this);
            if (listbox) {
                return new OgtAssigneeListbox(listbox);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error('Assignee listbox did not appear within timeout');
    }

    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean {
        return this._element.isConnected;
    }
}

export { OgtAssigneeInputContainer };

Logger.fgtlog('✅ OGT Assignee Input Container loaded successfully');