// manipulator/task_element/assignee_button/assignee_listbox.ts
import * as Logger from '@/core/logger';
import { OgtAssigneeItem } from './assignee_item';
import type { OgtAssigneeInputContainer } from '@/dom_bringer/task_element/assignee_input_container/assignee_input_container';

Logger.fgtlog('👥 OGT Assignee Listbox loading...');

/**
 * Wrapper class for the assignee selection dropdown listbox
 * This dropdown appears when clicking the assignee button
 * 
 * @class OgtAssigneeListbox
 * @example
 * const listbox = await assigneeButton.waitForAssigneeListbox();
 * const items = listbox.findAllAssigneeItems();
 */
class OgtAssigneeListbox {
    _element: HTMLElement;

    /**
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = 'ul[role="listbox"]';

    /**
     * Can be called directly from class
     * @returns - An HTML element which can be used in constructor
     */
    static findElementInObject(object: OgtAssigneeInputContainer): HTMLElement | null {
        return object.element.querySelector(this.selector);
    }

    /**
     * Create an assignee listbox wrapper
     * @param element - The listbox container element
     */
    constructor(element: HTMLElement) {
        if (!element) throw new Error('OgtAssigneeListbox requires a valid DOM element');
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped listbox element
     */
    get element(): HTMLElement { 
        return this._element; 
    }

    /**
     * Find all assignee items in the listbox
     * @returns Array of assignee item wrappers
     */
    findAllAssigneeItems(): OgtAssigneeItem[] {
        const items = OgtAssigneeItem.findAllElementsInObject(this);
        return Array.from(items).map(el => new OgtAssigneeItem(el));
    }

    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean { 
        return this._element.isConnected; 
    }
}

export { OgtAssigneeListbox };

Logger.fgtlog('✅ OGT Assignee Listbox loaded');