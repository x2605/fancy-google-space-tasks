// manipulator/task_element/assignee_input_wrapper/assignee_input.ts
import * as Logger from '@/core/logger';
import type { OgtAssigneeInputContainer } from '@/dom_bringer/task_element/assignee_input_container/assignee_input_container';

Logger.fgtlog('✏️ OGT Assignee Input loading...');

/**
 * Wrapper class for the assignee input element
 * 
 * @class OgtAssigneeInput
 */
class OgtAssigneeInput {
    _element: HTMLInputElement;

    /**
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = 'input[role="combobox"]';

    /**
     * Can be called directly from class
     * @returns - An HTML element which can be used in constructor
     */
    static findElementInObject(object: OgtAssigneeInputContainer): HTMLInputElement | null {
        return object.element.querySelector(this.selector);
    }

    /**
     * Create an object
     * @param element - The div element with background-image style
     */
    constructor(element: HTMLInputElement) {
        if (!element) {
            throw new Error('OgtAssigneeInput requires a valid DOM element');
        }
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped div element
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

export { OgtAssigneeInput };

Logger.fgtlog('✅ OGT Assignee Input loaded successfully');